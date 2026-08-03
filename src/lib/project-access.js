import { fail } from "@/lib/api-response";
import Project from "@/models/Project";
import { hasWorkspacePermission } from "@/lib/workspace";
import mongoose from "mongoose";

export function canAccessAllProjects(auth) {
  return hasWorkspacePermission(auth.workspace, auth.role, "projects.view_others");
}

export function projectAccessFilter(auth) {
  if (canAccessAllProjects(auth)) return {};
  // Mongoose casts find queries, but project lists use an aggregation pipeline.
  // Aggregations do not cast session string IDs to ObjectIds automatically.
  const userId = mongoose.Types.ObjectId.isValid(auth.userId)
    ? new mongoose.Types.ObjectId(auth.userId)
    : auth.userId;
  return {
    $and: [
      {
        $or: [
          { userId },
          { assignedUserIds: userId },
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
