import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireApiUser, validId } from "@/lib/server";
import Activity from "@/models/Activity";
import Feedback from "@/models/Feedback";
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
  confirmation: z.string().trim().email(),
});

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) {
      return fail("Platform administrator access required.", 403);
    }

    const { userId } = await params;
    if (!validId(userId)) return fail("User not found.", 404);
    const { status } = updateSchema.parse(await request.json());
    if (String(userId) === String(auth.userId) && status === "suspended") {
      return fail("You cannot suspend your own platform administrator account.", 409);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: { status },
        ...(status === "suspended" ? { $inc: { sessionVersion: 1 } } : {}),
      },
      { returnDocument: "after", runValidators: true },
    ).select("name email role status workspaceId createdAt updatedAt").lean();
    if (!user) return fail("User not found.", 404);

    return ok(
      { user },
      status === "suspended" ? "User account suspended." : "User account reactivated.",
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
      return fail("Platform administrator access required.", 403);
    }

    const { userId } = await params;
    if (!validId(userId)) return fail("User not found.", 404);
    if (String(userId) === String(auth.userId) || await isPlatformAdmin(userId)) {
      return fail("The website administrator account cannot be deleted.", 409);
    }
    const { confirmation } = deleteSchema.parse(await request.json());
    const target = await User.findById(userId).select("name email workspaceId").lean();
    if (!target) return fail("User not found.", 404);
    if (confirmation.toLowerCase() !== target.email.toLowerCase()) {
      return fail("Enter the user's complete email address to confirm deletion.", 422);
    }

    const workspace = await Workspace.findById(target.workspaceId)
      .select("ownerId")
      .lean();
    if (!workspace) return fail("The user's workspace no longer exists.", 409);
    if (String(workspace.ownerId) === String(target._id)) {
      return fail("Workspace owners cannot be deleted individually. Delete their workspace instead.", 409);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          Project.updateMany(
            { workspaceId: target.workspaceId, userId: target._id },
            { $set: { userId: workspace.ownerId } },
            { session },
          ),
          Project.updateMany(
            { workspaceId: target.workspaceId, assignedUserIds: target._id },
            { $pull: { assignedUserIds: target._id } },
            { session },
          ),
          Task.updateMany(
            { workspaceId: target.workspaceId, userId: target._id },
            { $set: { userId: workspace.ownerId } },
            { session },
          ),
          TaskComment.deleteMany({ userId: target._id }, { session }),
          Activity.deleteMany({ userId: target._id }, { session }),
          Feedback.updateMany(
            { moderatedBy: target._id },
            { $set: { moderatedBy: null } },
            { session },
          ),
        ]);
        await User.deleteOne({ _id: target._id }, { session });
      });
    } finally {
      await session.endSession();
    }

    return ok({}, "User account permanently deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
