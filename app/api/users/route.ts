import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/server";
import User from "@/models/User";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_session")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await User.findById(userId);
  if (!currentUser || !currentUser.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Phân trang
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
  const skip = (page - 1) * limit;

  const totalUsers = await User.countDocuments({});
  const users = await User.find({}, "-password").sort({ createdAt: -1 }).skip(skip).limit(limit);

  const hasMore = skip + users.length < totalUsers;

  return NextResponse.json({ users, hasMore, nextPage: page + 1 });
}
