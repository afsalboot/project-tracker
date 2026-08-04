import bcrypt from "bcryptjs";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import {
  canAssignWorkspaceRole,
  hasWorkspacePermission,
} from "@/lib/workspace";
import User from "@/models/User";
import { memberSchema } from "@/lib/validations";
import { enforcePersistentRateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.users")) return fail("You do not have permission to view user settings.", 403);
    if (auth.workspace.type === "personal") {
      return fail("Workspace members are unavailable in Personal workspaces.", 404);
    }
    if (!hasWorkspacePermission(auth.workspace, auth.role, "members.view")) {
      return fail("You do not have permission to view workspace users.", 403);
    }
    const members = await User.find({ workspaceId: auth.workspaceId })
      .select("name email role createdAt")
      .sort({ role: 1, name: 1 })
      .lean();
    return ok({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.users")) return fail("You do not have permission to view user settings.", 403);
    if (!hasWorkspacePermission(auth.workspace, auth.role, "members.create")) {
      return fail("You do not have permission to add workspace users.", 403);
    }
    if (auth.workspace.type === "personal") {
      return fail("Switch to Organization or Team mode before adding members.", 409);
    }
    const limited = await enforcePersistentRateLimit(request, "member-create", auth.userId, { limit: 30, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const input = memberSchema.parse(await request.json());
    if (!canAssignWorkspaceRole(auth.workspace, auth.role, input.role)) {
      return fail("Select a saved role within your own permission level.", 422);
    }
    const password = await bcrypt.hash(input.password, 12);
    const existing = await User.exists({ email: input.email });
    if (existing) return fail("An account with this email already exists.", 409);
    const member = await User.create({
      ...input,
      workspaceId: auth.workspaceId,
      password,
    });

    return ok(
      { member: { _id: member._id, name: member.name, email: member.email, role: member.role } },
      "Member added successfully.",
      201,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail("A user with this email address already exists.", 409);
    }
    return handleApiError(error);
  }
}
