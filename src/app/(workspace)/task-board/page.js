import TasksView from "@/components/tasks/TasksView";
import { requirePagePermission } from "@/lib/page-access";
import { workspacePermissionKeys } from "@/lib/workspace";
export const metadata = { title: "Task Board" };
export default async function TaskBoardPage() {
  const user = await requirePagePermission("tasks.view");
  return <TasksView mode="board" permissions={workspacePermissionKeys(user.workspace, user.role)} />;
}
