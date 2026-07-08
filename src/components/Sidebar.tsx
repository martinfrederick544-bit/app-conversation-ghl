"use client";

import { NotificationToggle } from "./NotificationToggle";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toutes les conversations" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Courriels" },
  { key: "call", label: "Appels" },
  { key: "voicemail", label: "Messages vocaux" },
];

export function Sidebar({
  active,
  onChange,
  unreadTotal,
}: {
  active: string;
  onChange: (key: string) => void;
  unreadTotal: number;
}) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: unreadTotal > 0 ? "var(--accent)" : "var(--text-faint)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Inbox</span>
        {unreadTotal > 0 && (
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}
          >
            {unreadTotal}
          </span>
        )}
      </div>

      <nav className="sidebar-nav">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className="sidebar-filter"
            style={{
              background: active === f.key ? "var(--panel-raised)" : "transparent",
              color: active === f.key ? "var(--text)" : "var(--text-dim)",
              fontWeight: active === f.key ? 600 : 500,
            }}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="notif-wrap">
        <NotificationToggle />
      </div>
    </aside>
  );
}
