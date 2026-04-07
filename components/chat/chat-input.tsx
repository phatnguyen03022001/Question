"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, X, Loader2, Eye } from "lucide-react";
import Image from "next/image";
import { compressImage, cn } from "@/lib/utils";

const uploadImageDirect = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Upload ảnh thất bại");
  }
  const data = await res.json();
  return data.secure_url;
};

export default function ChatInput({ roomId }: { roomId: string }) {
  const MAX_MESSAGE_LENGTH = 160;
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"normal" | "once">("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File quá lớn (Tối đa 10MB)");
      return;
    }
    let fileToPreview = selectedFile;
    if (selectedFile.size > 1024 * 1024) {
      fileToPreview = await compressImage(selectedFile);
    }
    setFile(fileToPreview);
    setPreview(URL.createObjectURL(fileToPreview));
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || uploading) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      alert("Tin nhắn tối đa 2000 ký tự");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      if (file) {
        let fileToUpload = file;
        if (file.size > 1024 * 1024) {
          fileToUpload = await compressImage(file);
        }
        imageUrl = await uploadImageDirect(fileToUpload);
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, roomId, imageUrl, imageMode }),
      });

      if (res.ok) {
        setText("");
        removeFile();
        setImageMode("normal");
      } else {
        const error = await res.json();
        alert(error.error || "Gửi tin nhắn thất bại");
      }
    } catch (error: any) {
      alert(error.message || "Gửi tin nhắn thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col border-t border-border bg-background w-full">
      {/* Phần xem trước ảnh đính kèm */}
      {preview && (
        <div className="p-3 px-4 flex gap-3 bg-muted/50 border-b border-border items-center animate-in fade-in slide-in-from-bottom-2">
          <div className="relative w-14 h-14 rounded-md overflow-hidden border border-primary/20 shadow-sm ring-2 ring-primary/10">
            <Image src={preview} alt="preview" fill className="object-cover" />
            <button
              onClick={removeFile}
              className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 rounded-bl-md hover:opacity-90 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Đang đính kèm</p>
            <p className="text-xs text-foreground truncate font-medium">{file?.name}</p>
          </div>
        </div>
      )}

      <form onSubmit={send} className="flex flex-col gap-2 p-4">
        <div className="flex gap-2 items-center">
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10">
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= MAX_MESSAGE_LENGTH) {
                setText(value);
              }
            }}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={file ? "Thêm chú thích..." : "Nhập tin nhắn..."}
            className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 shadow-none"
            disabled={uploading}
          />

          <Button
            type="submit"
            size="icon"
            disabled={uploading || (!text.trim() && !file)}
            className="shrink-0 shadow-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Tuỳ chọn chế độ ảnh (Toggle UI chuyên nghiệp hơn) */}
        {file && (
          <div className="flex gap-4 items-center justify-start px-2 mt-1 animate-in fade-in duration-300">
            <div className="flex items-center space-x-4 bg-muted/50 p-1.5 px-3 rounded-full border border-border">
              <button
                type="button"
                onClick={() => setImageMode("normal")}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-0.5 rounded-full",
                  imageMode === "normal"
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}>
                Gửi thường
              </button>
              <button
                type="button"
                onClick={() => setImageMode("once")}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-0.5 rounded-full",
                  imageMode === "once"
                    ? "bg-background shadow-sm text-warning"
                    : "text-muted-foreground hover:text-foreground",
                )}>
                <Eye className="w-3 h-3" />
                Xem 1 lần (5s)
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
