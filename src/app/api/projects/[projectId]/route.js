import { fail, handleApiError, ok } from "@/lib/api-response";
import { projectSchema } from "@/lib/validations";
import { cleanDates, requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import { slugify } from "@/lib/utils";
import { hasWorkspacePermission } from "@/lib/workspace";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskComment from "@/models/TaskComment";
import { z } from "zod";
import { validateAssignees } from "@/lib/assignees";
import { projectAccessFilter } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { activeChoice, blockedTaskStatus, completedProjectStage, completedTaskStatus, hasEnabledChoices, testingTaskStatus, workspaceCustomization } from "@/lib/customization";
import { projectNotificationRecipients } from "@/lib/activity-notifications";

export const runtime = "nodejs";
const deleteConfirmationSchema = z.object({
  confirmation: z.string().trim().min(1).max(200),
});

export async function GET(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.view");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) })
      .populate("assignedUserIds", "name email")
      .lean();
    if (!project) return fail("Project not found.", 404);
    const canViewTasks = hasWorkspacePermission(
      auth.workspace,
      auth.role,
      "tasks.view",
    );
    const tasks = canViewTasks
      ? await Task.find({ projectId, workspaceId: auth.workspaceId, parentTaskId: null, ...taskAccessFilter(auth) }).populate("userId", "name").sort({ sortOrder: 1, createdAt: 1 }).lean()
      : [];
    const completedStatus = completedTaskStatus(auth.workspace);
    const blockedStatus = blockedTaskStatus(auth.workspace);
    const testingStatus = testingTaskStatus(auth.workspace);
    const [subtaskStats, commentStats] = tasks.length
      ? await Promise.all([Task.aggregate([
        {
          $match: {
            workspaceId: auth.workspaceId,
            ...taskAccessFilter(auth),
            parentTaskId: { $in: tasks.map((task) => task._id) },
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
        { $match: { workspaceId: auth.workspaceId, taskId: { $in: tasks.map((task) => task._id) } } },
        { $group: { _id: "$taskId", count: { $sum: 1 } } },
      ])])
      : [[], []];
    const statsByTask = new Map(
      subtaskStats.map((item) => [String(item._id), item]),
    );
    const commentsByTask = new Map(commentStats.map((item) => [String(item._id), item.count]));
    const tasksWithSubtasks = tasks.map((task) => {
      const subtask = statsByTask.get(String(task._id));
      return {
        ...task,
        isCreator: String(task.userId?._id || task.userId) === String(auth.userId),
        totalSubtasks: subtask?.total || 0,
        completedSubtasks: subtask?.completed || 0,
        commentCount: commentsByTask.get(String(task._id)) || 0,
      };
    });
    return ok({
      project,
      tasks: tasksWithSubtasks,
      stats: {
        total: tasksWithSubtasks.length,
        completed: tasksWithSubtasks.filter((task) => task.status === completedStatus).length,
        blocked: tasksWithSubtasks.filter((task) => task.status === blockedStatus).length,
        testing: tasksWithSubtasks.filter((task) => task.status === testingStatus).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.edit");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const current = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!current) return fail("Project not found.", 404);
    const input = projectSchema.parse(await request.json());
    const customization = workspaceCustomization(auth.workspace);
    const zohoProject = customization.projectPlatforms.find((item) => item.id === "zoho-project")?.label || "Zoho Project";
    const isZohoProject = input.projectPlatform === zohoProject;
    for (const [key, value] of [["projectStages", input.stage], ["environments", input.environment], ["projectPlatforms", input.projectPlatform]]) {
      const unchanged = ({ projectStages: current.stage, environments: current.environment, projectPlatforms: current.projectPlatform }[key] || "General Project") === value;
      if (!unchanged && hasEnabledChoices(auth.workspace, key) && !activeChoice(auth.workspace, key, value)) return fail(`Select an enabled ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`, 422);
    }
    if (isZohoProject && !input.zohoProducts.length) return fail("Select at least one Zoho platform.", 422);
    const currentZohoProducts = current.zohoProducts?.length ? current.zohoProducts : current.zohoProduct ? [current.zohoProduct] : [];
    if (hasEnabledChoices(auth.workspace, "zohoPlatforms") && input.zohoProducts.some((value) => !currentZohoProducts.includes(value) && !activeChoice(auth.workspace, "zohoPlatforms", value))) return fail("Select enabled Zoho platforms.", 422);
    if (hasEnabledChoices(auth.workspace, "projectTypes") && input.projectTypes.some((value) => !(current.projectTypes || []).includes(value) && !activeChoice(auth.workspace, "projectTypes", value))) return fail("Select enabled project types.", 422);
    const currentAssignees = (current.assignedUserIds || []).map(String).sort();
    const nextAssignees = [...new Set(input.assignedUserIds || [])].sort();
    let addedAssignees = [];
    if (currentAssignees.join(",") !== nextAssignees.join(",")) {
      const assignment = await validateAssignees(auth, nextAssignees, "projects.assign", true);
      if (assignment.response) return assignment.response;
      input.assignedUserIds = assignment.ids;
      addedAssignees = assignment.ids.filter((id) => !currentAssignees.includes(String(id)));
    } else {
      input.assignedUserIds = current.assignedUserIds;
    }
    const { template: _template, ...fields } = input;
    fields.zohoProducts = isZohoProject ? input.zohoProducts : [];
    fields.zohoProduct = fields.zohoProducts[0] || "";
    let slug = current.slug;
    if (current.name !== input.name) {
      const base = slugify(input.name) || "project";
      slug = base;
      let suffix = 2;
      while (await Project.exists({ workspaceId: auth.workspaceId, slug, _id: { $ne: projectId } })) {
        slug = `${base}-${suffix++}`;
      }
    }
    const previousStage = current.stage;
    const previousDueDate = current.dueDate?.toISOString() || null;
    Object.assign(current, cleanDates(fields), { slug });
    await current.save();
    const updateRecipients = await projectNotificationRecipients(projectId, auth.userId, {
      excludeUserIds: addedAssignees,
    });
    if (previousStage !== current.stage) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId,
        action: "Project stage changed",
        previousValue: previousStage,
        newValue: current.stage,
      });
    }
    const nextDueDate = current.dueDate?.toISOString() || null;
    if (previousDueDate !== nextDueDate) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId,
        action: "Project due date changed",
        previousValue: previousDueDate,
        newValue: nextDueDate,
      });
    }
    if (addedAssignees.length) {
      await Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId,
        recipientUserIds: addedAssignees.filter((id) => String(id) !== String(auth.userId)),
        action: "Project assignment added",
      });
    }
    await Activity.create({
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      recipientUserIds: updateRecipients,
      action: "Project updated",
    });
    return ok({ project: current }, "Project updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "projects.delete");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!project) return fail("Project not found.", 404);
    const confirmation = deleteConfirmationSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!confirmation.success || confirmation.data.confirmation !== project.name) {
      return fail("Type the exact project name to confirm deletion.", 422);
    }
    if (project.stage === completedProjectStage(auth.workspace) || project.completedDate) {
      return fail("Completed projects must be archived instead of deleted.", 409);
    }
    await Promise.all([
      Project.deleteOne({ _id: projectId, workspaceId: auth.workspaceId }),
      Task.deleteMany({ projectId, workspaceId: auth.workspaceId }),
      Activity.deleteMany({ projectId, workspaceId: auth.workspaceId }),
      TaskComment.deleteMany({ projectId, workspaceId: auth.workspaceId }),
    ]);
    return ok({}, "Project deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
