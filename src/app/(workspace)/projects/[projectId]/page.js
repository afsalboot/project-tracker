import ProjectDetail from "@/components/projects/ProjectDetail";
import { requirePagePermission } from "@/lib/page-access";
import { workspacePermissionKeys } from "@/lib/workspace";
export const metadata = { title: "Project details" };
export default async function ProjectPage({ params }) {
  const user = await requirePagePermission("projects.view");
  const { projectId } = await params;
  return <ProjectDetail projectId={projectId} permissions={workspacePermissionKeys(user.workspace, user.role)} />;
}
