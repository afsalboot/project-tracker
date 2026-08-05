import { fail, handleApiError, ok } from "@/lib/api-response";
import { recalculateProgress } from "@/lib/progress";
import { requireApiUser, requireTaskCreator, requireWorkspacePermission, validId } from "@/lib/server";
import { statusSchema } from "@/lib/validations";
import Activity from "@/models/Activity";
import Task from "@/models/Task";
import { requireProjectRecordAccess } from "@/lib/project-access";
import { activeChoice, completedTaskStatus } from "@/lib/customization";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.edit");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const { status } = statusSchema.parse(await request.json());
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    if (status !== task.status && !activeChoice(auth.workspace, "taskStatuses", status)) return fail("Select an enabled task status.", 422);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const previous = task.status;
    task.status = status;
    task.completedDate = status === completedTaskStatus(auth.workspace) ? task.completedDate || new Date() : null;
    await task.save();
    if (previous !== status) {
      const recipientUserIds = await projectNotificationRecipients(task.projectId, auth.userId);
      await Promise.all([
        recalculateProgress(task.projectId, auth.workspaceId),
        Activity.create({
          userId: auth.userId,
          workspaceId: auth.workspaceId,
          projectId: task.projectId,
          taskId,
          recipientUserIds,
          action: "Task status changed",
          previousValue: previous,
          newValue: status,
        }),
      ]);
    }
    return ok({ task }, "Task status updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
