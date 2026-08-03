import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import { projectAccessFilter } from "@/lib/project-access";
import { activeChoice, completedProjectStage } from "@/lib/customization";

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
    if (!activeChoice(auth.workspace, "projectStages", completedStage)) {
      return fail("Enable the completed project stage in Settings before completing this project.", 422);
    }
    if (project.stage === completedStage) {
      return ok({ project }, "Project is already completed.");
    }
    const previous = project.stage;
    project.stage = completedStage;
    project.completedDate = project.completedDate || new Date();
    await project.save();
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      action: "Project marked as completed",
      previousValue: previous,
      newValue: completedStage,
    });
    return ok({ project }, "Project marked as completed.");
  } catch (error) {
    return handleApiError(error);
  }
}
