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
    const user = await User.findOne({ _id: auth.userId, workspaceId: auth.workspaceId })
      .select("notificationReadAt notificationClearedAt dismissedNotificationIds")
      .lean();
    if (!user) return fail("User not found.", 404);
    const items = await getUserNotifications(auth, {
      limit,
      clearedAt: user.notificationClearedAt,
      dismissedIds: user.dismissedNotificationIds || [],
    });
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

export async function DELETE(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const body = await request.json().catch(() => ({}));
    const notificationId = typeof body.notificationId === "string" ? body.notificationId.trim() : "";
    const update = notificationId
      ? { $addToSet: { dismissedNotificationIds: notificationId } }
      : {
        $set: { notificationClearedAt: new Date(), dismissedNotificationIds: [] },
      };
    if (notificationId && (notificationId.length > 200 || !/^(mention|assignment|update)-[a-z0-9-]+$/i.test(notificationId))) {
      return fail("Invalid notification.", 422);
    }
    const user = await User.findOneAndUpdate(
      { _id: auth.userId, workspaceId: auth.workspaceId },
      update,
      { returnDocument: "after" },
    ).select("notificationClearedAt dismissedNotificationIds").lean();
    if (!user) return fail("User not found.", 404);
    return ok({}, notificationId ? "Notification cleared." : "All notifications cleared.");
  } catch (error) {
    return handleApiError(error);
  }
}
