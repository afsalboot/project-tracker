import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import Activity from "@/models/Activity";
import TaskComment from "@/models/TaskComment";
import mongoose from "mongoose";
import { projectAccessFilter } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { blockedTaskStatus, completedProjectStage, completedTaskStatus } from "@/lib/customization";
import { semanticLabel } from "@/constants/customization";

export const runtime = "nodejs";

export async function GET(request) {
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
    const searchParams = new URL(request.url).searchParams;
    const selectedProjectId = searchParams.get("projectId") || "";
    const range = ["week", "month", "six-months", "year"].includes(searchParams.get("range")) ? searchParams.get("range") : "month";
    const canViewAllProjects = hasWorkspacePermission(auth.workspace, auth.role, "projects.view_others");
    const canViewAllTasks = hasWorkspacePermission(auth.workspace, auth.role, "tasks.view_others");
    const hasFullVisibility = canViewAllProjects && canViewAllTasks;
    const completedStatus = completedTaskStatus(auth.workspace);
    const blockedStatus = blockedTaskStatus(auth.workspace);
    const completedStage = completedProjectStage(auth.workspace);
    const cancelledStage = semanticLabel(auth.workspace, "projectStages", "cancelled", "Cancelled");
    const testingStages = [semanticLabel(auth.workspace, "projectStages", "internal-testing", "Internal Testing"), semanticLabel(auth.workspace, "projectStages", "client-testing", "Client Testing")];
    const readyStage = semanticLabel(auth.workspace, "projectStages", "ready-for-deployment", "Ready for Deployment");
    const mongoWorkspaceId = new mongoose.Types.ObjectId(workspaceId);
    const [allAccessibleProjectIds, projectOptions] = await Promise.all([
      Project.find({ workspaceId, ...projectAccessFilter(auth) }).distinct("_id"),
      Project.find({ workspaceId, ...projectAccessFilter(auth), isArchived: false }).select("name").sort({ name: 1 }).lean(),
    ]);
    const selectedProject = selectedProjectId
      ? allAccessibleProjectIds.find((id) => String(id) === selectedProjectId)
      : null;
    if (selectedProjectId && !selectedProject) return fail("Project not found.", 404);
    const accessibleProjectIds = selectedProject ? [selectedProject] : allAccessibleProjectIds;
    const forYouProjects = await Project.find({
      workspaceId,
      _id: { $in: accessibleProjectIds },
      $or: [{ userId: auth.userId }, { assignedUserIds: auth.userId }],
    }).select("name userId assignedUserIds createdAt updatedAt").populate("userId", "name").lean();
    const forYouProjectIds = forYouProjects.map((project) => project._id);
    const projectScope = { _id: { $in: accessibleProjectIds } };
    const taskScope = { projectId: { $in: accessibleProjectIds }, ...taskAccessFilter(auth) };
    const mongoTaskScope = {
      projectId: { $in: accessibleProjectIds },
      ...(canViewAllTasks ? {} : { userId: new mongoose.Types.ObjectId(auth.userId) }),
    };
    const now = new Date();
    const performanceWindow = dashboardPerformanceWindow(range, now);
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
      stage: { $nin: [completedStage, cancelledStage] },
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
      Project.countDocuments({ workspaceId, ...projectScope, stage: completedStage }),
      Task.countDocuments({ workspaceId, ...taskScope, status: { $ne: completedStatus }, dueDate: today }),
      Task.countDocuments({ workspaceId, ...taskScope, status: { $ne: completedStatus }, dueDate: { $lt: startOfDay(now) } }),
      Task.countDocuments({ workspaceId, ...taskScope, status: blockedStatus }),
      Project.countDocuments({ workspaceId, ...projectScope, stage: { $in: testingStages }, isArchived: false }),
      Project.countDocuments({ workspaceId, ...projectScope, stage: readyStage, isArchived: false }),
      Task.countDocuments({ workspaceId, ...taskScope, status: completedStatus, completedDate: today }),
      Task.countDocuments({ workspaceId, ...taskScope, status: completedStatus, completedDate: week }),
      Task.countDocuments({ workspaceId, ...taskScope, status: completedStatus, completedDate: month }),
      Project.find({ workspaceId, ...projectScope, isArchived: false }).populate("userId", "name").sort({ updatedAt: -1 }).limit(8).lean(),
      Task.find({ workspaceId, ...taskScope, status: { $ne: completedStatus }, dueDate: today })
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
        status: { $ne: completedStatus },
        dueDate: { $gte: startOfDay(now), $lte: endOfDay(addDays(now, 14)) },
      }).populate("projectId", "name").sort({ dueDate: 1 }).limit(8).lean(),
      Task.aggregate([{ $match: { workspaceId: mongoWorkspaceId, ...mongoTaskScope } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
      Project.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } },
        { $project: { platforms: { $cond: [{ $gt: [{ $size: { $ifNull: ["$zohoProducts", []] } }, 0] }, "$zohoProducts", { $cond: [{ $and: [{ $ne: ["$zohoProduct", ""] }, { $ne: ["$zohoProduct", null] }] }, ["$zohoProduct"], []] }] } } },
        { $unwind: { path: "$platforms", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$platforms", count: { $sum: 1 } } },
      ]),
      Project.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds } } },
        { $unwind: { path: "$projectTypes", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$projectTypes", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, ...mongoTaskScope } },
        { $group: { _id: null, estimated: { $sum: "$estimatedMinutes" }, actual: { $sum: "$actualMinutes" } } },
      ]),
      auth.workspace.type === "personal" ||
      !hasWorkspacePermission(auth.workspace, auth.role, "members.view") ||
      !hasFullVisibility
        ? Promise.resolve(null)
        : buildTeamAnalytics(mongoWorkspaceId, completedStatus, completedStage, accessibleProjectIds),
    ]);

    const [currentUser, openTasks, dashboardTasks, attentionTasks, recentActivity, completedTaskTrend, completedProjectTrend, mentions, assignmentActivities, relevantUpdates] = await Promise.all([
      User.findById(auth.userId).select("name").lean(),
      Task.countDocuments({ workspaceId, ...taskScope, parentTaskId: null, status: { $ne: completedStatus } }),
      Task.find({ workspaceId, ...taskScope, parentTaskId: null })
        .populate("projectId", "name")
        .populate("userId", "name")
        .sort({ dueDate: 1, updatedAt: -1 })
        .limit(40)
        .lean(),
      Task.find({
        workspaceId,
        ...taskScope,
        parentTaskId: null,
        status: { $ne: completedStatus },
        $or: [{ status: blockedStatus }, { dueDate: { $lt: startOfDay(now) } }],
      })
        .populate("projectId", "name progress dueDate stage")
        .sort({ dueDate: 1 })
        .limit(40)
        .lean(),
      Activity.find({
        workspaceId,
        projectId: { $in: accessibleProjectIds },
        ...(hasFullVisibility ? {} : { userId: auth.userId }),
      })
        .populate("userId", "name")
        .populate("projectId", "name")
        .populate("taskId", "title")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Task.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, ...mongoTaskScope, status: completedStatus, completedDate: { $gte: performanceWindow.start, $lte: performanceWindow.end } } },
        { $group: { _id: { $dateToString: { format: performanceWindow.mongoFormat, date: "$completedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Project.aggregate([
        { $match: { workspaceId: mongoWorkspaceId, _id: { $in: accessibleProjectIds }, stage: completedStage, completedDate: { $gte: performanceWindow.start, $lte: performanceWindow.end } } },
        { $group: { _id: { $dateToString: { format: performanceWindow.mongoFormat, date: "$completedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TaskComment.find({
        workspaceId,
        projectId: { $in: accessibleProjectIds },
        mentionedUserIds: auth.userId,
      })
        .populate("userId", "name")
        .populate("projectId", "name")
        .populate("taskId", "title")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Activity.find({
        workspaceId,
        projectId: { $in: accessibleProjectIds },
        recipientUserIds: auth.userId,
        userId: { $ne: auth.userId },
        action: "Project assignment added",
      })
        .populate("userId", "name")
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Activity.find({
        workspaceId,
        projectId: { $in: forYouProjectIds },
        userId: { $ne: auth.userId },
        action: { $nin: ["Project assignment added", "Project created"] },
      })
        .populate("userId", "name")
        .populate("projectId", "name")
        .populate("taskId", "title")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const forYouUpdates = [
      ...mentions.map((comment) => ({
        _id: `mention-${comment._id}`,
        type: "mention",
        actorName: comment.userId?.name || "A teammate",
        title: `${comment.userId?.name || "A teammate"} mentioned you`,
        message: `“${comment.body.length > 120 ? `${comment.body.slice(0, 117)}…` : comment.body}”`,
        projectName: comment.projectId?.name || "Project",
        taskName: comment.taskId?.title || "Task",
        href: `/projects/${comment.projectId?._id || comment.projectId}`,
        createdAt: comment.createdAt,
      })),
      ...assignmentActivities.map((item) => ({
        _id: `assignment-${item._id}`,
        type: "assignment",
        actorName: item.userId?.name || "A teammate",
        title: `${item.userId?.name || "A teammate"} assigned you`,
        message: item.projectId?.name || "Project",
        projectName: item.projectId?.name || "Project",
        href: `/projects/${item.projectId?._id || item.projectId}`,
        createdAt: item.createdAt,
      })),
      ...relevantUpdates.map((item) => ({
        _id: `update-${item._id}`,
        type: "update",
        actorName: item.userId?.name || "A teammate",
        title: `${item.userId?.name || "A teammate"} ${String(item.action || "updated work").toLowerCase()}`,
        message: item.taskId?.title || item.projectId?.name || "Project update",
        projectName: item.projectId?.name || "Project",
        href: `/projects/${item.projectId?._id || item.projectId}`,
        createdAt: item.createdAt,
        previousValue: item.previousValue,
        newValue: item.newValue,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

    const completedTasksByPeriod = new Map(completedTaskTrend.map((item) => [item._id, item.count]));
    const completedProjectsByPeriod = new Map(completedProjectTrend.map((item) => [item._id, item.count]));
    const performanceTrend = performanceWindow.slots.map((slot) => ({
      label: slot.label,
      completedTasks: completedTasksByPeriod.get(slot.key) || 0,
      completedProjects: completedProjectsByPeriod.get(slot.key) || 0,
    }));

    const attentionByProject = new Map();
    for (const task of attentionTasks) {
      if (!task.projectId?._id) continue;
      const key = String(task.projectId._id);
      const item = attentionByProject.get(key) || {
        _id: task.projectId._id,
        name: task.projectId.name,
        progress: task.projectId.progress || 0,
        dueDate: task.projectId.dueDate,
        stage: task.projectId.stage,
        overdueTasks: 0,
        blockedTasks: 0,
      };
      if (task.dueDate && new Date(task.dueDate) < startOfDay(now)) item.overdueTasks += 1;
      if (task.status === blockedStatus) item.blockedTasks += 1;
      attentionByProject.set(key, item);
    }
    for (const project of upcomingProjectDeadlines) {
      if (!project.dueDate || new Date(project.dueDate) > endOfDay(addDays(now, 3))) continue;
      const key = String(project._id);
      const item = attentionByProject.get(key) || {
        _id: project._id,
        name: project.name,
        progress: project.progress || 0,
        dueDate: project.dueDate,
        stage: project.stage,
        overdueTasks: 0,
        blockedTasks: 0,
      };
      item.deadlineSoon = true;
      attentionByProject.set(key, item);
    }
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
      completedInRange: performanceTrend.reduce((sum, item) => sum + item.completedTasks, 0),
      performanceTrend,
      range,
      rangeLabel: performanceWindow.label,
      selectedProjectId,
      projectOptions,
      openTasks,
      currentUser: { name: currentUser?.name || "there", role: auth.role },
      visibilityScope: hasFullVisibility ? "workspace" : "restricted",
      permissions: {
        canCreateProjects: hasWorkspacePermission(auth.workspace, auth.role, "projects.create"),
        canCreateTasks: hasWorkspacePermission(auth.workspace, auth.role, "tasks.create"),
        canViewTeam: Boolean(teamAnalytics),
      },
      recentProjects,
      dashboardTasks: dashboardTasks.map((task) => ({
        ...task,
        isCreator: String(task.userId?._id || task.userId) === String(auth.userId),
      })),
      needsAttention: [...attentionByProject.values()].slice(0, 6),
      recentActivity,
      forYouUpdates,
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

function dashboardPerformanceWindow(range, now) {
  if (range === "week") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return {
      start,
      end,
      label: "This week",
      mongoFormat: "%Y-%m-%d",
      slots: eachDayOfInterval({ start, end }).map((date) => ({ key: format(date, "yyyy-MM-dd"), label: format(date, "EEE") })),
    };
  }
  if (range === "six-months") {
    const start = startOfMonth(subMonths(now, 5));
    const end = endOfMonth(now);
    return {
      start,
      end,
      label: "Last 6 months",
      mongoFormat: "%Y-%m",
      slots: eachMonthOfInterval({ start, end }).map((date) => ({ key: format(date, "yyyy-MM"), label: format(date, "MMM") })),
    };
  }
  if (range === "year") {
    const start = startOfYear(now);
    const end = endOfYear(now);
    return {
      start,
      end,
      label: "This year",
      mongoFormat: "%Y-%m",
      slots: eachMonthOfInterval({ start, end }).map((date) => ({ key: format(date, "yyyy-MM"), label: format(date, "MMM") })),
    };
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    start,
    end,
    label: "This month",
    mongoFormat: "%Y-%m-%d",
    slots: eachDayOfInterval({ start, end }).map((date) => ({ key: format(date, "yyyy-MM-dd"), label: format(date, "d") })),
  };
}

async function buildTeamAnalytics(workspaceId, completedStatus, completedStage, projectIds) {
  const [projectProgress, userContribution] = await Promise.all([
    Project.aggregate([
      { $match: { workspaceId, _id: { $in: projectIds }, isArchived: false } },
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
                  $sum: { $cond: [{ $eq: ["$status", completedStatus] }, 1, 0] },
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
                    { $in: ["$_id", projectIds] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$stage", completedStage] }, 1, 0] },
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
                    { $in: ["$projectId", projectIds] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", completedStatus] }, 1, 0] },
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
