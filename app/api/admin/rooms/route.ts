import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/server";
import Message from "@/models/Message";
import User from "@/models/User";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const adminId = cookieStore.get("auth_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Phân trang
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    // Bước 1: Lấy danh sách roomId có phân trang (dùng $group + $sort + $skip/$limit)
    const roomData = await Message.aggregate([
      { $group: { _id: "$roomId" } },
      { $sort: { _id: 1 } }, // sắp xếp theo roomId để nhất quán
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          roomId: "$_id",
          userIds: {
            $filter: {
              input: { $split: ["$_id", "-"] },
              as: "part",
              cond: { $and: [{ $ne: ["$$part", "room"] }, { $ne: ["$$part", ""] }] },
            },
          },
        },
      },
    ]);

    // Đếm tổng số phòng
    const totalCountResult = await Message.aggregate([{ $group: { _id: "$roomId" } }, { $count: "total" }]);
    const totalRooms = totalCountResult[0]?.total || 0;
    const hasMore = skip + roomData.length < totalRooms;

    if (roomData.length === 0) {
      return NextResponse.json({ rooms: [], hasMore, nextPage: page + 1 });
    }

    // Lấy tất cả userId hợp lệ
    const allUserIds = roomData
      .flatMap((room) => room.userIds)
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    const uniqueUserIds = [...new Set(allUserIds)];

    const usersMap = new Map();
    if (uniqueUserIds.length > 0) {
      const users = await User.find({ _id: { $in: uniqueUserIds } }).select("username");
      users.forEach((user) => usersMap.set(user._id.toString(), { _id: user._id, username: user.username }));
    }

    const result = roomData
      .map((room) => ({
        roomId: room.roomId,
        participants: room.userIds
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => usersMap.get(id))
          .filter(Boolean),
      }))
      .filter((room) => room.participants.length > 0);

    return NextResponse.json({ rooms: result, hasMore, nextPage: page + 1 });
  } catch (error: any) {
    console.error("Error in /api/admin/rooms:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
