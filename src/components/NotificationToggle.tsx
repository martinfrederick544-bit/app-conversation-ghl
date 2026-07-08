"use client";

import { useEffect, useState } from "react";
import { enablePushNotifications, getPushSubscriptionState } from "@/lib/pushClient";

function isIosNotInstalled() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  return isIos && !isStandalone;
}

export function NotificationToggle() {
  const [state, setState] = useState<"unsupported" | "granted" | "denied" | "default" | "loading">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  useEffect(() => {
    setNeedsIosInstall(isIosNotInstalled());
    getPushSubscriptionState().then(setState);
  }, []);

  async function handleClick() {
    if (state === "granted") return;
    setError(null);
    const res = await enablePushNotifications();
    setState(res.ok ? "granted" : "denied");
    if (!res.ok) setError(res.error || "Échec de l'activation des notifications.");
  }

  if (needsIosInstall) {
    return (
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-dim)",
          lineHeight: 1.5,
          padding: "10px 12px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        Sur iPhone, les notifications ne marchent que si l'app est ajoutée à
        l'écran d'accueil : appuie sur <strong>Partager</strong> puis{" "}
        <strong>Sur l'écran d'accueil</strong>, puis rouvre l'app depuis cette
        icône.
      </div>
    );
  }

  if (state === "unsupported") return null;

  return (
    <div style={{ width: "100%" }}>
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
      {error && (
        <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
