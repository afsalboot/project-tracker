import { fail } from "@/lib/api-response";
import { hasWorkspacePermission } from "@/lib/workspace";
import Task from "@/models/Task";

export function canAccessOthersTasks(auth) {
  return hasWorkspacePermission(auth.workspace, auth.role, "tasks.view_others");
}

export function taskAccessFilter(auth) {
  return canAccessOthersTasks(auth) ? {} : { userId: auth.userId };
}

export async function requireTaskRecordAccess(auth, taskId) {
  const task = await Task.exists({
    _id: taskId,
    workspaceId: auth.workspaceId,
    ...taskAccessFilter(auth),
  });
  return task ? null : fail("Task not found.", 404);
}
