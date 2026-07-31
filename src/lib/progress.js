import Project from "@/models/Project";
import Task from "@/models/Task";

export async function recalculateProgress(projectId, workspaceId) {
  const [total, completed] = await Promise.all([
    Task.countDocuments({ projectId, workspaceId, parentTaskId: null }),
    Task.countDocuments({ projectId, workspaceId, parentTaskId: null, status: "Completed" }),
  ]);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  await Project.updateOne({ _id: projectId, workspaceId }, { $set: { progress } });
  return { progress, total, completed };
}
