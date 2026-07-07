"use client";

import { useEffect, useState } from "react";
import { enablePushNotifications, getPushSubscriptionState } from "@/lib/pushClient";

export function NotificationToggle() {
  const [state, setState] = useState<"unsupported" | "granted" | "denied" | "default" | "loading">(
    "loading"
  );

  useEffect(() => {
    getPushSubscriptionState().then(setState);
  }, []);

  async function handleClick() {
    if (state !== "granted") {
      const res = await enablePushNotifications();
      setState(res.ok ? "granted" : "denied");
    }
  }

  if (state === "unsupported") return null;

  return (
    <button
      onClick={handleClick}
      disabled={state === "granted"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: state === "granted" ? "var(--panel-raised)" : "var(--accent)",
        color: state === "granted" ? "var(--text-dim)" : "#0b0d12",
        fontSize: 13,
        fontWeight: 600,
        cursor: state === "granted" ? "default" : "pointer",
      }}
    >
      <span>{state === "granted" ? "Notifications activées" : "Activer les notifications"}</span>
    </button>
  );
}
