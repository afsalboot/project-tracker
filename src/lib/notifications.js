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

  const [mentions, assignmentActivities] = await Promise.all([
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
      action: "Project assignment added",
    })
      .populate("userId", "name username")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean(),
  ]);

  const assignmentProjectIds = new Set(
    assignmentActivities.map((item) => String(item.projectId?._id || item.projectId)),
  );
  const inferredAssignments = projects.filter((project) =>
    project.assignedUserIds?.some((id) => String(id) === String(auth.userId)) &&
    !assignmentProjectIds.has(String(project._id)),
  );

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
    ...assignmentActivities.map((item) => ({
      _id: `assignment-${item._id}`,
      type: "assignment",
      title: `${item.userId?.name || "A teammate"} assigned you`,
      message: item.projectId?.name || "Project",
      projectName: item.projectId?.name || "Project",
      href: `/projects/${item.projectId?._id || item.projectId}`,
      createdAt: item.createdAt,
    })),
    ...inferredAssignments.map((project) => ({
      _id: `assignment-current-${project._id}`,
      type: "assignment",
      title: `${project.userId?.name || "Project owner"} assigned you`,
      message: project.name,
      projectName: project.name,
      href: `/projects/${project._id}`,
      createdAt: project.createdAt,
    })),
  ]
    .filter((item) => (!clearedAt || new Date(item.createdAt) > new Date(clearedAt)) && !dismissed.has(item._id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}
