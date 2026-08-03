import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import UsersSettings from "@/components/settings/UsersSettings";

export const metadata = { title: "Users and access" };

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();
  if (user.workspace?.type === "personal") redirect("/settings");
  if (!hasWorkspacePermission(user.workspace, user.role, "settings.users")) redirect("/settings");
  const canAccess = ["members.view", "members.create", "members.manage"].some(
    (permission) =>
      hasWorkspacePermission(user.workspace, user.role, permission),
  );
  if (!canAccess) redirect("/settings");
  return <UsersSettings />;
}
