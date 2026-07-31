import TasksView from "@/components/tasks/TasksView";
import { requirePagePermission } from "@/lib/page-access";
import { workspacePermissionKeys } from "@/lib/workspace";
export const metadata = { title: "My Tasks" };
export default async function TasksPage() {
  const user = await requirePagePermission("tasks.view");
  return <TasksView permissions={workspacePermissionKeys(user.workspace, user.role)} />;
}
