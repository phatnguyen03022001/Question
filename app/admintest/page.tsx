"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/chat/chat-container";
import AuthForm from "@/components/auth/auth-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  ShieldCheck,
  MessageSquare,
  Loader2,
  Eye,
  Users,
  MonitorCheck,
  ChevronLeft,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode/mode-toggle";
import { getPusherClient } from "@/lib/client";

function getRelativeTime(dateString: string | Date) {
  if (!dateString) return "Không rõ";
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();

  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMins < 1) return "Vừa xong";
  if (diffInMins < 60) return `${diffInMins} phút trước`;
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  if (diffInDays === 1) return "Hôm qua";
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return past.toLocaleDateString("vi-VN");
}

export default function AdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [roomsHasMore, setRoomsHasMore] = useState(false);
  const [roomsPage, setRoomsPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useHeartbeat();

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const userData = await res.json();
          if (userData.isAdmin) setAdmin(userData);
          else router.push("/");
        } else router.push("/");
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, [router]);

  const fetchRooms = useCallback(async (page: number, isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/rooms?page=${page}&limit=20`);
      const data = await res.json();
      setRooms((prev) => (isLoadMore ? [...prev, ...data.rooms] : data.rooms));
      setRoomsHasMore(data.hasMore);
      setRoomsPage(page);
    } catch {
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?limit=100`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.username.toLowerCase().includes(userSearch.toLowerCase());
      const isOnline = new Date().getTime() - new Date(u.lastActive).getTime() < 2 * 60 * 1000;
      return showOnlyOnline ? matchesSearch && isOnline : matchesSearch;
    });
  }, [users, userSearch, showOnlyOnline]);

  useEffect(() => {
    if (!admin) return;
    fetchRooms(1);
    fetchUsers();

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`admin-global`);

    channel.bind("rooms-updated", (data: any) => {
      setRooms((prev) => {
        const index = prev.findIndex((r) => r.roomId === data.roomId);
        const updatedList = [...prev];
        if (index !== -1) {
          const updatedRoom = { ...updatedList[index], ...data };
          updatedList.splice(index, 1);
          updatedList.unshift(updatedRoom);
        } else {
          updatedList.unshift(data);
        }
        return updatedList;
      });
    });

    const interval = setInterval(fetchUsers, 20000);
    return () => {
      pusher.unsubscribe(`admin-global`);
      clearInterval(interval);
    };
  }, [admin, fetchRooms, fetchUsers]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <main className="flex h-dvh bg-background p-0 sm:p-4 gap-0 sm:gap-4 overflow-hidden isolate">
      {/* SIDEBAR */}
      <aside
        className={cn(
          "w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-hidden h-full",
          selectedRoom ? "hidden lg:flex" : "flex",
        )}>
        {/* Profile */}
        <Card className="shrink-0 sm:rounded-2xl border-border shadow-sm">
          <CardContent className="p-3 flex justify-between items-center">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shrink-0">
                AD
              </div>
              <span className="font-bold text-sm truncate">{admin.username}</span>
            </div>
            <div className="flex items-center gap-1">
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="h-8 w-8 text-muted-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Monitor - Fixed Height to force scrolling */}
        <Card className="flex-[0.4] min-h-62.5 flex flex-col overflow-hidden sm:rounded-2xl border-border shadow-sm">
          <div className="p-3 border-b bg-muted/20 shrink-0 space-y-2">
            <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" /> Users
              </div>
              <Button
                variant={showOnlyOnline ? "default" : "outline"}
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowOnlyOnline(!showOnlyOnline)}>
                <Filter className="w-3 h-3" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Tìm..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-7 pl-7 text-[11px]"
              />
            </div>
          </div>

          {/* Quan trọng: h-full bên trong flex-1 của Card */}
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full custom-scrollbar" scrollHideDelay={100}>
              <div className="p-2 space-y-0.5 pointer-events-auto">
                {filteredUsers.map((u) => {
                  // Logic này chỉ giữ lại để xác định màu sắc đèn tín hiệu
                  const isOnline = new Date().getTime() - new Date(u.lastActive).getTime() < 2 * 60 * 1000;
                  return (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 w-full">
                        {/* Avatar & Status Dot */}
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center text-[11px] font-bold border border-border/50 shadow-sm transition-transform group-hover:scale-105">
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card shadow-sm",
                              isOnline ? "bg-success animate-pulse" : "bg-muted-foreground/30",
                            )}
                          />
                        </div>

                        {/* User Info & Relative Time */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold truncate text-foreground/90 uppercase tracking-tight">
                              {u.username}
                            </span>
                            {/* Badge hiển thị "Admin" nếu cần thiết */}
                            {u.isAdmin && (
                              <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">
                                Staff
                              </span>
                            )}
                          </div>

                          <div
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors",
                              isOnline ? "text-success" : "text-muted-foreground/60",
                            )}>
                            {isOnline ? (
                              <span className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-success rounded-full" />
                                Đang trực tuyến
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 opacity-70" />
                                {/* Sử dụng hàm getRelativeTime bạn đã tạo ở trên */}
                                {getRelativeTime(u.lastActive)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </Card>

        {/* Room List - Takes remaining space */}
        <Card className="flex-1 flex flex-col overflow-hidden sm:rounded-2xl border-border shadow-sm">
          <div className="p-4 border-b bg-muted/10 font-bold text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
            Giám sát hội thoại
          </div>
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full custom-scrollbar">
              <div className="p-2 space-y-1">
                {rooms.map((room) => (
                  <div
                    key={room.roomId}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all border border-transparent",
                      selectedRoom?.roomId === room.roomId ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}>
                    <Eye className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate uppercase mb-1">
                        {room.participants?.map((p: any) => (typeof p === "string" ? p : p.username)).join(" & ") ||
                          "Room"}
                      </p>
                      <p className={cn("text-[9px] truncate opacity-50")}>ID: {room.roomId.slice(-8)}</p>
                    </div>
                  </div>
                ))}
                {roomsHasMore && (
                  <Button
                    variant="ghost"
                    className="w-full text-[10px] h-8"
                    onClick={() => fetchRooms(roomsPage + 1, true)}
                    disabled={isLoadingMore}>
                    {isLoadingMore ? "Đang tải..." : "Tải thêm"}
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        </Card>
      </aside>

      {/* MONITOR AREA */}
      <section
        className={cn(
          "flex-1 overflow-hidden border-border bg-card flex flex-col sm:rounded-2xl shadow-sm relative h-full",
          !selectedRoom ? "hidden lg:flex" : "flex",
        )}>
        {selectedRoom ? (
          <>
            <header className="p-3 sm:p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-md shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedRoom(null)}>
                  <ChevronLeft />
                </Button>
                <div className="min-w-0">
                  <div className="text-[9px] text-warning font-black uppercase mb-1">Live Monitor</div>
                  <h3 className="font-bold text-sm sm:text-base truncate uppercase">
                    {selectedRoom.participants?.map((p: any) => (typeof p === "string" ? p : p.username)).join(", ")}
                  </h3>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRoom(null)}
                className="rounded-full text-[10px] font-bold h-8 px-4">
                Đóng
              </Button>
            </header>
            <div className="flex-1 min-h-0 relative">
              {/* ChatContainer tự lo scroll bên trong nó */}
              <ChatContainer key={selectedRoom.roomId} user={admin} roomId={selectedRoom.roomId} readOnly={true} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 italic select-none">
            <ShieldCheck className="w-20 h-20 mb-4 opacity-[0.03]" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em]">Select a room</p>
          </div>
        )}
      </section>
    </main>
  );
}
