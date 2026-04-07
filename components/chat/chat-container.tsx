"use client";

import { useEffect, useRef, useCallback } from "react";
import MessageItem from "./message-item";
import ChatInput from "./chat-input";
import { Loader2, ArrowUp } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  user: { _id: string; username: string; isAdmin: boolean };
  roomId: string;
  readOnly?: boolean;
}

const MAX_MESSAGE_LENGTH = 160;

export default function ChatContainer({ user, roomId, readOnly = false }: ChatContainerProps) {
  const { messages, loading, loadingMore, hasMore, loadMoreOlder, setMessages } = useChat(user, roomId);

  // ✅ chặn message quá dài ngay tại container
  const safeMessages = messages.filter((m) => !m.content || m.content.length <= MAX_MESSAGE_LENGTH);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const seenCalledForRoomRef = useRef<string | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollViewportRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollViewportRef.current) return;
    scrollViewportRef.current.scrollTo({
      top: scrollViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const callSeenApi = useCallback(() => {
    if (readOnly || !user?._id || !roomId) return;

    const ids = roomId.split("-");
    if (!ids.includes(user._id)) return;

    fetch("/api/messages/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
      credentials: "include",
    }).catch();
  }, [user, roomId, readOnly]);

  // track scroll position
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      isUserAtBottomRef.current = checkIfAtBottom();
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  // ✅ auto scroll dùng safeMessages
  useEffect(() => {
    if (loading) return;

    if (prevMessagesLengthRef.current === 0 && safeMessages.length > 0) {
      scrollToBottom();
    } else if (safeMessages.length > prevMessagesLengthRef.current && isUserAtBottomRef.current) {
      scrollToBottom();
    }

    prevMessagesLengthRef.current = safeMessages.length;
  }, [safeMessages, loading, scrollToBottom]);

  // seen lần đầu vào room
  useEffect(() => {
    if (readOnly || !roomId || !user?._id) return;
    if (seenCalledForRoomRef.current === roomId) return;

    seenCalledForRoomRef.current = roomId;
    callSeenApi();
  }, [roomId, user, readOnly, callSeenApi]);

  // ✅ seen theo message hợp lệ
  useEffect(() => {
    if (readOnly || !roomId || !user?._id || safeMessages.length === 0) return;

    const lastMsg = safeMessages[safeMessages.length - 1];
    if (!lastMsg) return;

    if (String(lastMsg.userId) !== String(user._id)) {
      if (lastSeenMessageIdRef.current !== lastMsg._id) {
        lastSeenMessageIdRef.current = lastMsg._id;
        callSeenApi();
      }
    }
  }, [safeMessages, roomId, user, readOnly, callSeenApi]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadMoreOlder();
  };

  if (!user || !user._id) {
    return <div className="flex-1 bg-background" />;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--primary),transparent_15%)] opacity-[0.03] pointer-events-none" />

      {/* Message viewport */}
      <div ref={scrollViewportRef} className={cn("flex-1 overflow-auto w-full pt-4", "custom-scrollbar")}>
        <div className="w-full flex flex-col min-h-full">
          {hasMore && (
            <div className="flex justify-center py-4 animate-in fade-in slide-in-from-top-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2 text-[11px] font-semibold h-8 rounded-full shadow-sm border border-border/50">
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
                {loadingMore ? "Đang tải dữ liệu..." : "Tải tin nhắn cũ hơn"}
              </Button>
            </div>
          )}

          <div className="flex-1 px-4 pb-6 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
              </div>
            ) : (
              safeMessages.map((msg) => (
                <MessageItem
                  key={msg._id}
                  message={msg}
                  isMe={msg.userId === user._id}
                  currentUser={user}
                  setMessages={setMessages}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="shrink-0 animate-in slide-in-from-bottom-4 duration-300">
          <ChatInput roomId={roomId} />
        </div>
      )}
    </div>
  );
}
