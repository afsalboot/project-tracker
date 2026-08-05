import Activity from "@/models/Activity";
import Project from "@/models/Project";
import TaskComment from "@/models/TaskComment";
import { projectAccessFilter } from "@/lib/project-access";

export async function getUserNotifications(auth, { limit = 60, clearedAt = null, dismissedIds = [] } = {}) {
  const queryLimit = Math.min(200, limit + dismissedIds.length);
  const projects = await Project.find({
    workspaceId: auth.workspaceId,
    ...projectAccessFilter(auth),
  })
    .select("name userId assignedUserIds createdAt")
    .populate("userId", "name")
    .lean();
  const projectIds = projects.map((project) => project._id);

  const [mentions, activities] = await Promise.all([
    TaskComment.find({
      workspaceId: auth.workspaceId,
      projectId: { $in: projectIds },
      mentionedUserIds: auth.userId,
    })
      .populate("userId", "name username")
      .populate("projectId", "name")
      .populate("taskId", "title")
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean(),
    Activity.find({
      workspaceId: auth.workspaceId,
      projectId: { $in: projectIds },
      recipientUserIds: auth.userId,
      userId: { $ne: auth.userId },
    })
      .populate("userId", "name username")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean(),
  ]);

  const dismissed = new Set(dismissedIds);
  return [
    ...mentions.map((comment) => ({
      _id: `mention-${comment._id}`,
      type: "mention",
      title: `${comment.userId?.name || "A teammate"} mentioned you`,
      message: comment.body,
      projectName: comment.projectId?.name || "Project",
      taskName: comment.taskId?.title || "Task",
      href: `/projects/${comment.projectId?._id || comment.projectId}`,
      createdAt: comment.createdAt,
    })),
    ...activities.map((item) => ({
      _id: `${item.action === "Project assignment added" ? "assignment" : "update"}-${item._id}`,
      type: item.action === "Project assignment added" ? "assignment" : "update",
      title: item.action === "Project assignment added"
        ? `${item.userId?.name || "A teammate"} assigned you`
        : `${item.userId?.name || "A teammate"} updated ${item.taskId ? "a task" : "the project"}`,
      message: item.action,
      projectName: item.projectId?.name || "Project",
      href: `/projects/${item.projectId?._id || item.projectId}`,
      createdAt: item.createdAt,
    })),
  ]
    .filter((item) => (!clearedAt || new Date(item.createdAt) > new Date(clearedAt)) && !dismissed.has(item._id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}
