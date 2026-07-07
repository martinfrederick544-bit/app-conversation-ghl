"use client";

import { useState } from "react";

export function ComposeBar({
  contactId,
  defaultChannel,
  onSent,
}: {
  contactId: string;
  defaultChannel: "sms" | "email";
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<"sms" | "email">(defaultChannel);
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

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {(["sms", "email"] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${channel === ch ? "var(--accent)" : "var(--border)"}`,
              background: channel === ch ? "var(--accent-dim)" : "transparent",
              color: channel === ch ? "var(--text)" : "var(--text-dim)",
              cursor: "pointer",
            }}
          >
            {ch === "sms" ? "SMS" : "Courriel"}
          </button>
        ))}
      </div>

      {channel === "email" && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Sujet"
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13,
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={channel === "sms" ? "Écrire un SMS…" : "Écrire un courriel…"}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          style={{
            flex: 1,
            resize: "none",
            padding: "10px 12px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 13.5,
            lineHeight: 1.4,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius)",
            border: "none",
            background: sending || !message.trim() ? "var(--panel-raised)" : "var(--accent)",
            color: sending || !message.trim() ? "var(--text-faint)" : "#0b0d12",
            fontWeight: 600,
            fontSize: 13,
            cursor: sending || !message.trim() ? "default" : "pointer",
          }}
        >
          {sending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
