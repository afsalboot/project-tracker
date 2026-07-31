import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import { ensureWorkspace, hasWorkspacePermission } from "@/lib/workspace";
import { isPlatformAdmin } from "@/lib/platform-admin";
import User from "@/models/User";

export async function requireApiUser() {
  const session = await getSession();
  if (!session?.sub) return { response: fail("Authentication required.", 401) };
  await connectDb();
  const user = await User.findById(session.sub)
    .select("role status workspaceId +sessionVersion")
    .lean();
  if (
    !user ||
    user.status === "suspended" ||
    Number(session.ver || 0) !== Number(user.sessionVersion || 0)
  ) {
    return { response: fail("Authentication required.", 401) };
  }
  if (session.admin === true && await isPlatformAdmin(user._id)) {
    return {
      userId: user._id,
      workspaceId: null,
      role: null,
      workspace: null,
      adminSession: true,
    };
  }
  const context = await ensureWorkspace(session.sub);
  if (!context) return { response: fail("Authentication required.", 401) };
  return {
    userId: session.sub,
    // Keep this as an ObjectId. In development, a hot-reloaded Mongoose model
    // may otherwise leave a string uncast and fail to match stored ObjectIds.
    workspaceId: context.workspace._id,
    role: context.user.role,
    workspace: context.workspace,
    adminSession: false,
  };
}

export function requireWorkspacePermission(auth, permission) {
  if (hasWorkspacePermission(auth.workspace, auth.role, permission)) return null;
  return fail("You do not have permission to perform this action.", 403);
}

export function requireTaskCreator(auth, task) {
  if (String(task.userId) === String(auth.userId)) return null;
  return fail("Only the person who created this task can change it.", 403);
}

export function validId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function cleanDates(data, fields = ["startDate", "dueDate"]) {
  const output = { ...data };
  for (const field of fields) {
    if (field in output) output[field] = output[field] ? new Date(output[field]) : null;
  }
  return output;
}

export function pageOptions(searchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 24));
  return { page, limit, skip: (page - 1) * limit };
}
