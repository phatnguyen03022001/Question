import { useState, useEffect, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/client";

export function useChat(currentUser: any, roomId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const messagesRef = useRef(messages); // để dùng trong event handlers mà không cần dependency

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loadMessages = useCallback(
    async (cursor?: string | null, isLoadMore = false) => {
      if (!currentUser?._id || !roomId) return;
      if (isLoadMore && (loadingMoreRef.current || !hasMore)) return;

      const setter = isLoadMore ? setLoadingMore : setLoading;
      if (isLoadMore) loadingMoreRef.current = true;
      setter(true);

      try {
        const url = `/api/messages?roomId=${roomId}&isAdmin=${currentUser.isAdmin}&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (isLoadMore) {
          // Lọc trùng lặp dựa trên _id
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newMessages = data.messages.filter((m: any) => !existingIds.has(m._id));
            return [...newMessages, ...prev];
          });
        } else {
          setMessages(data.messages || []);
        }
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch (error) {
        console.error("Load messages error:", error);
        if (!isLoadMore) setMessages([]);
      } finally {
        setter(false);
        if (isLoadMore) loadingMoreRef.current = false;
      }
    },
    [currentUser?._id, currentUser?.isAdmin, roomId, hasMore],
  );

  // Load lần đầu
  useEffect(() => {
    loadMessages();
  }, [roomId]); // chỉ load lại khi roomId thay đổi

  // Pusher events
  useEffect(() => {
    if (!roomId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`chat-${roomId}`);

    const handleNewMessage = (data: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== data.messageId) return msg;
          // Nếu là admin, giữ nguyên nội dung gốc nhưng đánh dấu deleted
          if (currentUser?.isAdmin) {
            return { ...msg, deleted: true };
          }
          // Người thường: xóa nội dung
          return {
            ...msg,
            deleted: true,
            text: "[Tin nhắn đã bị gỡ]",
            imageUrl: null,
          };
        }),
      );
    };

    const handleMessagesSeen = (data: { roomId: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.userId === data.userId) return msg;
          if (msg.seenBy?.includes(data.userId)) return msg;
          return { ...msg, seenBy: [...(msg.seenBy || []), data.userId] };
        }),
      );
    };

    channel.bind("new-message", handleNewMessage);
    channel.bind("message-deleted", handleMessageDeleted);
    channel.bind("messages-seen", handleMessagesSeen);

    return () => {
      channel.unbind("new-message", handleNewMessage);
      channel.unbind("message-deleted", handleMessageDeleted);
      channel.unbind("messages-seen", handleMessagesSeen);
      pusher.unsubscribe(`chat-${roomId}`);
    };
  }, [roomId, currentUser?.isAdmin]);

  const loadMoreOlder = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !nextCursor) return;
    await loadMessages(nextCursor, true);
  }, [hasMore, nextCursor, loadMessages]);

  return { messages, loading, loadingMore, hasMore, loadMoreOlder, setMessages };
}
