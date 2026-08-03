import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import RolesSettings from "@/components/settings/RolesSettings";

export const metadata = { title: "Roles" };

export default async function RolesSettingsPage() {
  const user = await getCurrentUser();
  if (user.workspace?.type === "personal" || !hasWorkspacePermission(user.workspace, user.role, "settings.roles")) redirect("/settings");
  return <RolesSettings />;
}
