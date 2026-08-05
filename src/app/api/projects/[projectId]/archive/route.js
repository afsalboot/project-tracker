import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import { projectAccessFilter } from "@/lib/project-access";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

export const runtime = "nodejs";

export async function PATCH(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.archive");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!project) return fail("Project not found.", 404);
    project.isArchived = !project.isArchived;
    await project.save();
    const recipientUserIds = await projectNotificationRecipients(projectId, auth.userId);
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      recipientUserIds,
      action: project.isArchived ? "Project archived" : "Project restored",
    });
    return ok({ project }, project.isArchived ? "Project archived." : "Project restored.");
  } catch (error) {
    return handleApiError(error);
  }
}
