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

export async function getMessages(conversationId: string): Promise<ConversationMessage[]> {
  const data = await ghlFetch(`/conversations/${conversationId}/messages?limit=100`);
  const messages = data.messages?.messages || data.messages || [];

  return messages.map((m: any): ConversationMessage => ({
    id: m.id,
    conversationId,
    channel: normalizeChannel(m.messageType || m.type),
    direction: (m.direction || "inbound").toLowerCase() === "outbound" ? "outbound" : "inbound",
    body: m.body || m.subject || "",
    subject: m.subject,
    dateAdded: m.dateAdded,
    status: m.status,
    callDurationSeconds: m.meta?.callDuration,
    recordingUrl: m.attachments?.[0] || m.meta?.recordingUrl,
  }));
}

export async function sendMessage(input: {
  contactId: string;
  channel: "sms" | "email";
  body: string;
  subject?: string;
}) {
  const type = input.channel === "email" ? "Email" : "SMS";
  return ghlFetch(`/conversations/messages`, {
    method: "POST",
    body: JSON.stringify({
      type,
      contactId: input.contactId,
      message: input.body,
      ...(input.channel === "email" ? { subject: input.subject || "" } : {}),
    }),
  });
}

export async function getContact(contactId: string) {
  const data = await ghlFetch(`/contacts/${contactId}`);
  return data.contact;
}
