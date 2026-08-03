import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import RolePermissions from "@/components/settings/RolePermissions";

export const metadata = { title: "Role permissions" };

export default async function RolePermissionsPage({ params }) {
  const user = await getCurrentUser();
  if (user.workspace?.type === "personal" || !hasWorkspacePermission(user.workspace, user.role, "settings.roles")) redirect("/settings");
  const { roleKey } = await params;
  return <RolePermissions roleKey={roleKey} />;
}
