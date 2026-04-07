"use client";

import Image from "next/image";
import { Trash2, X, ImageIcon, Clock, Check, CheckCheck } from "lucide-react";
import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- types ---------------- */
interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
}

interface Message {
  _id: string;
  userId: string;
  text?: string;
  imageUrl?: string | null;
  imageMode?: "normal" | "once";
  onceViewedBy?: string[];
  deleted?: boolean;
  seenBy?: string[];
  createdAt: string;
}

interface Props {
  message: Message;
  isMe: boolean;
  currentUser: User;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/* ---------------- component ---------------- */
function MessageItem({ message, isMe, currentUser }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageOpened, setImageOpened] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const canDelete = isMe;
  const isOnceImage = message.imageMode === "once" && !!message.imageUrl;
  const hasBeenSeen = !message.deleted && (message.seenBy?.length ?? 0) > 0;
  const canViewDirectly = isMe || currentUser.isAdmin;
  const alreadyViewed = !canViewDirectly && (message.onceViewedBy?.includes(currentUser._id) ?? false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ---------------- handlers ---------------- */
  const handleViewNormalImage = () => setShowFullImage(true);

  const handleViewOnceImage = async () => {
    if (!message.imageUrl || alreadyViewed || imageOpened) return;

    setImageOpened(true);
    setShowFullImage(true);
    setTimeLeft(5);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);

    timerRef.current = setTimeout(async () => {
      setShowFullImage(false);
      setTimeLeft(null);
      await fetch(`/api/messages/${message._id}/once-viewed`, { method: "POST" }).catch();
    }, 5000);
  };

  const handleCloseModal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowFullImage(false);
    setTimeLeft(null);
    if (!canViewDirectly && isOnceImage && imageOpened && !alreadyViewed) {
      fetch(`/api/messages/${message._id}/once-viewed`, { method: "POST" }).catch();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/${message._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      alert("Thu hồi tin nhắn thất bại");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- render content ---------------- */
  const renderContent = () => {
    if (message.deleted) {
      if (currentUser.isAdmin) {
        return (
          <div className="space-y-2 opacity-70">
            {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
            {message.imageUrl && (
              <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-destructive/50">
                <Image src={message.imageUrl} alt="Deleted" fill className="object-cover grayscale" />
              </div>
            )}
            <span className="text-[10px] font-medium text-destructive uppercase tracking-tighter">
              Admin: Đã thu hồi
            </span>
          </div>
        );
      }
      return <p className="text-sm italic opacity-60">Tin nhắn đã bị thu hồi</p>;
    }

    return (
      <div className="space-y-2">
        {message.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>}

        {message.imageUrl && (
          <div className="pt-1">
            {!isOnceImage || canViewDirectly ? (
              <div className="space-y-1">
                <Button variant="secondary" size="sm" onClick={handleViewNormalImage} className="h-8 gap-2 text-xs">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Xem ảnh
                </Button>
                {isOnceImage && (
                  <div className="text-[10px] text-warning flex items-center gap-1 px-1">
                    <Clock className="w-3 h-3" />
                    <span>Chế độ xem một lần</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!alreadyViewed && !imageOpened ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleViewOnceImage}
                    className="h-8 gap-2 text-xs border-dashed border-primary/50">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Mở ảnh một lần
                  </Button>
                ) : alreadyViewed || (imageOpened && timeLeft === 0) ? (
                  <div className="text-xs opacity-60 italic flex items-center gap-2 py-1">
                    <Clock className="w-3.5 h-3.5" /> Ảnh đã hết hạn
                  </div>
                ) : (
                  <div className="text-xs text-primary font-medium animate-pulse">Đang xem ({timeLeft}s)</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={cn("flex mb-4 group relative px-4", isMe ? "justify-end" : "justify-start")}>
        {/* Sử dụng utility classes từ globals.css */}
        <div
          className={cn(
            "max-w-[80%] transition-all duration-200",
            isMe ? "chat-bubble-sent shadow-sm" : "chat-bubble-received border border-border/50 shadow-sm",
          )}>
          {renderContent()}

          <div className="text-[11px] mt-1.5 flex items-center justify-end gap-2">
            <span className="text-foreground/70 font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {isMe && !message.deleted && (
              <span
                className={cn(
                  "transition-colors",
                  hasBeenSeen
                    ? "text-green-500" // đã đọc → nổi bật
                    : "text-foreground/80", // chưa đọc → vẫn rõ
                )}>
                {hasBeenSeen ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </span>
            )}
          </div>
        </div>

        {canDelete && !message.deleted && (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -top-2 -right-1 h-6 w-6 rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg">
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Modal Fullscreen - Giữ nguyên logic nhưng dùng tokens */}
      {showFullImage && message.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseModal}>
          <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={message.imageUrl}
              alt="Full"
              width={1600}
              height={1600}
              className="max-w-full max-h-full object-contain rounded-lg"
              unoptimized={true}
            />
            {!canViewDirectly && isOnceImage && timeLeft && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl">
                <Clock className="w-3.5 h-3.5" /> {timeLeft} giây còn lại
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 rounded-full bg-background/50 hover:bg-background">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(MessageItem);
