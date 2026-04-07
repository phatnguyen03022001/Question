import { NextRequest, NextResponse } from "next/server";
import { connectDB, pusherServer } from "@/lib/server";
import Message from "@/models/Message";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_session")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId" }, { status: 400 });
  }

  // Kiểm tra user có phải participant không
  const ids = roomId.split("-");
  if (!ids.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cập nhật seenBy cho tin nhắn của người khác
  const result = await Message.updateMany(
    { roomId, seenBy: { $ne: userId }, userId: { $ne: userId } },
    { $addToSet: { seenBy: userId } },
  );

  // Chỉ trigger Pusher nếu có ít nhất một tin nhắn được cập nhật
  if (result.modifiedCount > 0) {
    await pusherServer.trigger(`chat-${roomId}`, "messages-seen", { roomId, userId });
  }

  return NextResponse.json({ modified: result.modifiedCount });
}
