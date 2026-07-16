"use client";

import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";

type Channel = "sms" | "email" | "voice";

export function ComposeBar({
  contactId,
  defaultChannel,
  hasPhone,
  onSent,
}: {
  contactId: string;
  defaultChannel: "sms" | "email";
  hasPhone: boolean;
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, channel, message, subject: subject || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi");
      setMessage("");
      setSubject("");
      onSent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const tabs: { key: Channel; label: string }[] = [
    { key: "sms", label: "SMS" },
    { key: "email", label: "Courriel" },
    ...(hasPhone ? [{ key: "voice" as Channel, label: "Vocal" }] : []),
  ];

  return (
    <div className="compose-bar">
      <div className="channel-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setChannel(t.key)}
            className={`channel-tab${channel === t.key ? " channel-tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {channel === "email" && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Sujet"
          className="compose-input compose-subject"
        />
      )}

      {channel === "voice" ? (
        <VoiceRecorder contactId={contactId} onSent={onSent} />
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={channel === "sms" ? "Écrire un SMS…" : "Écrire un courriel…"}
            rows={2}
            onKeyDown={(e) => {
              const isTouchDevice =
                typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
              if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="compose-input compose-textarea"
          />
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="compose-send-btn"
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12l16-8-6 8 6 8-16-8z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      )}
      {error && <div className="compose-error">{error}</div>}
    </div>
  );
}
