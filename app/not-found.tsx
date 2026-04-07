"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <main className="h-dvh w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="relative mb-8">
        <Ghost className="w-24 h-24 text-primary/10 animate-bounce" />
        <h1 className="absolute inset-0 flex items-center justify-center text-7xl font-black tracking-tighter opacity-20">
          404
        </h1>
      </div>

      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black uppercase tracking-tight">Trang này không tồn tại</h2>
        <p className="text-sm text-muted-foreground max-w-75 mx-auto">
          Có vẻ như đường dẫn này đã bị thay đổi hoặc không còn hiện diện trong hệ thống.
        </p>
      </div>

      <Link href="/">
        <Button className="rounded-full px-8 font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
          <MoveLeft className="mr-2 w-4 h-4" /> Quay về trang chủ
        </Button>
      </Link>
    </main>
  );
}
