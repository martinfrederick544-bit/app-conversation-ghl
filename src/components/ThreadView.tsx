"use client";

import { useState } from "react";
import type { ConversationMessage, ConversationSummary } from "@/lib/types";
import { ChannelBadge } from "./ChannelBadge";
import { ComposeBar } from "./ComposeBar";
import { Avatar } from "./Avatar";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CallOrVoicemailBubble({ msg }: { msg: ConversationMessage }) {
  const [recordingAvailable, setRecordingAvailable] = useState(true);

  return (
    <div className="call-bubble">
      <ChannelBadge channel={msg.channel} />
      <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
        {msg.callDurationSeconds
          ? `Durée : ${Math.floor(msg.callDurationSeconds / 60)} min ${msg.callDurationSeconds % 60}s`
          : msg.channel === "voicemail"
          ? "Message vocal reçu"
          : "Appel"}
      </div>
      {msg.recordingUrl && recordingAvailable && (
        <audio
          controls
          preload="none"
          onError={() => setRecordingAvailable(false)}
          style={{ marginTop: 8, width: "100%" }}
        >
          <source src={msg.recordingUrl} />
        </audio>
      )}
      {msg.recordingUrl && !recordingAvailable && (
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 8 }}>
          Aucun enregistrement disponible
        </div>
      )}
    </div>
  );
}

export function ThreadView({
  conversation,
  messages,
  loading,
  onMessageSent,
  onBack,
}: {
  conversation: ConversationSummary | null;
  messages: ConversationMessage[];
  loading: boolean;
  onMessageSent: () => void;
  onBack: () => void;
}) {
  if (!conversation) {
    return (
      <div
        className="app-thread"
        style={{
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
    <div className="app-thread">
      <div className="thread-header">
        <button onClick={onBack} className="back-btn" aria-label="Retour à la liste">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <Avatar name={conversation.contactName} size={38} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {conversation.contactName}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
            {conversation.contactPhone || conversation.contactEmail || ""}
          </div>
        </div>
      </div>

      <div className="thread-scroll">
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
                  maxWidth: "76%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div className={`msg-bubble${msg.direction === "outbound" ? " msg-bubble-out" : ""}`}>
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
        hasPhone={Boolean(conversation.contactPhone)}
        onSent={onMessageSent}
      />
    </div>
  );
}
