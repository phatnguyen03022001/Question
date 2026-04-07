"use client";

import { Loader2, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center bg-background gap-4 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Vòng xoay phía ngoài */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        {/* Icon trung tâm */}
        <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center shadow-xl border border-border/50">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Loading System
        </div>
        <p className="text-xs text-muted-foreground font-medium italic">Đang thiết lập kết nối an toàn...</p>
      </div>
    </div>
  );
}
