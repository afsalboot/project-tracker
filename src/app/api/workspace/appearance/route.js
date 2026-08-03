import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { canManageWorkspace, hasWorkspacePermission } from "@/lib/workspace";
import { DEFAULT_SIDEBAR_THEME, SIDEBAR_THEMES } from "@/constants/appearance";
import Workspace from "@/models/Workspace";

export const runtime = "nodejs";

const appearanceSchema = z.object({
  sidebarTheme: z.enum(SIDEBAR_THEMES.map((theme) => theme.id)),
});

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.appearance")) return fail("You do not have permission to view appearance settings.", 403);
    return ok({ sidebarTheme: auth.workspace.sidebarTheme || DEFAULT_SIDEBAR_THEME });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.appearance")) return fail("You do not have permission to view appearance settings.", 403);
    if (!canManageWorkspace(auth.role, auth.workspace)) {
      return fail("Only workspace owners and admins can change appearance.", 403);
    }
    const input = appearanceSchema.parse(await request.json());
    const workspace = await Workspace.findByIdAndUpdate(
      auth.workspaceId,
      { $set: { sidebarTheme: input.sidebarTheme } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return ok({ sidebarTheme: workspace.sidebarTheme }, "Sidebar appearance updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
