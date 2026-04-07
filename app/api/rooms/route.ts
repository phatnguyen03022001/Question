import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/server";
import Message from "@/models/Message";
import { cookies } from "next/headers";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_session")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Phân trang
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
  const skip = (page - 1) * limit;

  // Lấy tất cả roomId có chứa userId (dùng regex) + phân trang
  const rooms = await Message.aggregate([
    { $match: { roomId: { $regex: userId } } },
    { $group: { _id: "$roomId", lastMessageAt: { $max: "$createdAt" } } },
    { $sort: { lastMessageAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: { roomId: "$_id", _id: 0, lastMessageAt: 1 } },
  ]);

  // Đếm tổng số phòng để biết có more
  const totalCountResult = await Message.aggregate([
    { $match: { roomId: { $regex: userId } } },
    { $group: { _id: "$roomId" } },
    { $count: "total" },
  ]);
  const totalRooms = totalCountResult[0]?.total || 0;
  const hasMore = skip + rooms.length < totalRooms;

  const result = [];
  for (const room of rooms) {
    const { roomId, lastMessageAt } = room;
    const parts = roomId.split("-");
    const otherUserId = parts.find((id: string) => id !== userId && id !== "room");
    if (otherUserId && mongoose.Types.ObjectId.isValid(otherUserId)) {
      const otherUser = await User.findById(otherUserId).select("username");
      result.push({
        roomId,
        otherUser: { _id: otherUserId, username: otherUser?.username || "Unknown" },
        lastMessageAt,
      });
    } else {
      result.push({
        roomId,
        otherUser: { _id: null, username: "Admin/Support" },
        lastMessageAt,
      });
    }
  }
  return NextResponse.json({ rooms: result, hasMore, nextPage: page + 1 });
}
