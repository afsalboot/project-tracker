import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, requireTaskCreator, validId } from "@/lib/server";
import { taskCommentSchema } from "@/lib/validations";
import TaskComment from "@/models/TaskComment";
import Task from "@/models/Task";
import { requireProjectRecordAccess } from "@/lib/project-access";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const { taskId, commentId } = await params;
    if (!validId(taskId) || !validId(commentId)) return fail("Comment not found.", 404);
    const comment = await TaskComment.findOne({
      _id: commentId,
      taskId,
      workspaceId: auth.workspaceId,
    });
    if (!comment) return fail("Comment not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const isAuthor = String(comment.userId) === String(auth.userId);
    if (!isAuthor) {
      return fail("You can only edit your own comments.", 403);
    }
    const input = taskCommentSchema.parse(await request.json());
    comment.body = input.body;
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate("userId", "name");
    return ok({ comment }, "Comment updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const { taskId, commentId } = await params;
    if (!validId(taskId) || !validId(commentId)) return fail("Comment not found.", 404);
    const comment = await TaskComment.findOne({
      _id: commentId,
      taskId,
      workspaceId: auth.workspaceId,
    });
    if (!comment) return fail("Comment not found.", 404);
    const task = await Task.findOne({ _id: taskId, workspaceId: auth.workspaceId });
    if (!task) return fail("Task not found.", 404);
    const accessDenied = await requireProjectRecordAccess(auth, task.projectId);
    if (accessDenied) return accessDenied;
    const creatorDenied = requireTaskCreator(auth, task);
    if (creatorDenied) return creatorDenied;
    const isAuthor = String(comment.userId) === String(auth.userId);
    if (!isAuthor) {
      return fail("You can only delete your own comments.", 403);
    }
    await TaskComment.deleteOne({
      _id: comment._id,
      taskId,
      workspaceId: auth.workspaceId,
    });
    return ok({}, "Comment deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
