import { fail } from "@/lib/api-response";
import Project from "@/models/Project";
import { hasWorkspacePermission } from "@/lib/workspace";

export function canAccessAllProjects(auth) {
  return hasWorkspacePermission(auth.workspace, auth.role, "projects.view_others");
}

export function projectAccessFilter(auth) {
  if (canAccessAllProjects(auth)) return {};
  return {
    $and: [
      {
        $or: [
          { userId: auth.userId },
          { assignedUserIds: auth.userId },
        ],
      },
    ],
  };
}

export async function requireProjectRecordAccess(auth, projectId) {
  const project = await Project.exists({
    _id: projectId,
    workspaceId: auth.workspaceId,
    ...projectAccessFilter(auth),
  });
  return project ? null : fail("Project not found.", 404);
}
