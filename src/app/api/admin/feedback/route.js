import { handleApiError, fail, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import Feedback from "@/models/Feedback";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) return fail("Platform administrator access required.", 403);
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const query = ["pending", "approved", "rejected"].includes(status) ? { status } : {};
    const [items, totals] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).limit(200).lean(),
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    return ok({
      items,
      totals: Object.fromEntries(totals.map((item) => [item._id, item.count])),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
