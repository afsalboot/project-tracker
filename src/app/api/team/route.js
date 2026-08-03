import mongoose from "mongoose";
import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { projectAccessFilter } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { completedTaskStatus } from "@/lib/customization";

export const runtime = "nodejs";

const preferencesSchema = z.object({
  highlightedRoleKeys: z.array(z.string().trim().min(1).max(64)).max(8),
  allocationRoleKeys: z.array(z.string().trim().min(1).max(64)).max(20),
});

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Team is available in Organization and Team workspaces.", 404);
    if (!hasWorkspacePermission(auth.workspace, auth.role, "members.view")) return fail("You do not have permission to view the team.", 403);

    const workspaceId = new mongoose.Types.ObjectId(auth.workspaceId);
    const completedStatus = completedTaskStatus(auth.workspace);
    const [members, allProjects] = await Promise.all([
      User.find({ workspaceId }).select("name email role createdAt").sort({ name: 1 }).lean(),
      Project.find({ workspaceId, ...projectAccessFilter(auth) })
        .select("name stage progress priority userId assignedUserIds dueDate updatedAt isArchived")
        .sort({ updatedAt: -1 })
        .lean(),
    ]);
    const projects = allProjects.filter((project) => !project.isArchived);
    const taskStats = await Task.aggregate([
        { $match: { workspaceId } },
        { $match: { projectId: { $in: projects.map((project) => project._id) }, ...taskAccessFilter(auth) } },
        {
          $group: {
            _id: "$projectId",
            tasks: { $sum: { $cond: [{ $eq: ["$parentTaskId", null] }, 1, 0] } },
            completedTasks: { $sum: { $cond: [{ $and: [{ $eq: ["$parentTaskId", null] }, { $eq: ["$status", completedStatus] }] }, 1, 0] } },
            subtasks: { $sum: { $cond: [{ $ne: ["$parentTaskId", null] }, 1, 0] } },
            completedSubtasks: { $sum: { $cond: [{ $and: [{ $ne: ["$parentTaskId", null] }, { $eq: ["$status", completedStatus] }] }, 1, 0] } },
          },
        },
      ]);

    const stats = new Map(taskStats.map((item) => [String(item._id), item]));
    const projectRecords = projects.map((project) => ({
      ...project,
      taskStats: stats.get(String(project._id)) || { tasks: 0, completedTasks: 0, subtasks: 0, completedSubtasks: 0 },
    }));
    const people = members.map((member) => ({
      ...member,
      totalProjects: allProjects.filter((project) =>
        String(project.userId) === String(member._id) ||
        project.assignedUserIds?.some((id) => String(id) === String(member._id)),
      ).length,
      projects: projectRecords.filter((project) =>
        String(project.userId) === String(member._id) ||
        project.assignedUserIds?.some((id) => String(id) === String(member._id)),
      ),
    }));

    return ok({
      members: people,
      projects: projectRecords,
      roles: auth.workspace.roles || [],
      highlightedRoleKeys: auth.workspace.highlightedRoleKeys?.length ? auth.workspace.highlightedRoleKeys : ["owner", "admin"],
      allocationRoleKeys: auth.workspace.allocationRoleKeys?.length ? auth.workspace.allocationRoleKeys : ["owner", "admin"],
      currentUserId: auth.userId,
      canManage: hasWorkspacePermission(auth.workspace, auth.role, "members.manage"),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Team settings are unavailable in Personal workspaces.", 404);
    if (!hasWorkspacePermission(auth.workspace, auth.role, "team.display.manage")) return fail("You do not have permission to change team display settings.", 403);
    const input = preferencesSchema.parse(await request.json());
    const roleKeys = new Set((auth.workspace.roles || []).map((role) => role.key));
    if ([...input.highlightedRoleKeys, ...input.allocationRoleKeys].some((key) => !roleKeys.has(key))) {
      return fail("Select roles saved in this workspace.", 422);
    }
    const workspace = await Workspace.findByIdAndUpdate(
      auth.workspaceId,
      { $set: input },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return ok({
      highlightedRoleKeys: workspace.highlightedRoleKeys,
      allocationRoleKeys: workspace.allocationRoleKeys,
    }, "Team display settings updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
