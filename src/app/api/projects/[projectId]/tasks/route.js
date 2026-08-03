import { fail, handleApiError, ok } from "@/lib/api-response";
import { recalculateProgress } from "@/lib/progress";
import { cleanDates, pageOptions, requireApiUser, requireWorkspacePermission, validId } from "@/lib/server";
import { taskSchema } from "@/lib/validations";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { projectAccessFilter } from "@/lib/project-access";
import { taskAccessFilter } from "@/lib/task-access";
import { activeChoice, completedTaskStatus, hasEnabledChoices } from "@/lib/customization";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.create");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    const project = await Project.findOne({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) });
    if (!project) return fail("Project not found.", 404);
    const input = taskSchema.parse(await request.json());
    if (hasEnabledChoices(auth.workspace, "taskStatuses") && !activeChoice(auth.workspace, "taskStatuses", input.status)) return fail("Select an enabled task status.", 422);
    if (hasEnabledChoices(auth.workspace, "environments") && !activeChoice(auth.workspace, "environments", input.environment)) return fail("Select an enabled environment.", 422);
    const completedStatus = completedTaskStatus(auth.workspace);
    const task = await Task.create({
      ...cleanDates(input, ["dueDate"]),
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      projectId,
      completedDate: input.status === completedStatus ? new Date() : null,
      sortOrder: await Task.countDocuments({ projectId, workspaceId: auth.workspaceId, parentTaskId: null }),
    });
    await Promise.all([
      recalculateProgress(projectId, auth.workspaceId),
      Activity.create({
        userId: auth.userId,
        workspaceId: auth.workspaceId,
        projectId,
        taskId: task._id,
        action: "Task created",
        newValue: task.title,
      }),
    ]);
    return ok({ task }, "Task created successfully.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const denied = requireWorkspacePermission(auth, "tasks.view");
    if (denied) return denied;
    const { projectId } = await params;
    if (!validId(projectId)) return fail("Project not found.", 404);
    if (!(await Project.exists({ _id: projectId, workspaceId: auth.workspaceId, ...projectAccessFilter(auth) }))) {
      return fail("Project not found.", 404);
    }
    const search = new URL(request.url).searchParams;
    const { page, limit, skip } = pageOptions(search);
    const query = { workspaceId: auth.workspaceId, projectId, parentTaskId: null, ...taskAccessFilter(auth) };
    if (search.get("status")) query.status = search.get("status");
    if (search.get("priority")) query.priority = search.get("priority");
    const [items, total] = await Promise.all([
      Task.find(query).populate("userId", "name").sort({ sortOrder: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      Task.countDocuments(query),
    ]);
    return ok({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}
