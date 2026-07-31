import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import mongoose from "mongoose";
import { projectAccessFilter } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const canViewDashboard = hasWorkspacePermission(
      auth.workspace,
      auth.role,
      "dashboard.view",
    );
    if (!canViewDashboard) {
      return fail("You do not have permission to view analytics.", 403);
    }
    const workspaceId = auth.workspaceId;
    const mongoWorkspaceId = new mongoose.Types.ObjectId(workspaceId);
    const accessibleProjectIds = await Project.find({
      workspaceId,
      ...projectAccessFilter(auth),
    }).distinct("_id");
    const projectScope = { _id: { $in: accessibleProjectIds } };
    const taskScope = { projectId: { $in: accessibleProjectIds }, ...taskAccessFilter(auth) };
    const now = new Date();
    const today = { $gte: startOfDay(now), $lte: endOfDay(now) };
    const week = {
      $gte: startOfWeek(now, { weekStartsOn: 1 }),
      $lte: endOfWeek(now, { weekStartsOn: 1 }),
    };
    const month = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
    const activeProjectQuery = {
      workspaceId,
      ...projectScope,
      isArchived: false,
      stage: { $nin: ["Completed", "Cancelled"] },
    };
    const [
      activeProjects,
      completedProjects,
      tasksDueToday,
      overdueTasks,
      blockedTasks,
      projectsInTesting,
      projectsReadyForDeployment,
      completedToday,
      completedThisWeek,
      completedThisMonth,
      recentProjects,
      todayTasks,
      upcomingProjectDeadlines,
      upcomingTaskDeadlines,
      taskStatus,
      projectStage,
      projectProduct,
      projectType,
      timeTotals,
      teamAnalytics,
    ] = await Promise.all([
      Project.countDocuments(activeProjectQuery),
      Project.countDocuments({ workspaceId, ...projectScope, stage: "Completed" }),
      Task.countDocuments({ workspaceId, ...taskScope, status: { $ne: "Completed" }, dueDate: today }),
      Task.countDocuments({ workspaceId, ...taskScope, status: { $ne: "Completed" }, dueDate: { $lt: startOfDay(now) } }),
      Task.countDocuments({ workspaceId, ...taskScope, status: "Blocked" }),
      Project.countDocuments({ workspaceId, ...projectScope, stage: { $in: ["Internal Testing", "Client Testing"] }, isArchived: false }),
      Project.countDocuments({ workspaceId, ...projectScope, stage: "Ready for Deployment", isArchived: false }),
      Task.countDocuments({ workspaceId, ...taskScope, status: "Completed", completedDate: today }),
      Task.countDocuments({ workspaceId, ...taskScope, status: "Completed", completedDate: week }),
      Task.countDocuments({ workspaceId, ...taskScope, status: "Completed", completedDate: month }),
      Project.find({ workspaceId, ...projectScope, isArchived: false }).sort({ updatedAt: -1 }).limit(6).lean(),
      Task.find({ workspaceId, ...taskScope, status: { $ne: "Completed" }, dueDate: today })
        .populate("projectId", "name")
        .sort({ priority: -1, dueDate: 1 })
        .limit(12)
        .lean(),
      Project.find({
        ...activeProjectQuery,
        dueDate: { $gte: startOfDay(now), $lte: endOfDay(addDays(now, 14)) },
      }).sort({ dueDate: 1 }).limit(8).lean(),
      Task.find({
        workspaceId,
        ...taskScope,
        status: { $ne: "Completed" },
        dueDate: { $gte: startOfDay(now), $lte: endOfDay(addDays(now, 14)) },
      }).populate("projectId", "name").sort({ dueDate: 1 }).limit(8).lean(),
      Task.aggregate([{ $match: { workspaceId: mongoWorkspaceId, ...taskScope } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } }, { $group: { _id: "$zohoProduct", count: { $sum: 1 } } }]),
      Project.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } },
        { $unwind: { path: "$projectTypes", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$projectTypes", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, ...taskScope } },
        { $group: { _id: null, estimated: { $sum: "$estimatedMinutes" }, actual: { $sum: "$actualMinutes" } } },
      ]),
      auth.workspace.type === "personal" ||
      !hasWorkspacePermission(auth.workspace, auth.role, "members.view")
        ? Promise.resolve(null)
        : buildTeamAnalytics(mongoWorkspaceId),
    ]);
    return ok({
      activeProjects,
      completedProjects,
      tasksDueToday,
      overdueTasks,
      blockedTasks,
      projectsInTesting,
      projectsReadyForDeployment,
      completedToday,
      completedThisWeek,
      completedThisMonth,
      recentProjects,
      todayTasks: todayTasks.map((task) => ({
        ...task,
        isCreator: String(task.userId) === String(auth.userId),
      })),
      upcomingDeadlines: [
        ...upcomingProjectDeadlines.map((item) => ({ ...item, kind: "Project" })),
        ...upcomingTaskDeadlines.map((item) => ({ ...item, kind: "Task" })),
      ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 10),
      reports: {
        taskStatus,
        projectStage,
        projectProduct,
        projectType,
        timeTotals: timeTotals[0] || { estimated: 0, actual: 0 },
        projectsCompletedThisMonth: await Project.countDocuments({ workspaceId, ...projectScope, completedDate: month }),
      },
      workspaceMode: auth.workspace.type,
      teamAnalytics,
      workspaceRoles: auth.workspace.roles || [],
      allocationRoleKeys: auth.workspace.allocationRoleKeys?.length
        ? auth.workspace.allocationRoleKeys
        : ["owner", "admin"],
      highlightedRoleKeys: auth.workspace.highlightedRoleKeys?.length
        ? auth.workspace.highlightedRoleKeys
        : ["owner", "admin"],
      canConfigureAnalytics: hasWorkspacePermission(auth.workspace, auth.role, "team.display.manage"),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function buildTeamAnalytics(workspaceId) {
  const [projectProgress, userContribution] = await Promise.all([
    Project.aggregate([
      { $match: { workspaceId, isArchived: false } },
      {
        $lookup: {
          from: "tasks",
          let: { projectId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectId", "$$projectId"] },
                    { $eq: ["$workspaceId", workspaceId] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
              },
            },
          ],
          as: "taskStats",
        },
      },
      {
        $project: {
          _id: 0,
          name: 1,
          progress: 1,
          totalTasks: {
            $ifNull: [{ $arrayElemAt: ["$taskStats.total", 0] }, 0],
          },
          completedTasks: {
            $ifNull: [{ $arrayElemAt: ["$taskStats.completed", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          remainingTasks: { $subtract: ["$totalTasks", "$completedTasks"] },
        },
      },
      { $sort: { totalTasks: -1, name: 1 } },
      { $limit: 10 },
    ]),
    User.aggregate([
      { $match: { workspaceId } },
      {
        $lookup: {
          from: "projects",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$userId", "$$userId"] },
                        { $in: ["$$userId", { $ifNull: ["$assignedUserIds", []] }] },
                      ],
                    },
                    { $eq: ["$workspaceId", workspaceId] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$stage", "Completed"] }, 1, 0] },
                },
              },
            },
          ],
          as: "projectStats",
        },
      },
      {
        $lookup: {
          from: "tasks",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$workspaceId", workspaceId] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
              },
            },
          ],
          as: "taskStats",
        },
      },
      {
        $project: {
          _id: 0,
          name: 1,
          role: 1,
          projects: {
            $ifNull: [{ $arrayElemAt: ["$projectStats.total", 0] }, 0],
          },
          completedProjects: {
            $ifNull: [{ $arrayElemAt: ["$projectStats.completed", 0] }, 0],
          },
          tasks: {
            $ifNull: [{ $arrayElemAt: ["$taskStats.total", 0] }, 0],
          },
          completedTasks: {
            $ifNull: [{ $arrayElemAt: ["$taskStats.completed", 0] }, 0],
          },
        },
      },
      { $sort: { projects: -1, tasks: -1, name: 1 } },
    ]),
  ]);

  return { projectProgress, userContribution };
}
