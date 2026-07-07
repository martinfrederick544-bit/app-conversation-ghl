"use client";

import type { ConversationMessage, ConversationSummary } from "@/lib/types";
import { ChannelBadge } from "./ChannelBadge";
import { ComposeBar } from "./ComposeBar";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CallOrVoicemailBubble({ msg }: { msg: ConversationMessage }) {
  return (
    <div
      style={{
        alignSelf: "center",
        background: "var(--panel-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        maxWidth: 420,
        textAlign: "center",
      }}
    >
      <ChannelBadge channel={msg.channel} />
      <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
        {msg.callDurationSeconds
          ? `Durée : ${Math.floor(msg.callDurationSeconds / 60)} min ${msg.callDurationSeconds % 60}s`
          : msg.channel === "voicemail"
          ? "Message vocal reçu"
          : "Appel"}
      </div>
      {msg.recordingUrl && (
        <audio controls style={{ marginTop: 8, width: "100%" }}>
          <source src={msg.recordingUrl} />
        </audio>
      )}
    </div>
  );
}

export function ThreadView({
  conversation,
  messages,
  loading,
  onMessageSent,
}: {
  conversation: ConversationSummary | null;
  messages: ConversationMessage[];
  loading: boolean;
  onMessageSent: () => void;
}) {
  if (!conversation) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-faint)",
          fontSize: 13,
        }}
      >
        Choisis une conversation à gauche.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{conversation.contactName}</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
          {conversation.contactPhone || conversation.contactEmail || ""}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {loading && <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Chargement…</div>}

        {!loading &&
          messages.map((msg) =>
            msg.channel === "call" || msg.channel === "voicemail" ? (
              <CallOrVoicemailBubble key={msg.id} msg={msg} />
            ) : (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.direction === "outbound" ? "flex-end" : "flex-start",
                  maxWidth: "70%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    background: msg.direction === "outbound" ? "var(--accent-dim)" : "var(--panel-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "10px 14px",
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.subject && (
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{msg.subject}</div>
                  )}
                  {msg.body}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start",
                  }}
                >
                  <ChannelBadge channel={msg.channel} />
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                    {formatTime(msg.dateAdded)}
                  </span>
                </div>
              </div>
            )
          )}
      </div>

      <ComposeBar
        contactId={conversation.contactId}
        defaultChannel={conversation.contactPhone ? "sms" : "email"}
        onSent={onMessageSent}
      />
    </div>
  );
}
