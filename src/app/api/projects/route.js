import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { projectSchema } from "@/lib/validations";
import { cleanDates, pageOptions, requireApiUser, requireWorkspacePermission } from "@/lib/server";
import { escapeRegex, slugify } from "@/lib/utils";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { validateAssignees } from "@/lib/assignees";
import { canAccessAllProjects, projectAccessFilter } from "@/lib/project-access";
import { activeChoice, completedProjectStage, completedTaskStatus, defaultTaskStatus, hasEnabledChoices, workspaceCustomization } from "@/lib/customization";
import { semanticLabel } from "@/constants/customization";

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
    const customization = workspaceCustomization(auth.workspace);
    const zohoProject = customization.projectPlatforms.find((item) => item.id === "zoho-project")?.label || "Zoho Project";
    const isZohoProject = input.projectPlatform === zohoProject;
    for (const [key, value] of [["projectStages", input.stage], ["environments", input.environment], ["projectPlatforms", input.projectPlatform]]) {
      if (hasEnabledChoices(auth.workspace, key) && !activeChoice(auth.workspace, key, value)) return fail(`Select an enabled ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`, 422);
    }
    if (isZohoProject && hasEnabledChoices(auth.workspace, "zohoPlatforms") && !input.zohoProducts.length) return fail("Select at least one Zoho platform.", 422);
    if (hasEnabledChoices(auth.workspace, "zohoPlatforms") && input.zohoProducts.some((value) => !activeChoice(auth.workspace, "zohoPlatforms", value))) return fail("Select enabled Zoho platforms.", 422);
    if (hasEnabledChoices(auth.workspace, "projectTypes") && input.projectTypes.some((value) => !activeChoice(auth.workspace, "projectTypes", value))) return fail("Select enabled project types.", 422);
    // Creation permission includes choosing the initial project assignees.
    // Changing assignees later remains protected by projects.assign.
    const assignment = await validateAssignees(auth, input.assignedUserIds, "projects.create");
    if (assignment.response) return assignment.response;
    const { template, ...fields } = input;
    fields.zohoProducts = isZohoProject ? input.zohoProducts : [];
    fields.zohoProduct = fields.zohoProducts[0] || "";
    const project = await Project.create({
      ...cleanDates(fields),
      assignedUserIds: assignment.ids,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      slug: await uniqueSlug(auth.workspaceId, input.name),
      progress: 0,
    });
    const templateConfig = customization.starterTemplates.find((item) => item.enabled && item.id === template);
    if (templateConfig) {
      await Task.insertMany(
        templateConfig.tasks.map((title, sortOrder) => ({
          userId: auth.userId,
          workspaceId: auth.workspaceId,
          projectId: project._id,
          title,
          sortOrder,
          environment: project.environment,
          status: defaultTaskStatus(auth.workspace),
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
    if (assignment.ids.length) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId: project._id,
        recipientUserIds: assignment.ids,
        action: "Project assignment added",
      });
    }
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
    const view = params.get("view");
    const visibilityPermission =
      view === "completed" || (stages.length === 1 && stages[0] === completedProjectStage(auth.workspace)) ? "completed.view" : "projects.view";
    const denied = requireWorkspacePermission(auth, visibilityPermission);
    if (denied) return denied;
    const { page, limit, skip } = pageOptions(params);
    const query = { workspaceId: new mongoose.Types.ObjectId(auth.workspaceId), ...projectAccessFilter(auth) };
    const completedStage = completedProjectStage(auth.workspace);
    const archived = params.get("archived");
    if (view === "archived") {
      query.isArchived = true;
    } else if (view === "completed") {
      query.isArchived = false;
      query.$and = [...(query.$and || []), { stage: completedStage }];
    } else if (view === "all") {
      query.isArchived = { $in: [true, false] };
    } else if (view === "active") {
      query.isArchived = false;
      query.$and = [...(query.$and || []), { stage: { $ne: completedStage } }];
    } else {
      query.isArchived = archived === "true" ? true : archived === "all" ? { $in: [true, false] } : false;
    }
    if (params.get("search")) {
      const regex = new RegExp(escapeRegex(params.get("search").slice(0, 100)), "i");
      query.$or = [{ name: regex }, { clientName: regex }, { description: regex }];
    }
    for (const key of ["stage", "priority", "projectPlatform", "environment"]) {
      const values = key === "stage" ? stages : listParam(params, key);
      if (values.length) query[key] = { $in: values };
    }
    const zohoProducts = listParam(params, "zohoProduct");
    if (zohoProducts.length) {
      query.$and = [...(query.$and || []), { $or: [{ zohoProducts: { $in: zohoProducts } }, { zohoProduct: { $in: zohoProducts } }] }];
    }
    const projectTypes = listParam(params, "projectType");
    if (projectTypes.length) query.projectTypes = { $in: projectTypes };
    const userIds = listParam(params, "userId")
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (userIds.length && canAccessAllProjects(auth)) {
      query.$and = [...(query.$and || []), { $or: [{ userId: { $in: userIds } }, { assignedUserIds: { $in: userIds } }] }];
    }
    const now = new Date();
    if (params.get("due") === "today") query.dueDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
    if (params.get("due") === "week") query.dueDate = { $gte: startOfDay(now), $lte: endOfWeek(now) };
    if (params.get("due") === "overdue") query.dueDate = { $lt: startOfDay(now) };
    if (params.get("due") === "active") query.stage = { $nin: [completedProjectStage(auth.workspace), semanticLabel(auth.workspace, "projectStages", "cancelled", "Cancelled")] };
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
            isCompleted: { $eq: ["$stage", completedStage] },
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
                      { $eq: ["$$this.status", completedTaskStatus(auth.workspace)] },
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
