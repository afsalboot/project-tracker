import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import {
  canAssignWorkspaceRole,
  canManageWorkspace,
  hasWorkspacePermission,
} from "@/lib/workspace";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { WORKSPACE_PERMISSIONS } from "@/constants/permissions";
import { workspaceSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.workspace")) {
      return fail("You do not have permission to view settings.", 403);
    }
    const canViewMembers = hasWorkspacePermission(
      auth.workspace,
      auth.role,
      "members.view",
    );
    const members = canViewMembers
      ? await User.find({ workspaceId: auth.workspaceId })
        .select("name email role createdAt")
        .sort({ role: 1, name: 1 })
        .lean()
      : [];
    const response = ok({
      workspace: auth.workspace,
      members,
      currentUserId: auth.userId,
      availablePermissions: WORKSPACE_PERMISSIONS,
      permissions: {
        canManage: canManageWorkspace(auth.role, auth.workspace),
        canManageMembers: hasWorkspacePermission(
          auth.workspace,
          auth.role,
          "members.manage",
        ),
        canViewMembers,
        canCreateMembers: hasWorkspacePermission(
          auth.workspace,
          auth.role,
          "members.create",
        ),
        canManageRoles: hasWorkspacePermission(
          auth.workspace,
          auth.role,
          "roles.manage",
        ),
      },
      assignableRoleKeys: (auth.workspace.roles || [])
        .filter((role) =>
          canAssignWorkspaceRole(auth.workspace, auth.role, role.key),
        )
        .map((role) => role.key),
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.workspace")) return fail("You do not have permission to view workspace settings.", 403);
    if (!canManageWorkspace(auth.role, auth.workspace)) {
      return fail("Only workspace owners and admins can change settings.", 403);
    }
    const input = workspaceSchema.parse(await request.json());
    if (input.type === "personal") {
      const memberCount = await User.countDocuments({ workspaceId: auth.workspaceId });
      if (memberCount > 1) {
        return fail("Remove other members before switching to Personal mode.", 409);
      }
    }
    const workspace = await Workspace.findByIdAndUpdate(
      auth.workspaceId,
      { $set: input },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return ok({ workspace }, "Workspace settings updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
