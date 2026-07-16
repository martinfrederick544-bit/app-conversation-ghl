"use client";

import { useRef, useState } from "react";
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
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      let attachmentUrl: string | undefined;
      if (attachment) {
        const uploadForm = new FormData();
        uploadForm.append("file", attachment);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Échec du téléversement");
        attachmentUrl = uploadData.url;
      }

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          channel,
          message,
          subject: subject || undefined,
          cc: cc || undefined,
          attachments: attachmentUrl ? [attachmentUrl] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi");
      setMessage("");
      setSubject("");
      setCc("");
      setShowCc(false);
      setAttachment(null);
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
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet"
              className="compose-input compose-subject"
              style={{ marginBottom: 0, flex: 1 }}
            />
            {!showCc && (
              <button className="voice-pill-btn" onClick={() => setShowCc(true)} type="button">
                Cc
              </button>
            )}
          </div>
          {showCc && (
            <input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc (courriels séparés par des virgules)"
              className="compose-input compose-subject"
              style={{ marginTop: 8 }}
            />
          )}
          {attachment && (
            <div className="attachment-chip">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📎 {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                aria-label="Retirer la pièce jointe"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {channel === "voice" ? (
        <VoiceRecorder contactId={contactId} onSent={onSent} />
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {channel === "email" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Ajouter une pièce jointe"
                title="Ajouter une pièce jointe"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 11.5l-8.5 8.5a4 4 0 01-5.66-5.66l9-9a2.5 2.5 0 013.54 3.54l-8.5 8.5a1 1 0 01-1.42-1.42l7.5-7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
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
              <path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
      {error && <div className="compose-error">{error}</div>}
    </div>
  );
}
