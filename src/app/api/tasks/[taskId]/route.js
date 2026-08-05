import { fail, handleApiError, ok } from "@/lib/api-response";
import { recalculateProgress } from "@/lib/progress";
import { cleanDates, requireApiUser, requireTaskCreator, requireWorkspacePermission, validId } from "@/lib/server";
import { taskSchema } from "@/lib/validations";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskComment from "@/models/TaskComment";
import { z } from "zod";
import { projectAccessFilter, requireProjectRecordAccess } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { activeChoice, completedTaskStatus, hasEnabledChoices } from "@/lib/customization";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

export const runtime = "nodejs";
const deleteConfirmationSchema = z.object({
  confirmation: z.string().trim().min(1).max(200),
});

export async function GET(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.view");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId, ...taskAccessFilter(auth) })
      .populate("userId", "name")
      .populate("projectId", "name clientName projectPlatform zohoProduct zohoProducts projectTypes")
      .lean();
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId?._id || task.projectId);
    if (accessDenied) return accessDenied;
    return ok({ task: { ...task, isCreator: String(task.userId?._id || task.userId) === String(auth.userId) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.edit");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const input = taskSchema.parse(await request.json());
    if (input.status !== task.status && hasEnabledChoices(auth.workspace, "taskStatuses") && !activeChoice(auth.workspace, "taskStatuses", input.status)) return fail("Select an enabled task status.", 422);
    if (input.environment !== task.environment && hasEnabledChoices(auth.workspace, "environments") && !activeChoice(auth.workspace, "environments", input.environment)) return fail("Select an enabled environment.", 422);
    if (
      task.parentTaskId &&
      input.projectId &&
      input.projectId !== String(task.projectId)
    ) {
      return fail("A subtask must stay in its main task's project.", 422);
    }
    if (input.projectId && input.projectId !== String(task.projectId)) {
      if (!validId(input.projectId)) return fail("Project not found.", 404);
      const target = await Project.findOne({ _id: input.projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
      if (!target) return fail("Project not found.", 404);
    }
    const previousProject = String(task.projectId);
    const previousStatus = task.status;
    const previousDueDate = task.dueDate?.toISOString() || null;
    const nextProject = input.projectId || previousProject;
    Object.assign(task, cleanDates(input, ["dueDate"]), { projectId: nextProject });
    task.completedDate =
      input.status === completedTaskStatus(auth.workspace) ? task.completedDate || new Date() : null;
    await task.save();
    const recalculations = [recalculateProgress(nextProject, auth.workspaceId)];
    if (previousProject !== nextProject) {
      recalculations.push(recalculateProgress(previousProject, auth.workspaceId));
      const subtasks = await Task.find({
        parentTaskId: task._id,
        workspaceId: auth.workspaceId,
      }).select("_id").lean();
      const relatedTaskIds = [task._id, ...subtasks.map((item) => item._id)];
      recalculations.push(
        Task.updateMany(
          { parentTaskId: task._id, workspaceId: auth.workspaceId },
          { $set: { projectId: nextProject } },
        ),
        TaskComment.updateMany(
          { taskId: { $in: relatedTaskIds }, workspaceId: auth.workspaceId },
          { $set: { projectId: nextProject } },
        ),
      );
    }
    await Promise.all(recalculations);
    const recipientUserIds = await projectNotificationRecipients(nextProject, auth.userId);
    if (previousStatus !== input.status) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId: nextProject,
        taskId,
        action: "Task status changed",
        previousValue: previousStatus,
        newValue: input.status,
      });
    }
    const nextDueDate = task.dueDate?.toISOString() || null;
    if (previousDueDate !== nextDueDate) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId: nextProject,
        taskId,
        action: "Task due date changed",
        previousValue: previousDueDate,
        newValue: nextDueDate,
      });
    }
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: nextProject,
      taskId,
      recipientUserIds,
      action: "Task updated",
    });
    return ok({ task }, "Task updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.delete");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const confirmation = deleteConfirmationSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!confirmation.success || confirmation.data.confirmation !== task.title) {
      return fail("Type the exact task name to confirm deletion.", 422);
    }
    const subtasks = await Task.find({
      parentTaskId: task._id,
      workspaceId: auth.workspaceId,
    }).select("_id").lean();
    const taskIds = [task._id, ...subtasks.map((item) => item._id)];
    const recipientUserIds = await projectNotificationRecipients(task.projectId, auth.userId);
    const deleted = await Task.deleteMany({
      _id: { $in: taskIds },
      workspaceId: auth.workspaceId,
    });
    if (!deleted.deletedCount) return fail("Task not found.", 404);
    await Promise.all([
      TaskComment.deleteMany({
        taskId: { $in: taskIds },
        workspaceId: auth.workspaceId,
      }),
      recalculateProgress(task.projectId, auth.workspaceId),
      Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId: task.projectId,
        taskId,
        recipientUserIds,
        action: "Task deleted",
        previousValue: task.title,
      }),
    ]);
    return ok(
      {},
      subtasks.length
        ? `Task and ${subtasks.length} subtasks deleted.`
        : "Task deleted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
