"use client";

import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/chat/chat-container";
import AuthForm from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle, Plus, ShieldCheck, ChevronLeft } from "lucide-react";
import { ConversationList } from "@/components/chat/conversation-list";
import { UserSearch } from "@/components/chat/user-search";
import { cn } from "@/lib/utils";
import { ModeToggle } from "../components/mode/mode-toggle";
import Image from "next/image";

export default function HomePage() {
  useHeartbeat();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedOtherUser, setSelectedOtherUser] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const userData = await res.json();
          if (!userData.isAdmin) setUser(userData);
          else router.push("/admin");
        } else setUser(null);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleSelectRoom = useCallback((roomId: string, otherUser: any) => {
    setSelectedRoomId(roomId);
    setSelectedOtherUser(otherUser);
    setShowSearch(false);
  }, []);

  const handleStartChat = useCallback((roomId: string, targetUser: any) => {
    setSelectedRoomId(roomId);
    setSelectedOtherUser(targetUser);
    setShowSearch(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="h-dvh flex items-center justify-center p-4 relative overflow-hidden isolate">
        {/* --- PROFESSIONAL BACKGROUND LAYER --- */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          {/* Ảnh gốc: Dùng ảnh abstract tông tối/tím để khớp với bộ màu Electric Iris */}
          <Image
            src="/main_bg.jpg"
            alt="System Background"
            fill
            priority
            className="object-cover opacity-50 transition-opacity duration-1000"
          />

          {/* Lớp phủ mờ (Kính mờ trung tâm) */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[80px]" />

          {/* Lớp phủ Gradient tạo điểm nhấn màu sắc theo thương hiệu */}
          <div className="absolute inset-0 bg-linear-to-tr from-background via-primary/5 to-background" />

          {/* Đèn Spot trung tâm để làm nổi bật AuthForm */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-primary/10 blur-[120px] rounded-full opacity-50" />
        </div>

        {/* --- CONTENT LAYER --- */}
        <div className="z-10 w-full flex flex-col items-center max-w-md">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center text-center space-y-6 mb-10 shrink-0 animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="p-5 bg-card/40 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 backdrop-blur-md border border-white/5 relative group">
              {/* Hiệu ứng phát sáng nhẹ sau icon */}
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-all duration-500" />
              <MessageCircle className="w-12 h-12 text-primary relative z-10" />
            </div>

            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                Something<span className="text-primary">.</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.4em] opacity-60">
                Encrypted Connection
              </p>
            </div>
          </div>

          {/* AuthForm Container */}
          <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-200">
            <AuthForm onAuth={(u: any) => (u.isAdmin ? router.push("/admin") : setUser(u))} />
          </div>

          {/* Footer nhỏ nhẹ (Tùy chọn) */}
          <p className="mt-8 text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">
            &copy; 2026 Something System • v0.1.0
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-dvh bg-background flex flex-col p-0 sm:p-4 transition-all overflow-hidden isolate">
      <div className="flex-1 flex flex-row gap-0 sm:gap-4 overflow-hidden max-w-350 mx-auto w-full">
        {/* SIDEBAR: Đã tối ưu logic chứa scroll */}
        <aside
          className={cn(
            "w-full sm:w-80 bg-card sm:rounded-2xl border-r sm:border border-border flex flex-col overflow-hidden transition-all shrink-0 h-full",
            selectedRoomId ? "hidden sm:flex" : "flex",
          )}>
          <div className="shrink-0 p-4 border-b border-border flex justify-between items-center bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {user.username[0].toUpperCase()}
              </div>
              <span className="font-bold text-sm truncate uppercase tracking-tight">{user.username}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="shrink-0 p-3 border-b border-border bg-muted/10">
            <Button
              variant={showSearch ? "secondary" : "outline"}
              className="w-full justify-start gap-2 h-9 text-[11px] font-bold uppercase tracking-wider"
              onClick={() => setShowSearch(!showSearch)}>
              <Plus className={cn("w-4 h-4 transition-all", showSearch && "rotate-45")} />
              {showSearch ? "Đóng" : "Hội thoại mới"}
            </Button>
            {showSearch && (
              <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                <UserSearch onStartChat={handleStartChat} currentUserId={user._id} />
              </div>
            )}
          </div>

          {/* Conversation List: Container này cực kỳ quan trọng */}
          <div className="flex-1 min-h-0 relative overscroll-contain">
            {/* ConversationList bên trong nên dùng ScrollArea của shadcn hoặc overflow-y-auto */}
            <ConversationList userId={user._id} onSelectRoom={handleSelectRoom} selectedRoomId={selectedRoomId} />
          </div>
        </aside>

        {/* CHAT AREA: Đã tối ưu min-h-0 */}
        <section
          className={cn(
            "flex-1 bg-card sm:rounded-2xl sm:border border-border flex flex-col overflow-hidden relative min-w-0 h-full shadow-sm",
            !selectedRoomId ? "hidden sm:flex" : "flex",
          )}>
          {!selectedRoomId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
              <ShieldCheck className="w-16 h-16 opacity-10" />
              <p className="text-sm font-medium">Chọn một người bạn để bắt đầu</p>
            </div>
          ) : (
            <>
              <header className="shrink-0 p-3 sm:p-4 border-b border-border bg-card/80 backdrop-blur-md flex items-center gap-3 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden -ml-2 h-8 w-8"
                  onClick={() => setSelectedRoomId("")}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold shrink-0 border border-primary/20">
                  {selectedOtherUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm sm:text-base truncate leading-none mb-1 uppercase tracking-tight">
                    {selectedOtherUser?.username || "Người dùng"}
                  </span>
                </div>
              </header>

              {/* Khu vực chứa tin nhắn: min-h-0 bắt buộc phải có */}
              <div className="flex-1 min-h-0 relative bg-background/30 custom-scrollbar overscroll-contain">
                <ChatContainer user={user} roomId={selectedRoomId} />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
