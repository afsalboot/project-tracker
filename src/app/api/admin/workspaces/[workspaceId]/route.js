import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireApiUser, validId } from "@/lib/server";
import Activity from "@/models/Activity";
import PlatformConfiguration from "@/models/PlatformConfiguration";
import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskComment from "@/models/TaskComment";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import mongoose from "mongoose";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
const deleteSchema = z.object({
  confirmation: z.string().trim().min(1).max(120),
});

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Website administrator access required.", 403);
    }

    const { workspaceId } = await params;
    if (!validId(workspaceId)) return fail("Workspace not found.", 404);
    const { status } = updateSchema.parse(await request.json());
    if (String(workspaceId) === String(auth.workspaceId) && status === "suspended") {
      return fail("You cannot suspend the workspace containing your website administrator account.", 409);
    }

    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      { $set: { status } },
      { returnDocument: "after", runValidators: true },
    ).select("name type status ownerId createdAt updatedAt").lean();
    if (!workspace) return fail("Workspace not found.", 404);
    if (status === "suspended") {
      await User.updateMany(
        { workspaceId },
        { $inc: { sessionVersion: 1 } },
      );
    }

    return ok(
      { workspace },
      status === "suspended" ? "Workspace suspended." : "Workspace reactivated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Website administrator access required.", 403);
    }

    const { workspaceId } = await params;
    if (!validId(workspaceId)) return fail("Workspace not found.", 404);
    if (String(workspaceId) === String(auth.workspaceId)) {
      return fail("The workspace containing your website administrator account cannot be deleted.", 409);
    }

    const { confirmation } = deleteSchema.parse(await request.json());
    const workspace = await Workspace.findById(workspaceId)
      .select("name ownerId")
      .lean();
    if (!workspace) return fail("Workspace not found.", 404);
    if (confirmation !== workspace.name) {
      return fail("Enter the complete workspace name to confirm deletion.", 422);
    }

    const platform = await PlatformConfiguration.findById("platform").lean();
    if (platform?.adminUserId) {
      const containsAdmin = await User.exists({
        _id: platform.adminUserId,
        workspaceId: workspace._id,
      });
      if (containsAdmin) {
        return fail("A workspace containing the website administrator cannot be deleted.", 409);
      }
    }
    const configuredEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (
      configuredEmails.length &&
      await User.exists({
        workspaceId: workspace._id,
        email: { $in: configuredEmails },
      })
    ) {
      return fail("A workspace containing a configured website administrator cannot be deleted.", 409);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          TaskComment.deleteMany({ workspaceId: workspace._id }, { session }),
          Activity.deleteMany({ workspaceId: workspace._id }, { session }),
          Task.deleteMany({ workspaceId: workspace._id }, { session }),
          Project.deleteMany({ workspaceId: workspace._id }, { session }),
          User.deleteMany({ workspaceId: workspace._id }, { session }),
        ]);
        await Workspace.deleteOne({ _id: workspace._id }, { session });
      });
    } finally {
      await session.endSession();
    }

    return ok({}, "Workspace and all related data permanently deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
