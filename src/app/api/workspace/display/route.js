import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import Workspace from "@/models/Workspace";

export const runtime = "nodejs";

const displaySchema = z.object({
  highlightedRoleKeys: z.array(z.string().trim().min(1).max(64)).max(8),
  allocationRoleKeys: z.array(z.string().trim().min(1).max(64)).max(20),
});

function permitted(auth) {
  return hasWorkspacePermission(auth.workspace, auth.role, "settings.display") && hasWorkspacePermission(auth.workspace, auth.role, "team.display.manage");
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Team display settings require an Organization or Team workspace.", 409);
    if (!permitted(auth)) return fail("You do not have permission to configure team display settings.", 403);
    return ok({
      roles: auth.workspace.roles || [],
      highlightedRoleKeys: auth.workspace.highlightedRoleKeys?.length ? auth.workspace.highlightedRoleKeys : ["owner", "admin"],
      allocationRoleKeys: auth.workspace.allocationRoleKeys?.length ? auth.workspace.allocationRoleKeys : ["owner", "admin"],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (auth.workspace.type === "personal") return fail("Team display settings require an Organization or Team workspace.", 409);
    if (!permitted(auth)) return fail("You do not have permission to configure team display settings.", 403);
    const input = displaySchema.parse(await request.json());
    const roleKeys = new Set((auth.workspace.roles || []).map((role) => role.key));
    if ([...input.highlightedRoleKeys, ...input.allocationRoleKeys].some((key) => !roleKeys.has(key))) {
      return fail("Select roles saved in this workspace.", 422);
    }
    const workspace = await Workspace.findByIdAndUpdate(
      auth.workspaceId,
      { $set: input },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return ok({
      highlightedRoleKeys: workspace.highlightedRoleKeys,
      allocationRoleKeys: workspace.allocationRoleKeys,
    }, "Team and Dashboard display settings updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
