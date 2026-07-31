import { connectDb } from "@/lib/db";
import Activity from "@/models/Activity";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import {
  DEFAULT_WORKSPACE_ROLES,
  expandLegacyRolePermissions,
} from "@/constants/permissions";

export async function ensureWorkspace(userId) {
  await connectDb();
  let user = await User.findById(userId).select("-password");
  if (!user || user.status === "suspended") return null;

  let workspace = user.workspaceId
    ? await Workspace.findById(user.workspaceId)
    : null;
  const needsMigration = !user.workspaceId;

  if (!workspace && user.workspaceId) {
    return null;
  }

  if (workspace?.status === "suspended") return null;

  if (!workspace) {
    const existingWorkspace = await Workspace.exists({});
    if (existingWorkspace) return null;
    try {
      workspace = await Workspace.findOneAndUpdate(
        { ownerId: user._id },
        {
          $setOnInsert: {
            name: `${user.name}'s Workspace`,
            type: "personal",
            ownerId: user._id,
          },
        },
        { returnDocument: "after", upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
      workspace = await Workspace.findOne({ ownerId: user._id });
    }
    user = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { workspaceId: workspace._id, role: "owner" } },
      { returnDocument: "after" },
    ).select("-password");
  }

  if (!workspace.roles?.length) {
    workspace = await Workspace.findByIdAndUpdate(
      workspace._id,
      { $set: { roles: DEFAULT_WORKSPACE_ROLES } },
      { returnDocument: "after", runValidators: true },
    );
  } else {
    const normalized = expandLegacyRolePermissions(workspace.roles);
    if (normalized.changed) {
      workspace = await Workspace.findByIdAndUpdate(
        workspace._id,
        { $set: { roles: normalized.roles } },
        { returnDocument: "after", runValidators: true },
      );
    }
  }

  if (needsMigration) {
    await Promise.all([
      Project.updateMany(
        { userId: user._id, workspaceId: { $exists: false } },
        { $set: { workspaceId: workspace._id } },
      ),
      Task.updateMany(
        { userId: user._id, workspaceId: { $exists: false } },
        { $set: { workspaceId: workspace._id } },
      ),
      Activity.updateMany(
        { userId: user._id, workspaceId: { $exists: false } },
        { $set: { workspaceId: workspace._id } },
      ),
    ]);
  }

  return {
    user: user.toObject(),
    workspace: workspace.toObject(),
  };
}

export function hasWorkspacePermission(workspace, role, permission) {
  if (role === "owner") return true;
  const definition = workspace?.roles?.find((item) => item.key === role);
  return Boolean(definition?.permissions?.includes(permission));
}

export function workspacePermissionKeys(workspace, role) {
  if (role === "owner") {
    return workspace?.roles?.find((item) => item.key === "owner")?.permissions || [];
  }
  return workspace?.roles?.find((item) => item.key === role)?.permissions || [];
}

export function canManageWorkspace(role, workspace) {
  return hasWorkspacePermission(workspace, role, "workspace.manage");
}

export function canAssignWorkspaceRole(workspace, actorRole, targetRole) {
  if (targetRole === "owner") return false;
  const target = workspace?.roles?.find((role) => role.key === targetRole);
  if (!target) return false;
  if (actorRole === "owner") return true;
  const actor = workspace.roles?.find((role) => role.key === actorRole);
  const actorPermissions = new Set(actor?.permissions || []);
  return (target.permissions || []).every((permission) =>
    actorPermissions.has(permission),
  );
}

export function canManageWorkspaceMember(workspace, actorRole, targetRole) {
  if (targetRole === "owner") return false;
  if (actorRole === "owner") return true;
  const actor = workspace?.roles?.find((role) => role.key === actorRole);
  const target = workspace?.roles?.find((role) => role.key === targetRole);
  if (!actor || !target) return false;
  const actorPermissions = new Set(actor.permissions || []);
  return (target.permissions || []).every((permission) => actorPermissions.has(permission));
}

export function canGrantWorkspacePermissions(
  workspace,
  actorRole,
  permissions,
) {
  if (actorRole === "owner") return true;
  const actor = workspace?.roles?.find((role) => role.key === actorRole);
  const actorPermissions = new Set(actor?.permissions || []);
  return permissions.every((permission) => actorPermissions.has(permission));
}
