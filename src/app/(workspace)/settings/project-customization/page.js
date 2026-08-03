import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import ProjectCustomization from "@/components/settings/ProjectCustomization";

export const metadata = { title: "Project customization" };

export default async function ProjectCustomizationPage() {
  const user = await getCurrentUser();
  if (!hasWorkspacePermission(user.workspace, user.role, "settings.project_customization") || !hasWorkspacePermission(user.workspace, user.role, "workspace.manage")) redirect("/settings");
  return <ProjectCustomization />;
}
