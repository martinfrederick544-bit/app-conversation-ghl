import type { ConversationMessage, ConversationSummary, MessageChannel } from "./types";

const API_BASE = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const API_VERSION = process.env.GHL_API_VERSION || "2021-07-28";

function assertEnv() {
  if (!process.env.GHL_API_KEY) {
    throw new Error("GHL_API_KEY is not set. Add it in your environment variables.");
  }
  if (!process.env.GHL_LOCATION_ID) {
    throw new Error("GHL_LOCATION_ID is not set. Add it in your environment variables.");
  }
}

async function ghlFetch(path: string, init: RequestInit = {}) {
  assertEnv();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    // GHL data changes fast; never let Next cache these
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GHL API error ${res.status} on ${path}: ${text}`);
  }

  return res.json();
}

/** Normalizes GHL's lastMessageType strings into our simpler channel labels. */
function normalizeChannel(raw: string | undefined): MessageChannel {
  const v = (raw || "").toUpperCase();
  if (v.includes("EMAIL")) return "email";
  if (v.includes("VOICEMAIL")) return "voicemail";
  if (v.includes("CALL")) return "call";
  return "sms";
}

// GHL tags voicemails as a regular TYPE_CALL with meta.call.status === "voicemail"
// rather than a distinct message type, so the substring check above misses them.
function messageChannel(m: any): MessageChannel {
  if ((m.meta?.call?.status || "").toLowerCase() === "voicemail") return "voicemail";
  return normalizeChannel(m.messageType || m.type);
}

export async function searchConversations(params: {
  limit?: number;
  query?: string;
  status?: "read" | "unread" | "all";
} = {}): Promise<ConversationSummary[]> {
  const locationId = process.env.GHL_LOCATION_ID as string;
  const search = new URLSearchParams({
    locationId,
    limit: String(params.limit ?? 30),
  });
  if (params.query) search.set("query", params.query);
  if (params.status && params.status !== "all") search.set("status", params.status);

  const data = await ghlFetch(`/conversations/search?${search.toString()}`);
  const conversations = data.conversations || [];

  return conversations.map((c: any): ConversationSummary => ({
    id: c.id,
    contactId: c.contactId,
    contactName: c.contactName || c.fullName || "Contact sans nom",
    contactPhone: c.phone,
    contactEmail: c.email,
    lastMessageBody: c.lastMessageBody,
    lastMessageType: normalizeChannel(c.lastMessageType),
    lastMessageDate: c.lastMessageDate,
    unreadCount: c.unreadCount || 0,
  }));
}

// GHL's conversation timeline mixes real messages (SMS/Email/Call/...) with
// CRM activity log entries (opportunity/appointment/invoice/payment/contact
// changes). Those TYPE_ACTIVITY_* entries aren't messages anyone sent — they
// must never be rendered as chat bubbles.
function isActivityEntry(m: any): boolean {
  return String(m.messageType || "").toUpperCase().startsWith("TYPE_ACTIVITY");
}

export async function getMessages(conversationId: string): Promise<ConversationMessage[]> {
  const data = await ghlFetch(`/conversations/${conversationId}/messages?limit=100`);
  const messages = data.messages?.messages || data.messages || [];

  return messages
    .filter((m: any) => !isActivityEntry(m))
    .map((m: any): ConversationMessage => {
      const channel = messageChannel(m);
      const isCallLike = channel === "call" || channel === "voicemail";
      return {
        id: m.id,
        conversationId,
        channel,
        direction: (m.direction || "inbound").toLowerCase() === "outbound" ? "outbound" : "inbound",
        body: m.body || m.subject || "",
        subject: m.subject,
        dateAdded: m.dateAdded,
        status: m.status,
        callDurationSeconds: m.meta?.call?.duration ?? m.meta?.callDuration,
        // Proxied through our own API (see /api/messages/[id]/recording) since
        // playing it back requires our GHL API key — the browser can't attach
        // that header to a plain <audio src>. Not every call/voicemail entry
        // actually has a recording; the player hides itself on a 404.
        recordingUrl: isCallLike ? `/api/messages/${m.id}/recording` : undefined,
        // Images/voice memos sent as regular SMS/MMS or email attachments
        // (as opposed to a call recording) come through as plain URLs here.
        attachments: !isCallLike && Array.isArray(m.attachments) ? m.attachments : undefined,
      };
    })
    .sort((a: ConversationMessage, b: ConversationMessage) =>
      new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
    );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendMessage(input: {
  contactId: string;
  channel: "sms" | "email";
  body: string;
  subject?: string;
  cc?: string[];
  attachments?: string[];
}) {
  const type = input.channel === "email" ? "Email" : "SMS";
  return ghlFetch(`/conversations/messages`, {
    method: "POST",
    body: JSON.stringify({
      type,
      contactId: input.contactId,
      message: input.body,
      ...(input.attachments && input.attachments.length > 0
        ? { attachments: input.attachments }
        : {}),
      ...(input.channel === "email"
        ? {
            subject: input.subject || "",
            html: `<div style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
              input.body
            ).replace(/\n/g, "<br>")}</div>`,
            ...(input.cc && input.cc.length > 0 ? { emailCc: input.cc } : {}),
          }
        : {}),
    }),
  });
}

export async function sendVoiceMessage(input: { contactId: string; audioUrl: string }) {
  return ghlFetch(`/conversations/messages`, {
    method: "POST",
    body: JSON.stringify({
      type: "SMS",
      contactId: input.contactId,
      message: "",
      attachments: [input.audioUrl],
    }),
  });
}

export async function getContact(contactId: string) {
  const data = await ghlFetch(`/contacts/${contactId}`);
  return data.contact;
}
