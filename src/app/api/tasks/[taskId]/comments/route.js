import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireTaskCreator, requireWorkspacePermission, validId } from "@/lib/server";
import { taskCommentSchema } from "@/lib/validations";
import Task from "@/models/Task";
import TaskComment from "@/models/TaskComment";
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
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId, ...taskAccessFilter(auth) }).select("projectId");
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const comments = await TaskComment.find({
      taskId,
      workspaceId: auth.workspaceId,
    })
      .populate("userId", "name")
      .sort({ createdAt: 1 })
      .lean();
    return ok({ comments, currentUserId: auth.userId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.view");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const input = taskCommentSchema.parse(await request.json());
    const comment = await TaskComment.create({
      ...input,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
    });
    await comment.populate("userId", "name");
    return ok({ comment }, "Comment added.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
