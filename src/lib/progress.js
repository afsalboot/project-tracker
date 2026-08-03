import Project from "@/models/Project";
import Task from "@/models/Task";
import Workspace from "@/models/Workspace";
import { completedTaskStatus } from "@/lib/customization";

export async function recalculateProgress(projectId, workspaceId) {
  const workspace = await Workspace.findById(workspaceId).select("customization").lean();
  const completedStatus = completedTaskStatus(workspace);
  const [total, completed] = await Promise.all([
    Task.countDocuments({ projectId, workspaceId, parentTaskId: null }),
    Task.countDocuments({ projectId, workspaceId, parentTaskId: null, status: completedStatus }),
  ]);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  await Project.updateOne({ _id: projectId, workspaceId }, { $set: { progress } });
  return { progress, total, completed };
}
