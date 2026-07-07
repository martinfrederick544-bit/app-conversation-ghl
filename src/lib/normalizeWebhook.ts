import type { MessageChannel } from "./types";

export interface NormalizedInbound {
  conversationId: string;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  channel: MessageChannel;
  body: string | null;
  subject: string | null;
  callRecordingUrl: string | null;
  callDurationSeconds: number | null;
}

function guessChannel(raw: any): MessageChannel {
  const candidates = [raw.messageType, raw.type, raw.messageChannel]
    .filter(Boolean)
    .map((v: string) => v.toUpperCase());
  const joined = candidates.join(" ");
  if (joined.includes("EMAIL")) return "email";
  if (joined.includes("VOICEMAIL")) return "voicemail";
  if (joined.includes("CALL")) return "call";
  return "sms";
}

/**
 * GHL workflows let you build a completely custom JSON body for the
 * "Webhook" action, and different trigger types (Customer Replied,
 * Call Status, native marketplace webhooks) don't share one exact shape.
 * This function accepts the common field names people end up using and
 * fills in whatever it can find, so the workflow setup doesn't need to be
 * pixel-perfect. See README.md for the recommended workflow field mapping.
 */
export function normalizeInboundPayload(raw: any): NormalizedInbound {
  const contact = raw.contact || {};

  return {
    conversationId:
      raw.conversationId || raw.conversation_id || raw.conversationID || "unknown",
    contactId: raw.contactId || raw.contact_id || contact.id || null,
    contactName:
      raw.contactName ||
      raw.full_name ||
      contact.name ||
      [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
      null,
    contactPhone: raw.phone || contact.phone || null,
    contactEmail: raw.email || contact.email || null,
    channel: guessChannel(raw),
    body: raw.body || raw.message || raw.text || null,
    subject: raw.subject || null,
    callRecordingUrl: raw.recordingUrl || raw.callRecordingUrl || null,
    callDurationSeconds: raw.callDuration ? Number(raw.callDuration) : null,
  };
}
