import { fail, handleApiError, ok } from "@/lib/api-response";
import { getUserNotifications } from "@/lib/notifications";
import { requireApiUser } from "@/lib/server";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const requestedLimit = Number(new URL(request.url).searchParams.get("limit"));
    const limit = Math.min(100, Math.max(1, requestedLimit || 60));
    const [items, user] = await Promise.all([
      getUserNotifications(auth, { limit }),
      User.findOne({ _id: auth.userId, workspaceId: auth.workspaceId })
        .select("notificationReadAt")
        .lean(),
    ]);
    if (!user) return fail("User not found.", 404);
    const readAt = user.notificationReadAt || null;
    const unreadCount = items.filter((item) =>
      !readAt || new Date(item.createdAt) > new Date(readAt),
    ).length;
    return ok({ items, unreadCount, readAt });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const notificationReadAt = new Date();
    const user = await User.findOneAndUpdate(
      { _id: auth.userId, workspaceId: auth.workspaceId },
      { $set: { notificationReadAt } },
      { returnDocument: "after" },
    ).select("notificationReadAt").lean();
    if (!user) return fail("User not found.", 404);
    return ok({ notificationReadAt }, "Notifications marked as read.");
  } catch (error) {
    return handleApiError(error);
  }
}
