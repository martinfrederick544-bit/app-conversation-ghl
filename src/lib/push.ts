import webpush from "web-push";
import { supabaseServer } from "./supabase";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing. Generate with `npx web-push generate-vapid-keys` and set them in your env vars."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function notifyAllSubscribers(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  ensureConfigured();
  const supabase = supabaseServer();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");

  if (error) throw error;
  if (!subs || subs.length === 0) return { sent: 0 };

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  // Clean up subscriptions that are no longer valid (expired/unsubscribed).
  const toRemove = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410)
    .map(({ sub }) => sub.endpoint);

  if (toRemove.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", toRemove);
  }

  return { sent: results.filter((r) => r.status === "fulfilled").length };
}
