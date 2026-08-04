import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import { handleApiError, ok } from "@/lib/api-response";
import { pageOptions, requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import { escapeRegex } from "@/lib/utils";
import Task from "@/models/Task";
import Project from "@/models/Project";
import TaskComment from "@/models/TaskComment";
import { projectAccessFilter } from "@/lib/project-access";
import { canAccessOthersTasks, taskAccessFilter } from "@/lib/task-access";
import { completedTaskStatus } from "@/lib/customization";

export const runtime = "nodejs";

function listParam(params, key) {
  return [...new Set(params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))].slice(0, 100);
}

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const statuses = listParam(params, "status");
    const completedStatus = completedTaskStatus(auth.workspace);
    const visibilityPermission =
      statuses.length === 1 && statuses[0] === completedStatus ? "completed.view" : "tasks.view";
    const denied = requireWorkspacePermission(auth, visibilityPermission);
    if (denied) return denied;
    const { page, limit, skip } = pageOptions(params);
    const query = { workspaceId: auth.workspaceId, parentTaskId: null, ...taskAccessFilter(auth) };
    const accessibleProjects = await Project.find({
      workspaceId: auth.workspaceId,
      ...projectAccessFilter(auth),
    }).distinct("_id");
    query.projectId = { $in: accessibleProjects };
    if (params.get("search")) {
      const regex = new RegExp(escapeRegex(params.get("search").slice(0, 100)), "i");
      query.$or = [{ title: regex }, { description: regex }, { functionName: regex }];
    }
    const projectIds = listParam(params, "projectId");
    if (projectIds.length) {
      const allowed = new Set(accessibleProjects.map(String));
      query.projectId = { $in: projectIds.filter((id) => allowed.has(id)) };
    }
    for (const key of ["status", "priority", "environment"]) {
      const values = key === "status" ? statuses : listParam(params, key);
      if (values.length) query[key] = { $in: values };
    }
    const userIds = listParam(params, "userId").filter(validId);
    if (userIds.length && canAccessOthersTasks(auth)) query.userId = { $in: userIds };
    const now = new Date();
    const due = params.get("due");
    if (due === "today") query.dueDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
    if (due === "week") query.dueDate = { $gte: startOfDay(now), $lte: endOfWeek(now) };
    if (due === "overdue") {
      query.dueDate = { $lt: startOfDay(now) };
      query.status = { $ne: completedStatus };
    }
    if (due === "none") query.dueDate = null;
    const sorts = {
      updated: { updatedAt: -1 },
      due: { dueDate: 1 },
      priority: { priority: -1 },
      created: { createdAt: -1 },
    };
    const [items, total] = await Promise.all([
      Task.find(query)
        .populate("userId", "name")
        .populate({
          path: "projectId",
          select: "name clientName projectPlatform zohoProduct zohoProducts projectTypes stage assignedUserIds",
          populate: { path: "assignedUserIds", select: "name email" },
        })
        .sort(sorts[params.get("sort")] || sorts.due)
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);
    const [subtaskStats, commentStats] = items.length
      ? await Promise.all([Task.aggregate([
        {
          $match: {
            workspaceId: auth.workspaceId,
            parentTaskId: { $in: items.map((item) => item._id) },
          },
        },
        {
          $group: {
            _id: "$parentTaskId",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", completedStatus] }, 1, 0] },
            },
          },
        },
      ]), TaskComment.aggregate([
        { $match: { workspaceId: auth.workspaceId, taskId: { $in: items.map((item) => item._id) } } },
        { $group: { _id: "$taskId", count: { $sum: 1 } } },
      ])])
      : [[], []];
    const statsByTask = new Map(
      subtaskStats.map((item) => [String(item._id), item]),
    );
    const commentsByTask = new Map(commentStats.map((item) => [String(item._id), item.count]));
    const tasks = items.map((item) => {
      const stats = statsByTask.get(String(item._id));
      return {
        ...item,
        isCreator: String(item.userId?._id || item.userId) === String(auth.userId),
        totalSubtasks: stats?.total || 0,
        completedSubtasks: stats?.completed || 0,
        commentCount: commentsByTask.get(String(item._id)) || 0,
      };
    });
    return ok({ items: tasks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}
