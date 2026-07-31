import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import Feedback from "@/models/Feedback";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Platform administrator access required.", 403);
    }
    const [
      totals,
      users,
      suspendedUsers,
      workspaces,
      suspendedWorkspaces,
      projects,
      tasks,
    ] = await Promise.all([
      Feedback.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.countDocuments(),
      User.countDocuments({ status: "suspended" }),
      Workspace.countDocuments(),
      Workspace.countDocuments({ status: "suspended" }),
      Project.countDocuments(),
      Task.countDocuments(),
    ]);
    const feedback = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };
    for (const item of totals) {
      feedback[item._id] = item.count;
      feedback.total += item.count;
    }
    return ok({
      admin: true,
      metrics: {
        users,
        activeUsers: users - suspendedUsers,
        suspendedUsers,
        workspaces,
        activeWorkspaces: workspaces - suspendedWorkspaces,
        suspendedWorkspaces,
        projects,
        tasks,
      },
      feedback,
      endpoints: {
        feedback: "/api/admin/feedback",
        moderation: "/api/admin/feedback/:feedbackId",
        users: "/api/admin/users",
        workspaces: "/api/admin/workspaces",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
