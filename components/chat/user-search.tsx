"use client";

import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserSearchProps {
  onStartChat: (roomId: string, targetUser: any) => void;
  currentUserId: string;
}

export function UserSearch({ onStartChat, currentUserId }: UserSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${keyword}`);
      const data = await res.json();
      const filtered = data.filter((u: any) => u._id !== currentUserId);
      setResults(filtered);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (targetUser: any) => {
    const res = await fetch("/api/rooms/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: targetUser._id }),
    });
    const data = await res.json();
    onStartChat(data.roomId, data.targetUser);
  };

  return (
    <div className="p-3 border-b border-border">
      <div className="flex gap-2">
        {/* Sử dụng component Input từ shadcn/ui, tự động map với --input và --ring */}
        <Input
          type="text"
          placeholder="Tìm theo tên hoặc ID..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="h-9 text-sm"
        />
        <Button size="icon" variant="default" onClick={search} disabled={loading} className="h-9 w-9 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {/* Kết quả tìm kiếm */}
      <div className="mt-3 space-y-2">
        {loading && <p className="text-xs text-muted-foreground animate-pulse">Đang tìm kiếm...</p>}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((u: any) => (
              <div
                key={u._id}
                className="flex justify-between items-center p-2 rounded-md hover:bg-accent transition-colors group">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{u.username}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    ID: {u._id.slice(-6)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startChat(u)}
                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!loading && keyword && results.length === 0 && (
          <p className="text-xs text-muted-foreground py-2 text-center">Không tìm thấy người dùng</p>
        )}
      </div>
    </div>
  );
}
