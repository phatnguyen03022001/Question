"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/client";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  _id: string;
  username: string;
}

interface Room {
  roomId: string;
  otherUser: User;
  lastMessage?: any; // Thêm để tránh lỗi type khi update
}

export function ConversationList({
  userId,
  onSelectRoom,
  selectedRoomId,
}: {
  userId: string;
  onSelectRoom: (roomId: string, otherUser: any) => void;
  selectedRoomId?: string;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
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
      if (!res.ok) throw new Error("Failed to fetch rooms");

      const data = await res.json();
      const fetchedRooms = Array.isArray(data.rooms) ? data.rooms : [];

      if (isLoadMore) {
        setRooms((prev) => [...prev, ...fetchedRooms]);
      } else {
        setRooms(fetchedRooms);
      }

      setHasMore(data.hasMore || false);
      setPage(pageToLoad);
    } catch {
      if (!isLoadMore) setRooms([]);
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

    const handleRoomsUpdate = (data: { roomId: string; lastMessage?: any; otherUser?: any }) => {
      setRooms((prevRooms) => {
        const roomIndex = prevRooms.findIndex((r) => r.roomId === data.roomId);
        const updatedRooms = [...prevRooms];

        if (roomIndex !== -1) {
          const targetRoom = { ...updatedRooms[roomIndex], ...data };
          updatedRooms.splice(roomIndex, 1);
          updatedRooms.unshift(targetRoom);
        } else {
          if (data.otherUser) {
            updatedRooms.unshift(data as Room);
          } else {
            fetchRooms(1, false);
            return prevRooms;
          }
        }
        return updatedRooms;
      });
    };

    channel.bind("rooms-updated", handleRoomsUpdate);

    return () => {
      isMounted.current = false;
      channel.unbind("rooms-updated", handleRoomsUpdate);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, fetchRooms]);

  // --- HÀM LOAD MORE BỊ THIẾU NẰM Ở ĐÂY ---
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchRooms(page + 1, true);
  }, [hasMore, loadingMore, page, fetchRooms]);
  // ----------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground/80">Hội thoại</h2>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-2 flex flex-col gap-1">
          {(!rooms || rooms.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/30">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Chưa có tin nhắn nào</p>
            </div>
          )}

          {rooms?.map((room: Room) => {
            const isActive = selectedRoomId === room.roomId;
            return (
              <div
                key={room.roomId}
                onClick={() => onSelectRoom(room.roomId, room.otherUser)}
                className={cn(
                  "relative group mx-1 p-3 cursor-pointer rounded-xl flex items-center gap-3 transition-all duration-300 ease-out",
                  !isActive && [
                    "hover:bg-secondary/70",
                    "hover:-translate-y-0.5",
                    "hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.1)]",
                    "active:scale-95 active:translate-y-0",
                  ],
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02] z-10"
                    : "bg-transparent text-foreground",
                )}>
                <div
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-500",
                    isActive
                      ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground rotate-6"
                      : "bg-muted border-transparent text-muted-foreground group-hover:-rotate-6 group-hover:border-primary/20 group-hover:bg-background",
                  )}>
                  {room.otherUser?.username?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="flex flex-col overflow-hidden flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span
                      className={cn(
                        "text-sm font-bold truncate transition-colors duration-300",
                        !isActive && "group-hover:text-primary",
                      )}>
                      {room.otherUser?.username || "Người dùng"}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium transition-opacity",
                        isActive
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground/50 opacity-0 group-hover:opacity-100",
                      )}>
                      Vừa xong
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-xs truncate font-medium transition-all duration-300",
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5",
                    )}>
                    Bấm để xem nội dung chat
                  </span>
                </div>

                {isActive && (
                  <div className="absolute -left-1 w-1.5 h-6 bg-primary-foreground rounded-full animate-in fade-in zoom-in duration-300" />
                )}

                {!isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-100" />
                )}
              </div>
            );
          })}

          {hasMore && (
            <div className="p-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 w-full h-9">
                {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Tải thêm hội thoại"}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
