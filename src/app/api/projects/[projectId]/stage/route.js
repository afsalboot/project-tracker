import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import { stageSchema } from "@/lib/validations";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import { projectAccessFilter } from "@/lib/project-access";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.edit");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const { stage } = stageSchema.parse(await request.json());
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!project) return fail("Project not found.", 404);
    const previous = project.stage;
    project.stage = stage;
    if (stage !== "Completed") project.completedDate = null;
    await project.save();
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      action: "Project stage changed",
      previousValue: previous,
      newValue: stage,
    });
    return ok({ project }, "Project stage updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
