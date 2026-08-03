import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import { projectAccessFilter } from "@/lib/project-access";
import Project from "@/models/Project";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope");
    const operation = params.get("operation");
    const permission = scope === "projects"
      ? operation === "create" ? "projects.create" : "projects.assign"
      : null;
    if (!permission) return fail("Invalid assignment scope.", 400);
    if (auth.workspace.type === "personal") {
      return ok({ enabled: false, members: [] });
    }
    if (!hasWorkspacePermission(auth.workspace, auth.role, permission)) {
      return fail(operation === "create"
        ? "You do not have permission to create projects."
        : "You do not have permission to change project assignments.", 403);
    }
    const [members, projects] = await Promise.all([
      User.find({ workspaceId: auth.workspaceId })
        .select("name email role")
        .sort({ name: 1 })
        .lean(),
      Project.find({ workspaceId: auth.workspaceId, ...projectAccessFilter(auth) })
        .select("userId assignedUserIds")
        .lean(),
    ]);
    const membersWithCounts = members.map((member) => ({
      ...member,
      totalProjects: projects.filter((project) =>
        String(project.userId) === String(member._id) ||
        project.assignedUserIds?.some((id) => String(id) === String(member._id)),
      ).length,
    }));
    return ok({ enabled: true, members: membersWithCounts });
  } catch (error) {
    return handleApiError(error);
  }
}
