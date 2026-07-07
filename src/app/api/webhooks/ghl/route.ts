import { NextRequest, NextResponse } from "next/server";
import { normalizeInboundPayload } from "@/lib/normalizeWebhook";
import { supabaseServer } from "@/lib/supabase";
import { notifyAllSubscribers } from "@/lib/push";

const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  email: "Courriel",
  call: "Appel",
  voicemail: "Message vocal",
};

export async function POST(req: NextRequest) {
  // Simple shared-secret check so random traffic can't post fake messages.
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (process.env.GHL_WEBHOOK_SECRET && secret !== process.env.GHL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeInboundPayload(raw);

  const supabase = supabaseServer();
  const { error } = await supabase.from("messages").insert({
    ghl_conversation_id: normalized.conversationId,
    ghl_contact_id: normalized.contactId,
    contact_name: normalized.contactName,
    contact_phone: normalized.contactPhone,
    contact_email: normalized.contactEmail,
    channel: normalized.channel,
    direction: "inbound",
    body: normalized.body,
    subject: normalized.subject,
    call_recording_url: normalized.callRecordingUrl,
    call_duration_seconds: normalized.callDurationSeconds,
    read: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort push notification; a failure here should not fail the webhook,
  // since GHL will consider a non-2xx response a delivery failure and retry.
  try {
    const label = CHANNEL_LABEL[normalized.channel] || "Message";
    await notifyAllSubscribers({
      title: `${label} de ${normalized.contactName || "un contact"}`,
      body: normalized.body || (normalized.channel === "voicemail" ? "Nouveau message vocal" : "Nouveau message"),
      url: `/?conversation=${normalized.conversationId}`,
      tag: normalized.conversationId,
    });
  } catch (err) {
    console.error("Push notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
