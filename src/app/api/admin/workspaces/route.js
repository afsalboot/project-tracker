import { fail, handleApiError, ok } from "@/lib/api-response";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireApiUser } from "@/lib/server";
import { escapeRegex } from "@/lib/utils";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Platform administrator access required.", 403);
    }

    const params = new URL(request.url).searchParams;
    const query = {};
    const status = params.get("status");
    const type = params.get("type");
    const search = params.get("search")?.trim().slice(0, 100);
    if (["active", "suspended"].includes(status)) {
      query.status = status === "active" ? { $ne: "suspended" } : "suspended";
    }
    if (["personal", "organization", "team"].includes(type)) query.type = type;
    if (search) query.name = new RegExp(escapeRegex(search), "i");

    const workspaces = await Workspace.find(query)
      .select("name type status ownerId createdAt updatedAt")
      .populate("ownerId", "name email status")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const ids = workspaces.map((workspace) => workspace._id);
    const [memberCounts, projectCounts, taskCounts] = await Promise.all([
      User.aggregate([
        { $match: { workspaceId: { $in: ids } } },
        { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
      ]),
      Project.aggregate([
        { $match: { workspaceId: { $in: ids } } },
        { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { workspaceId: { $in: ids } } },
        { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
      ]),
    ]);
    const toMap = (items) =>
      new Map(items.map((item) => [String(item._id), item.count]));

    const members = toMap(memberCounts);
    const projects = toMap(projectCounts);
    const tasks = toMap(taskCounts);
    return ok({
      workspaces: workspaces.map((workspace) => ({
        ...workspace,
        counts: {
          members: members.get(String(workspace._id)) || 0,
          projects: projects.get(String(workspace._id)) || 0,
          tasks: tasks.get(String(workspace._id)) || 0,
        },
      })),
      currentWorkspaceId: auth.workspaceId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
