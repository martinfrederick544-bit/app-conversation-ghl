import { NextRequest, NextResponse } from "next/server";
import { getMessages, searchConversations } from "@/lib/ghl";
import { notifyAllSubscribers } from "@/lib/push";
import { supabaseServer } from "@/lib/supabase";

const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  email: "Courriel",
  call: "Appel",
  voicemail: "Message vocal",
};

// This app polls GHL itself and decides when to notify — no GHL-side
// webhook/workflow required. It's driven by an external scheduler (e.g. a
// Supabase pg_cron job) hitting this route every few seconds.
//
// State lives in a real `poll_state` table, claimed one row at a time via
// the `claim_notification` Postgres function (see supabase/schema.sql).
// That function does an atomic "insert, or update only if the message
// changed" — Postgres's row lock means that even if two invocations run
// at the same moment for the same conversation, only one of them can ever
// get `true` back. A plain JSON blob in Storage doesn't have that
// guarantee (Storage reads can lag behind a very recent write), which is
// what caused a burst of duplicate notifications for the same message.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (!process.env.CRON_SECRET || searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const conversations = await searchConversations({ limit: 100 });

  const { count, error: countError } = await supabase
    .from("poll_state")
    .select("*", { count: "exact", head: true });
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  // On the very first run ever (empty table) we only seed a baseline —
  // otherwise activating this feature would immediately fire a
  // notification for every conversation that already had unread messages.
  if ((count ?? 0) === 0) {
    const rows = conversations
      .filter((c) => c.lastMessageDate != null)
      .map((c) => ({
        conversation_id: c.id,
        notified_message_date: String(c.lastMessageDate),
      }));
    if (rows.length > 0) {
      const { error } = await supabase
        .from("poll_state")
        .upsert(rows, { onConflict: "conversation_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, checked: conversations.length, notified: 0, seeded: true });
  }

  let notified = 0;

  for (const convo of conversations) {
    if (convo.unreadCount <= 0 || convo.lastMessageDate == null) continue;

    const { data: claimed, error } = await supabase.rpc("claim_notification", {
      p_conversation_id: convo.id,
      p_message_date: String(convo.lastMessageDate),
    });
    if (error) {
      console.error("claim_notification failed:", error);
      continue;
    }
    if (!claimed) continue;

    // The conversation summary only knows "call" vs "sms" vs "email" — GHL
    // buries the voicemail-vs-answered-call distinction in the individual
    // message's meta, so fetch the real latest message to know for sure.
    let channel = convo.lastMessageType || "sms";
    try {
      const msgs = await getMessages(convo.id);
      const latest = msgs[msgs.length - 1];
      if (latest) channel = latest.channel;
    } catch (err) {
      console.error("Failed to fetch latest message for notification:", err);
    }

    // Only voicemails push a notification — other channels are still
    // "claimed" above so we don't keep re-checking the same message, we
    // just stay quiet about them.
    if (channel !== "voicemail") continue;

    const label = CHANNEL_LABEL[channel] || "Message";
    try {
      await notifyAllSubscribers({
        title: `${label} de ${convo.contactName}`,
        body: "Nouveau message vocal",
        url: `/?conversation=${convo.id}`,
        tag: convo.id,
      });
      notified++;
    } catch (err) {
      console.error("Push notification failed:", err);
    }
  }

  return NextResponse.json({ ok: true, checked: conversations.length, notified });
}
