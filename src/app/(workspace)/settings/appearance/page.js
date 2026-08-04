import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import AppearanceSettings from "@/components/settings/AppearanceSettings";

export const metadata = { title: "Appearance settings" };

export default async function AppearanceSettingsPage() {
  const user = await getCurrentUser();
  if (!hasWorkspacePermission(user.workspace, user.role, "settings.appearance") || !hasWorkspacePermission(user.workspace, user.role, "workspace.manage")) {
    redirect("/settings");
  }
  return <AppearanceSettings initialTheme={user.workspace.sidebarTheme} initialMode={user.workspace.colorMode} />;
}
