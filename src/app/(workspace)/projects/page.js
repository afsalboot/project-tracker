import ProjectsView from "@/components/projects/ProjectsView";
import { requirePagePermission } from "@/lib/page-access";
import { workspacePermissionKeys } from "@/lib/workspace";
export const metadata = { title: "Projects" };
export default async function ProjectsPage() {
  const user = await requirePagePermission("projects.view");
  return <ProjectsView permissions={workspacePermissionKeys(user.workspace, user.role)} />;
}
