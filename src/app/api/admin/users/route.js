import { fail, handleApiError, ok } from "@/lib/api-response";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireApiUser } from "@/lib/server";
import { escapeRegex } from "@/lib/utils";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Platform administrator access required.", 403);
    }

    const params = new URL(request.url).searchParams;
    const query = {};
    const status = params.get("status");
    const search = params.get("search")?.trim().slice(0, 100);
    if (["active", "suspended"].includes(status)) {
      query.status = status === "active" ? { $ne: "suspended" } : "suspended";
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(query)
      .select("name email role status workspaceId createdAt updatedAt")
      .populate("workspaceId", "name type status")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return ok({
      users,
      currentAdminId: auth.userId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
