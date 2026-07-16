"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ConversationList } from "@/components/ConversationList";
import { ThreadView } from "@/components/ThreadView";
import type { ConversationMessage, ConversationSummary } from "@/lib/types";

const POLL_INTERVAL_MS = 20000;

function InboxApp() {
  const searchParams = useSearchParams();
  const [pendingTarget, setPendingTarget] = useState(searchParams.get("conversation"));

  const [filter, setFilter] = useState("all");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Deep-link from a push notification (?conversation=ID): once the list
  // has loaded, jump straight into that conversation instead of just
  // opening the app to whatever was last shown.
  useEffect(() => {
    if (!pendingTarget || conversations.length === 0) return;
    const match = conversations.find((c) => c.id === pendingTarget);
    if (match) {
      setSelected(match);
      loadMessages(match.id);
    }
    setPendingTarget(null);
  }, [pendingTarget, conversations, loadMessages]);

  function handleSelect(c: ConversationSummary) {
    setSelected(c);
    loadMessages(c.id);
  }

  const filtered =
    filter === "all"
      ? conversations
      : conversations.filter((c) => c.lastMessageType === filter);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="app-shell" data-mobile-view={selected ? "thread" : "list"}>
      <Sidebar active={filter} onChange={setFilter} unreadTotal={unreadTotal} />
      <ConversationList
        conversations={filtered}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        loading={loadingConversations}
      />
      <ThreadView
        conversation={selected}
        messages={messages}
        loading={loadingMessages}
        onMessageSent={() => selected && loadMessages(selected.id)}
        onBack={() => setSelected(null)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InboxApp />
    </Suspense>
  );
}
