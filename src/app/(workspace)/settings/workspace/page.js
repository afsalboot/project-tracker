import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import WorkspaceEditor from "@/components/settings/WorkspaceEditor";

export const metadata = { title: "Workspace settings" };

export default async function WorkspaceSettingsPage() {
  const user = await getCurrentUser();
  if (!hasWorkspacePermission(user.workspace, user.role, "settings.workspace") || !hasWorkspacePermission(user.workspace, user.role, "workspace.manage")) {
    redirect("/settings");
  }
  return <WorkspaceEditor />;
}
