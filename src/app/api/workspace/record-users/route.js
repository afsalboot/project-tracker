import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import User from "@/models/User";

export const runtime = "nodejs";

const scopePermissions = {
  projects: "projects.view_others",
  tasks: "tasks.view_others",
};

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const scope = new URL(request.url).searchParams.get("scope");
    const permission = scopePermissions[scope];
    if (!permission) return fail("Select a valid record scope.", 400);
    if (!hasWorkspacePermission(auth.workspace, auth.role, permission)) {
      return fail("You do not have permission to filter other users' records.", 403);
    }
    const users = await User.find({ workspaceId: auth.workspaceId, status: { $ne: "suspended" } })
      .select("name username")
      .sort({ name: 1 })
      .lean();
    return ok({ users });
  } catch (error) {
    return handleApiError(error);
  }
}
