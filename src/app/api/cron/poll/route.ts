import { NextRequest, NextResponse } from "next/server";
import { searchConversations } from "@/lib/ghl";
import { notifyAllSubscribers } from "@/lib/push";
import { supabaseServer } from "@/lib/supabase";

const STATE_BUCKET = "app-state";
const STATE_FILE = "watermarks.json";

const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  email: "Courriel",
  call: "Appel",
  voicemail: "Message vocal",
};

type Watermark = { lastMessageDate?: string; unreadCount: number };
type WatermarkMap = Record<string, Watermark>;

async function loadState(): Promise<WatermarkMap> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.storage.from(STATE_BUCKET).download(STATE_FILE);
  if (error || !data) return {};
  try {
    return JSON.parse(await data.text());
  } catch {
    return {};
  }
}

async function saveState(state: WatermarkMap) {
  const supabase = supabaseServer();
  await supabase.storage.from(STATE_BUCKET).upload(STATE_FILE, JSON.stringify(state), {
    contentType: "application/json",
    upsert: true,
  });
}

// This app polls GHL itself and decides when to notify — no GHL-side
// webhook/workflow required. It's driven by an external scheduler (e.g. a
// Supabase pg_cron job) hitting this route roughly once a minute.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (!process.env.CRON_SECRET || searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const conversations = await searchConversations({ limit: 100 });
  const state = await loadState();
  let notified = 0;

  // On the very first run ever (empty watermark store) we only seed a
  // baseline — otherwise deploying this feature would immediately fire a
  // notification for every conversation that already had unread messages.
  const isFirstRunEver = Object.keys(state).length === 0;

  for (const convo of conversations) {
    const prev = state[convo.id];
    const shouldNotify = isFirstRunEver
      ? false
      : prev
      ? convo.unreadCount > prev.unreadCount
      : convo.unreadCount > 0;

    if (shouldNotify) {
      const label = CHANNEL_LABEL[convo.lastMessageType || "sms"] || "Message";
      try {
        await notifyAllSubscribers({
          title: `${label} de ${convo.contactName}`,
          body: convo.lastMessageBody || "Nouveau message",
          url: `/?conversation=${convo.id}`,
          tag: convo.id,
        });
        notified++;
      } catch (err) {
        console.error("Push notification failed:", err);
      }
    }

    state[convo.id] = {
      lastMessageDate: convo.lastMessageDate,
      unreadCount: convo.unreadCount,
    };
  }

  await saveState(state);

  return NextResponse.json({ ok: true, checked: conversations.length, notified });
}
