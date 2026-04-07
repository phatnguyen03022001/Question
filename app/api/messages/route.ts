import { NextRequest, NextResponse } from "next/server";
import { connectDB, pusherServer } from "@/lib/server";
import User from "@/models/User";
import Message from "@/models/Message";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const roomId = req.nextUrl.searchParams.get("roomId");
  const isAdmin = req.nextUrl.searchParams.get("isAdmin") === "true";
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10), 50);

  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId" }, { status: 400 });
  }

  // Tạo query object, dùng $lt nếu có cursor
  const queryFilter: any = { roomId };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    queryFilter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const messages = await Message.find(queryFilter).sort({ createdAt: -1 }).limit(limit).lean().exec();

  const processed = messages.map((m) => {
    const obj = { ...m };
    if (obj.deleted) {
      if (isAdmin) obj.isDeleted = true;
      else {
        obj.text = "[Tin nhắn đã bị gỡ]";
        obj.imageUrl = null;
        obj.isDeleted = true;
      }
    }
    if (!isAdmin) obj.username = obj.username === "Admin" ? "Support" : "someone";
    return obj;
  });

  const hasMore = messages.length === limit;
  const nextCursor = messages.length ? messages[messages.length - 1]._id.toString() : null;

  return NextResponse.json({
    messages: processed.reverse(),
    hasMore,
    nextCursor,
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const userIdFromCookie = cookieStore.get("auth_session")?.value;
  if (!userIdFromCookie) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { text, roomId, imageUrl, imageMode } = await req.json();
  if (!text && !imageUrl) {
    return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });
  }

  const user = await User.findById(userIdFromCookie).lean();
  if (!user) {
    return NextResponse.json({ error: "User không tồn tại" }, { status: 404 });
  }

  const finalRoomId = roomId || `room-${user._id}`;

  const isOwnerRoom = finalRoomId === `room-${user._id}`;
  const isPrivateRoom = finalRoomId.startsWith("room-") && finalRoomId.includes(user._id.toString());
  if (!user.isAdmin && !isOwnerRoom && !isPrivateRoom) {
    return NextResponse.json({ error: "Không có quyền gửi vào phòng này" }, { status: 403 });
  }

  const msg = await Message.create({
    roomId: finalRoomId,
    userId: user._id,
    username: user.username,
    text: text || "",
    imageUrl,
    imageMode: imageMode === "once" ? "once" : "normal",
  });

  const msgObj = msg.toObject();

  await pusherServer.trigger(`chat-${finalRoomId}`, "new-message", {
    ...msgObj,
    username: user.isAdmin ? user.username : "someone",
  });

  // Lấy danh sách participant (các userId hợp lệ)
  const participants = finalRoomId
    .split("-")
    .filter(
      (id: string | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectId | mongoose.mongo.BSON.ObjectIdLike) =>
        id !== "room" && mongoose.Types.ObjectId.isValid(id),
    );

  await Promise.all(participants.map((pid: any) => pusherServer.trigger(`user-${pid}`, "rooms-updated", {})));

  return NextResponse.json(msg, { status: 201 });
}
