"use client";

import { useEffect, useRef, useCallback } from "react";
import MessageItem from "./message-item";
import ChatInput from "./chat-input";
import { Loader2, ArrowUp } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";

interface ChatContainerProps {
  user: { _id: string; username: string; isAdmin: boolean };
  roomId: string;
  readOnly?: boolean;
}

export default function ChatContainer({ user, roomId, readOnly = false }: ChatContainerProps) {
  const { messages, loading, loadingMore, hasMore, loadMoreOlder, setMessages } = useChat(user, roomId);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const seenCalledForRoomRef = useRef<string | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollViewportRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollViewportRef.current) return;
    scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
  }, []);

  // ✅ Sửa: dependencies chính xác - dùng [user, roomId, readOnly]
  const callSeenApi = useCallback(() => {
    if (readOnly) return;
    if (!user?._id || !roomId) return;
    const ids = roomId.split("-");
    if (!ids.includes(user._id)) return;

    fetch("/api/messages/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
      credentials: "include",
    }).catch(console.error);
  }, [user, roomId, readOnly]); // ✅ user thay vì user?._id

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const handleScroll = () => {
      isUserAtBottomRef.current = checkIfAtBottom();
    };
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (loading) return;
    if (prevMessagesLengthRef.current === 0 && messages.length > 0) {
      scrollToBottom();
    } else if (messages.length > prevMessagesLengthRef.current && isUserAtBottomRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (readOnly) return;
    if (!roomId || !user?._id) return;
    if (seenCalledForRoomRef.current === roomId) return;
    seenCalledForRoomRef.current = roomId;
    callSeenApi();
  }, [roomId, user, readOnly, callSeenApi]); // ✅ thêm user vào dep

  useEffect(() => {
    if (readOnly) return;
    if (!roomId || !user?._id) return;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    if (String(lastMsg.userId) !== String(user._id)) {
      if (lastSeenMessageIdRef.current !== lastMsg._id) {
        lastSeenMessageIdRef.current = lastMsg._id;
        callSeenApi();
      }
    }
  }, [messages, roomId, user, readOnly, callSeenApi]); // ✅ thêm user

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadMoreOlder();
  };

  if (!user || !user._id) {
    return <div className="flex-1 bg-white" />;
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div ref={scrollViewportRef} className="flex-1 overflow-auto w-full">
        <div className="p-4 flex flex-col gap-y-4">
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-1 text-xs">
                {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                {loadingMore ? "Đang tải..." : "Xem tin nhắn cũ"}
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            messages.map((msg) => (
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
      {!readOnly && (
        <div className="shrink-0 border-t bg-white">
          <ChatInput roomId={roomId} />
        </div>
      )}
    </div>
  );
}
