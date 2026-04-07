"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("System Error:", error);
  }, [error]);

  return (
    <main className="h-dvh w-full flex flex-col items-center justify-center bg-background p-6 animate-in zoom-in-95 duration-300">
      <div className="w-16 h-16 bg-destructive/10 rounded-3xl flex items-center justify-center mb-6 border border-destructive/20">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>

      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black uppercase tracking-tight text-destructive">Đã có lỗi xảy ra</h2>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Mã lỗi: {error.digest || "Unknown_Interrupt"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[320px]">
        <Button
          onClick={() => reset()}
          className="flex-1 rounded-xl font-bold uppercase text-[10px] tracking-wider h-11">
          <RefreshCw className="mr-2 w-4 h-4" /> Thử lại ngay
        </Button>

        <Link href="/" className="flex-1">
          <Button
            variant="outline"
            className="w-full rounded-xl font-bold uppercase text-[10px] tracking-wider h-11 border-border/50">
            <Home className="mr-2 w-4 h-4" /> Trang chủ
          </Button>
        </Link>
      </div>

      <p className="mt-8 text-[10px] text-muted-foreground/50 uppercase font-medium">
        Hệ thống tự động ghi nhận sự cố này
      </p>
    </main>
  );
}
