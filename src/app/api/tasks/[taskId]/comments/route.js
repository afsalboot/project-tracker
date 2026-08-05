import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import { taskCommentSchema } from "@/lib/validations";
import Task from "@/models/Task";
import TaskComment from "@/models/TaskComment";
import User from "@/models/User";
import { requireProjectRecordAccess } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { resolveMentionedUserIds } from "@/lib/mentions";
import Activity from "@/models/Activity";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

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
    const [comments, mentionMembers] = await Promise.all([
      TaskComment.find({
        taskId,
        workspaceId: auth.workspaceId,
      })
        .populate("userId", "name")
        .sort({ createdAt: 1 })
        .lean(),
      User.find({ workspaceId: auth.workspaceId, status: { $ne: "suspended" } })
        .select("name username email role")
        .sort({ name: 1 })
        .lean(),
    ]);
    return ok({ comments, mentionMembers, currentUserId: auth.userId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.comment");
    if (denied) return denied;
    const { taskId } = await params;
    if (!validId(taskId)) return fail("Task not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId, ...taskAccessFilter(auth) });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const input = taskCommentSchema.parse(await request.json());
    const mentionedUserIds = await resolveMentionedUserIds(auth.workspaceId, input.body, auth.userId);
    const comment = await TaskComment.create({
      ...input,
      mentionedUserIds,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
    });
    await comment.populate("userId", "name");
    const recipientUserIds = await projectNotificationRecipients(task.projectId, auth.userId, {
      excludeUserIds: mentionedUserIds,
    });
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
      recipientUserIds,
      action: "Task comment added",
      metadata: { commentId: comment._id },
    });
    return ok({ comment }, "Comment added.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
