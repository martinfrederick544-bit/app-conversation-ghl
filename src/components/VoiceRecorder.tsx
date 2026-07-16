"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 120;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorder({ contactId, onSent }: { contactId: string; onSent: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "preview" | "sending">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setState("preview");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Accès au micro refusé — autorise le micro dans les réglages du navigateur.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setError(null);
    setState("idle");
  }

  async function send() {
    if (!blobRef.current) return;
    setState("sending");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("contactId", contactId);
      const ext = blobRef.current.type.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", blobRef.current, `voice.${ext}`);
      const res = await fetch("/api/messages/voice", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi");
      cancelPreview();
      onSent();
    } catch (err: any) {
      setError(err.message);
      setState("preview");
    }
  }

  if (state === "idle") {
    return (
      <div>
        <button
          onClick={startRecording}
          className="voice-record-btn"
          aria-label="Enregistrer un message vocal"
          title="Enregistrer un message vocal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19 11a7 7 0 01-14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {error && <div className="compose-error">{error}</div>}
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="voice-recorder-bar">
        <span className="voice-rec-dot" />
        <span className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
          {formatDuration(seconds)}
        </span>
        <span style={{ flex: 1 }} />
        <button className="voice-pill-btn voice-pill-accent" onClick={stopRecording}>
          Arrêter
        </button>
      </div>
    );
  }

  return (
    <div className="voice-recorder-bar">
      <audio controls src={previewUrl ?? undefined} style={{ flex: 1, height: 36, minWidth: 0 }} />
      <button className="voice-pill-btn" onClick={cancelPreview} disabled={state === "sending"}>
        Annuler
      </button>
      <button className="voice-pill-btn voice-pill-accent" onClick={send} disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Envoyer"}
      </button>
      {error && <div className="compose-error">{error}</div>}
    </div>
  );
}
