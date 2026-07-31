import { z } from "zod";
import {
  PERMISSION_GROUPS,
  WORKSPACE_PERMISSIONS,
} from "@/constants/permissions";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import {
  canGrantWorkspacePermissions,
  hasWorkspacePermission,
} from "@/lib/workspace";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { DEFAULT_ROLE_COLOR, ROLE_COLOR_PATTERN, ROLE_ICON_KEYS } from "@/constants/roles";

export const runtime = "nodejs";

const allowedPermissions = WORKSPACE_PERMISSIONS.map((permission) => permission.key);
const roleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.enum(ROLE_ICON_KEYS).default("review"),
  color: z.string().regex(ROLE_COLOR_PATTERN).default(DEFAULT_ROLE_COLOR),
  permissions: z.array(z.enum(allowedPermissions)).default([]),
});

export async function GET(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.view")) {
      return fail("You do not have permission to view saved roles.", 403);
    }
    const { roleKey } = await params;
    const workspace = await Workspace.findOne(
      { _id: auth.workspaceId, "roles.key": roleKey },
      { roles: { $elemMatch: { key: roleKey } } },
    ).lean();
    const role = workspace?.roles?.[0];
    if (!role) return fail("Role not found.", 404);
    const response = ok({
      role,
      availablePermissions: WORKSPACE_PERMISSIONS,
      permissionGroups: PERMISSION_GROUPS,
      permissions: {
        canManageRoles: hasWorkspacePermission(
          auth.workspace,
          auth.role,
          "roles.manage",
        ),
        canEditOwnerIcon: auth.role === "owner",
      },
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "roles.manage")) {
      return fail("You do not have permission to edit roles.", 403);
    }
    const { roleKey } = await params;
    const input = roleSchema.parse(await request.json());
    if (roleKey === "owner" && auth.role !== "owner") {
      return fail("Only the workspace owner can change the Owner role icon.", 403);
    }
    if (!canGrantWorkspacePermissions(auth.workspace, auth.role, input.permissions)) {
      return fail("A role cannot grant permissions above your own access level.", 403);
    }
    const changes = roleKey === "owner"
      ? { "roles.$.icon": input.icon, "roles.$.color": input.color }
      : {
          "roles.$.name": input.name,
          "roles.$.icon": input.icon,
          "roles.$.color": input.color,
          "roles.$.permissions": [...new Set(input.permissions)],
        };
    const workspace = await Workspace.findOneAndUpdate(
      { _id: auth.workspaceId, "roles.key": roleKey },
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    ).lean();
    const savedRole = workspace?.roles?.find((role) => role.key === roleKey);
    if (!savedRole) return fail("Role not found.", 404);
    return ok({ role: savedRole }, "Role permissions saved.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "roles.manage")) {
      return fail("You do not have permission to delete roles.", 403);
    }
    const { roleKey } = await params;
    const definition = auth.workspace.roles?.find((role) => role.key === roleKey);
    if (!definition) return fail("Role not found.", 404);
    if (definition.isSystem) return fail("System roles cannot be deleted.", 409);
    if (await User.exists({ workspaceId: auth.workspaceId, role: roleKey })) {
      return fail("Reassign members using this role before deleting it.", 409);
    }
    await Workspace.updateOne(
      { _id: auth.workspaceId },
      { $pull: { roles: { key: roleKey } } },
    );
    return ok({}, "Role deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
