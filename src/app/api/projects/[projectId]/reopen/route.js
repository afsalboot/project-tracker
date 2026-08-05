import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import { projectAccessFilter } from "@/lib/project-access";
import { activeChoice, completedProjectStage, workspaceCustomization } from "@/lib/customization";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

export const runtime = "nodejs";

export async function PATCH(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.edit");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!project) return fail("Project not found.", 404);

    const completedStage = completedProjectStage(auth.workspace);
    if (project.stage !== completedStage) return ok({ project }, "Project is already active.");

    const completion = await Activity.findOne({
      workspaceId: auth.workspaceId,
      projectId,
      action: "Project marked as completed",
      newValue: completedStage,
    }).sort({ createdAt: -1 }).lean();
    const previousStage = typeof completion?.previousValue === "string" ? completion.previousValue : "";
    const fallbackStage = workspaceCustomization(auth.workspace).projectStages.find(
      (item) => item.enabled && item.label !== completedStage,
    )?.label;
    const reopenedStage = previousStage !== completedStage && activeChoice(auth.workspace, "projectStages", previousStage)
      ? previousStage
      : fallbackStage;
    if (!reopenedStage) return fail("Enable at least one non-completed project stage before reopening this project.", 422);

    project.stage = reopenedStage;
    project.completedDate = null;
    await project.save();
    const recipientUserIds = await projectNotificationRecipients(projectId, auth.userId);
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      recipientUserIds,
      action: "Project reopened",
      previousValue: completedStage,
      newValue: reopenedStage,
    });
    return ok({ project }, `Project reopened in ${reopenedStage}.`);
  } catch (error) {
    return handleApiError(error);
  }
}
