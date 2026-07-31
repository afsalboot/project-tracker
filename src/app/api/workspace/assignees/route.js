import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const scope = new URL(request.url).searchParams.get("scope");
    const permission = scope === "projects" ? "projects.assign" : null;
    if (!permission) return fail("Invalid assignment scope.", 400);
    if (auth.workspace.type === "personal") {
      return ok({ enabled: false, members: [] });
    }
    if (!hasWorkspacePermission(auth.workspace, auth.role, permission)) {
      return fail("You do not have permission to assign users.", 403);
    }
    const members = await User.find({ workspaceId: auth.workspaceId })
      .select("name email role")
      .sort({ name: 1 })
      .lean();
    return ok({ enabled: true, members });
  } catch (error) {
    return handleApiError(error);
  }
}
