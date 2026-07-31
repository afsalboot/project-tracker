import { fail, handleApiError, ok } from "@/lib/api-response";
import { cleanDates, requireApiUser, requireTaskCreator, requireWorkspacePermission, validId } from "@/lib/server";
import { subtaskSchema } from "@/lib/validations";
import Activity from "@/models/Activity";
import Task from "@/models/Task";
import { requireProjectRecordAccess } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.view");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const parent = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId, ...taskAccessFilter(auth) }).lean();
    if (!parent) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, parent.projectId);
    if (accessDenied) return accessDenied;
    const rootTaskId = parent.parentTaskId || parent._id;
    const subtasks = await Task.find({
      parentTaskId: rootTaskId,
      workspaceId: auth.workspaceId,
      ...taskAccessFilter(auth),
    }).populate("userId", "name").sort({ sortOrder: 1, createdAt: 1 }).lean();
    return ok({ rootTaskId, subtasks: subtasks.map((item) => ({ ...item, isCreator: String(item.userId?._id || item.userId) === String(auth.userId) })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.create");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const parent = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!parent) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, parent.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, parent);
    if (creatorDenied) return creatorDenied;
    if (parent.parentTaskId) {
      return fail("Add subtasks from the main task.", 409);
    }
    const input = subtaskSchema.parse(await request.json());
    const subtask = await Task.create({
      ...cleanDates(input, ["dueDate"]),
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: parent.projectId,
      parentTaskId: parent._id,
      environment: parent.environment,
      completedDate: input.status === "Completed" ? new Date() : null,
      sortOrder: await Task.countDocuments({
        workspaceId: auth.workspaceId,
        parentTaskId: parent._id,
      }),
    });
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: parent.projectId,
      taskId: parent._id,
      action: "Subtask created",
      newValue: subtask.title,
    });
    return ok({ subtask }, "Subtask added.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
