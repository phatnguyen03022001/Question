"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/client";
import { MessageCircle } from "lucide-react";

export function ConversationList({
  userId,
  onSelectRoom,
  selectedRoomId,
}: {
  userId: string;
  onSelectRoom: (roomId: string, otherUser: any) => void;
  selectedRoomId?: string;
}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const isMounted = useRef(true);

  const roomsLoadingMoreRef = useRef(false);

  const fetchRooms = useCallback(async (pageToLoad: number, isLoadMore = false) => {
    if (isLoadMore && roomsLoadingMoreRef.current) return;

    if (isLoadMore) roomsLoadingMoreRef.current = true;

    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/rooms?page=${pageToLoad}&limit=20`);
      const data = await res.json();

      if (isLoadMore) setRooms((prev) => [...prev, ...data.rooms]);
      else setRooms(data.rooms);

      setHasMore(data.hasMore);
      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isLoadMore) setLoading(false);
      else {
        setLoadingMore(false);
        roomsLoadingMoreRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchRooms(1, false);

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${userId}`);
    const handleRoomsUpdate = () => {
      fetchRooms(1, false);
    };
    channel.bind("rooms-updated", handleRoomsUpdate);

    return () => {
      isMounted.current = false;
      channel.unbind("rooms-updated", handleRoomsUpdate);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, fetchRooms]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchRooms(page + 1, true);
  };

  if (loading) return <div className="p-2 text-sm">Đang tải...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 font-bold border-b">Tin nhắn</div>
      <div className="flex-1 overflow-auto">
        {rooms.length === 0 && <div className="p-2 text-gray-400 text-sm">Chưa có cuộc trò chuyện</div>}
        {rooms.map((room: any) => (
          <div
            key={room.roomId}
            onClick={() => onSelectRoom(room.roomId, room.otherUser)}
            className={`p-2 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2 ${
              selectedRoomId === room.roomId ? "bg-blue-50" : ""
            }`}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{room.otherUser?.username || "Unknown"}</span>
          </div>
        ))}
        {hasMore && (
          <div className="p-2 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="text-xs text-blue-500 hover:underline">
              {loadingMore ? "Đang tải..." : "Xem thêm cuộc trò chuyện"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
