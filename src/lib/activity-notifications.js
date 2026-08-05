import Project from "@/models/Project";

export async function projectNotificationRecipients(
  projectId,
  actorUserId,
  { onlyUserIds = null, excludeUserIds = [] } = {},
) {
  const project = await Project.findById(projectId).select("userId assignedUserIds").lean();
  if (!project) return [];

  const excluded = new Set([String(actorUserId), ...excludeUserIds.map(String)]);
  const allowed = onlyUserIds ? new Set(onlyUserIds.map(String)) : null;
  const participants = [project.userId, ...(project.assignedUserIds || [])]
    .filter(Boolean)
    .map(String);

  return [...new Set(participants)].filter((userId) =>
    !excluded.has(userId) && (!allowed || allowed.has(userId)),
  );
}
