import { fail } from "@/lib/api-response";
import { requireWorkspacePermission, validId } from "@/lib/server";
import User from "@/models/User";

export async function validateAssignees(auth, values, permission, requirePermission = false) {
  const ids = [...new Set(values || [])];
  if (requirePermission) {
    const denied = requireWorkspacePermission(auth, permission);
    if (denied) return { response: denied };
  }
  if (!ids.length) return { ids: [] };
  if (auth.workspace.type === "personal") {
    return { response: fail("User assignment is available in Organization or Team workspaces.", 409) };
  }
  const denied = requirePermission ? null : requireWorkspacePermission(auth, permission);
  if (denied) return { response: denied };
  if (ids.some((id) => !validId(id))) {
    return { response: fail("Select valid workspace users.", 422) };
  }
  const members = await User.find({
    _id: { $in: ids },
    workspaceId: auth.workspaceId,
  }).select("_id").lean();
  if (members.length !== ids.length) {
    return { response: fail("One or more selected users are not members of this workspace.", 422) };
  }
  return { ids };
}
