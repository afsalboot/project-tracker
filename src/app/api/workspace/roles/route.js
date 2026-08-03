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
import { slugify } from "@/lib/utils";
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

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Saved roles are unavailable in Personal workspaces.", 404);
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.roles")) {
      return fail("You do not have permission to view saved roles.", 403);
    }
    const response = ok({
      roles: auth.workspace.roles || [],
      availablePermissions: WORKSPACE_PERMISSIONS,
      permissionGroups: PERMISSION_GROUPS,
      permissions: {
        canManageRoles: hasWorkspacePermission(
          auth.workspace,
          auth.role,
          "roles.manage",
        ),
      },
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Saved roles are unavailable in Personal workspaces.", 404);
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.roles") || !hasWorkspacePermission(auth.workspace, auth.role, "roles.manage")) {
      return fail("You do not have permission to create roles.", 403);
    }
    const input = roleSchema.parse(await request.json());
    if (!canGrantWorkspacePermissions(auth.workspace, auth.role, input.permissions)) {
      return fail("A role cannot grant permissions above your own access level.", 403);
    }
    if ((auth.workspace.roles?.length || 0) >= 20) {
      return fail("A workspace can have up to 20 saved roles.", 409);
    }
    const base = slugify(input.name) || "custom-role";
    let key = base;
    let suffix = 2;
    while (auth.workspace.roles?.some((role) => role.key === key)) {
      key = `${base}-${suffix++}`;
    }
    const role = {
      key,
      name: input.name,
      icon: input.icon,
      color: input.color,
      permissions: [...new Set(input.permissions)],
      isSystem: false,
    };
    const workspace = await Workspace.findOneAndUpdate(
      { _id: auth.workspaceId, "roles.key": { $ne: key } },
      { $push: { roles: role } },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();
    const savedRole = workspace?.roles?.find((item) => item.key === key);
    if (!savedRole) {
      return fail(
        "The role could not be saved. Refresh the page and try again.",
        409,
      );
    }
    return ok({ role: savedRole }, "Role created successfully.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
