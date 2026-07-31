import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import { PROJECT_TEMPLATES } from "@/constants/project";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { projectSchema } from "@/lib/validations";
import { cleanDates, pageOptions, requireApiUser, requireWorkspacePermission } from "@/lib/server";
import { escapeRegex, slugify } from "@/lib/utils";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { validateAssignees } from "@/lib/assignees";
import { projectAccessFilter } from "@/lib/project-access";

export const runtime = "nodejs";

function listParam(params, key) {
  return [...new Set(params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))].slice(0, 30);
}

async function uniqueSlug(workspaceId, name) {
  const base = slugify(name) || "project";
  let slug = base;
  let suffix = 2;
  while (await Project.exists({ workspaceId, slug })) slug = `${base}-${suffix++}`;
  return slug;
}

export async function POST(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.create");
    if (denied) return denied;
    const input = projectSchema.parse(await request.json());
    const assignment = await validateAssignees(auth, input.assignedUserIds, "projects.assign");
    if (assignment.response) return assignment.response;
    const { template, ...fields } = input;
    const project = await Project.create({
      ...cleanDates(fields),
      assignedUserIds: assignment.ids,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      slug: await uniqueSlug(auth.workspaceId, input.name),
      progress: 0,
    });
    const templateConfig = template ? PROJECT_TEMPLATES[template] : null;
    if (templateConfig) {
      await Task.insertMany(
        templateConfig.tasks.map((title, sortOrder) => ({
          userId: auth.userId,
          workspaceId: auth.workspaceId,
          projectId: project._id,
          title,
          sortOrder,
          environment: project.environment,
          priority: "Medium",
        })),
      );
    }
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId: project._id,
      action: "Project created",
      metadata: templateConfig ? { template: templateConfig.label } : {},
    });
    return ok({ project }, "Project created successfully.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const stages = listParam(params, "stage");
    const visibilityPermission =
      stages.length === 1 && stages[0] === "Completed" ? "completed.view" : "projects.view";
    const denied = requireWorkspacePermission(auth, visibilityPermission);
    if (denied) return denied;
    const { page, limit, skip } = pageOptions(params);
    const query = { workspaceId: new mongoose.Types.ObjectId(auth.workspaceId), ...projectAccessFilter(auth) };
    const archived = params.get("archived");
    query.isArchived = archived === "true" ? true : archived === "all" ? { $in: [true, false] } : false;
    if (params.get("search")) {
      const regex = new RegExp(escapeRegex(params.get("search").slice(0, 100)), "i");
      query.$or = [{ name: regex }, { clientName: regex }, { description: regex }];
    }
    for (const key of ["stage", "priority", "zohoProduct", "environment"]) {
      const values = key === "stage" ? stages : listParam(params, key);
      if (values.length) query[key] = { $in: values };
    }
    const projectTypes = listParam(params, "projectType");
    if (projectTypes.length) query.projectTypes = { $in: projectTypes };
    const now = new Date();
    if (params.get("due") === "today") query.dueDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
    if (params.get("due") === "week") query.dueDate = { $gte: startOfDay(now), $lte: endOfWeek(now) };
    if (params.get("due") === "overdue") query.dueDate = { $lt: startOfDay(now) };
    if (params.get("due") === "active") query.stage = { $nin: ["Completed", "Cancelled"] };
    const sorts = {
      updated: { updatedAt: -1 },
      due: { dueDate: 1 },
      name: { name: 1 },
      priority: { priority: -1 },
      created: { createdAt: -1 },
    };
    const sort = sorts[params.get("sort")] || sorts.updated;
    const [items, total] = await Promise.all([
      Project.aggregate([
        { $match: query },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "assignedUserIds",
            foreignField: "_id",
            as: "assignedUsers",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        {
          $lookup: {
            from: "tasks",
            localField: "_id",
            foreignField: "projectId",
            as: "taskStats",
          },
        },
        {
          $addFields: {
            totalTasks: {
              $size: {
                $filter: {
                  input: "$taskStats",
                  cond: {
                    $eq: [{ $ifNull: ["$$this.parentTaskId", null] }, null],
                  },
                },
              },
            },
            completedTasks: {
              $size: {
                $filter: {
                  input: "$taskStats",
                  cond: {
                    $and: [
                      { $eq: [{ $ifNull: ["$$this.parentTaskId", null] }, null] },
                      { $eq: ["$$this.status", "Completed"] },
                    ],
                  },
                },
              },
            },
          },
        },
        { $project: { taskStats: 0 } },
      ]),
      Project.countDocuments(query),
    ]);
    return ok({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}
