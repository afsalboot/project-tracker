import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, validId } from "@/lib/server";
import {
  canAssignWorkspaceRole,
  canManageWorkspaceMember,
  hasWorkspacePermission,
} from "@/lib/workspace";
import User from "@/models/User";
import Project from "@/models/Project";

export const runtime = "nodejs";
const roleSchema = z.object({ role: z.string().trim().min(1).max(64) });

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "members.manage")) return fail("Permission denied.", 403);
    const { memberId } = await params;
    if (!validId(memberId)) return fail("Member not found.", 404);
    const member = await User.findOne({ _id: memberId, workspaceId: auth.workspaceId });
    if (!member || !canManageWorkspaceMember(auth.workspace, auth.role, member.role)) return fail("Member not found.", 404);
    const { role } = roleSchema.parse(await request.json());
    if (!canAssignWorkspaceRole(auth.workspace, auth.role, role)) {
      return fail("Select a saved role within your own permission level.", 422);
    }
    member.role = role;
    await member.save();
    return ok({ member }, "Member role updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "members.manage")) return fail("Permission denied.", 403);
    const { memberId } = await params;
    if (!validId(memberId) || memberId === auth.userId) {
      return fail("This member cannot be removed.", 409);
    }
    const member = await User.findOne({ _id: memberId, workspaceId: auth.workspaceId });
    if (!member || !canManageWorkspaceMember(auth.workspace, auth.role, member.role)) return fail("Member not found.", 404);
    await Project.updateMany(
      { workspaceId: auth.workspaceId, assignedUserIds: member._id },
      { $pull: { assignedUserIds: member._id } },
    );
    await member.deleteOne();
    return ok({}, "Member removed.");
  } catch (error) {
    return handleApiError(error);
  }
}
