export type MessageChannel = "sms" | "email" | "call" | "voicemail";
export type MessageDirection = "inbound" | "outbound";

export interface ConversationSummary {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  lastMessageBody?: string;
  lastMessageType?: string;
  lastMessageDate?: string;
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  subject?: string;
  dateAdded: string;
  status?: string;
  callDurationSeconds?: number;
  recordingUrl?: string;
}

export interface LoggedMessage {
  id: string;
  ghl_conversation_id: string;
  ghl_contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string | null;
  subject: string | null;
  call_recording_url: string | null;
  call_duration_seconds: number | null;
  read: boolean;
  created_at: string;
}
