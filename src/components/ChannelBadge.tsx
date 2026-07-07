import type { MessageChannel } from "@/lib/types";

const LABEL: Record<MessageChannel, string> = {
  sms: "SMS",
  email: "Courriel",
  call: "Appel",
  voicemail: "Vocal",
};

const COLOR_VAR: Record<MessageChannel, string> = {
  sms: "--sms",
  email: "--email",
  call: "--call",
  voicemail: "--voicemail",
};

export function ChannelBadge({ channel }: { channel: MessageChannel }) {
  const colorVar = COLOR_VAR[channel] || "--sms";
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: `var(${colorVar})`,
        border: `1px solid var(${colorVar})`,
        borderRadius: 5,
        padding: "2px 6px",
        opacity: 0.9,
        whiteSpace: "nowrap",
      }}
    >
      {LABEL[channel] || channel}
    </span>
  );
}
