"use client";

import type { ConversationSummary } from "@/lib/types";
import { ChannelBadge } from "./ChannelBadge";

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (c: ConversationSummary) => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
      }}
    >
      {loading && (
        <div style={{ padding: 20, color: "var(--text-faint)", fontSize: 13 }}>Chargement…</div>
      )}

      {!loading && conversations.length === 0 && (
        <div style={{ padding: 20, color: "var(--text-faint)", fontSize: 13 }}>
          Rien à afficher ici pour l'instant.
        </div>
      )}

      {conversations.map((c) => {
        const isSelected = c.id === selectedId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              border: "none",
              borderBottom: "1px solid var(--border)",
              background: isSelected ? "var(--panel-raised)" : "transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  fontWeight: c.unreadCount > 0 ? 700 : 500,
                  fontSize: 13.5,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.contactName}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>
                {timeAgo(c.lastMessageDate)}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              {c.lastMessageType && <ChannelBadge channel={c.lastMessageType as any} />}
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--text-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.lastMessageBody || "—"}
              </span>
              {c.unreadCount > 0 && (
                <span
                  className="mono"
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    background: "var(--accent)",
                    color: "#0b0d12",
                    borderRadius: 8,
                    padding: "1px 6px",
                    flexShrink: 0,
                  }}
                >
                  {c.unreadCount}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
