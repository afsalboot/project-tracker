"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { PRIORITIES } from "@/constants/project";
import { TASK_STATUSES } from "@/constants/task";
import { Badge, DateText } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TaskDialog from "@/components/forms/TaskDialog";
import TaskActionsMenu from "@/components/tasks/TaskActionsMenu";
import TaskCommentsPanel from "@/components/tasks/TaskCommentsPanel";
import Dropdown from "@/components/ui/Dropdown";

const emptySubtask = { title: "", description: "", status: "To Do", priority: "Medium", dueDate: "" };

export default function TaskExpandedContent({ task, permissions = [], onChanged }) {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [subtask, setSubtask] = useState(emptySubtask);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const canCreate = permissions.includes("tasks.create") && task.isCreator;
  const canEdit = permissions.includes("tasks.edit");
  const canDelete = permissions.includes("tasks.delete");
  const taskId = task._id;
  const projectId = task.projectId?._id || task.projectId;

  const load = useCallback(async () => {
    const response = await fetch(`/api/tasks/${taskId}/subtasks`);
    const result = await response.json();
    if (response.ok) setSubtasks(result.data.subtasks);
    else toast.error(result.message);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function addSubtask(event) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subtask),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setSubtask(emptySubtask);
    setShowAdd(false);
    load();
    onChanged?.();
  }

  async function updateStatus(target, status) {
    const response = await fetch(`/api/tasks/${target._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    load();
    onChanged?.();
  }

  async function deleteSubtask() {
    const response = await fetch(`/api/tasks/${deleteTarget._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteTarget.title }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setDeleteTarget(null);
    load();
    onChanged?.();
  }

  return (
    <>
      <div className="col-span-full space-y-4 border-t border-neutral-100 bg-neutral-50/70 p-4 sm:p-5">
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap gap-2"><Badge>{task.status}</Badge><Badge>{task.priority}</Badge><span className="inline-flex items-center gap-1 text-xs text-neutral-500"><CalendarDays size={14} /><DateText value={task.dueDate} /></span></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{task.description || "No task description."}</p>
        </section>

        <section className="overflow-visible rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-4 sm:px-5">
            <div><h3 className="font-semibold">Subtasks</h3><p className="text-xs text-neutral-500">{subtasks.filter((item) => item.status === "Completed").length} of {subtasks.length} completed</p></div>
            {canCreate && <button className="btn btn-primary" onClick={() => setShowAdd((value) => !value)}><Plus size={15} />Add subtask</button>}
          </div>

          {showAdd && canCreate && (
            <form className="grid gap-3 border-b border-neutral-100 bg-neutral-50/70 p-4 sm:grid-cols-2 sm:p-5" onSubmit={addSubtask}>
              <label className="sm:col-span-2"><span className="label">Subtask title</span><input className="field" required minLength={2} value={subtask.title} onChange={(event) => setSubtask({ ...subtask, title: event.target.value })} /></label>
              <label><span className="label">Status</span><Dropdown value={subtask.status} onChange={(status) => setSubtask({ ...subtask, status })} options={TASK_STATUSES} /></label>
              <label><span className="label">Priority</span><Dropdown value={subtask.priority} onChange={(priority) => setSubtask({ ...subtask, priority })} options={PRIORITIES} /></label>
              <label><span className="label">Due date</span><input className="field" type="date" value={subtask.dueDate} onChange={(event) => setSubtask({ ...subtask, dueDate: event.target.value })} /></label>
              <label className="sm:col-span-2"><span className="label">Description</span><textarea className="field min-h-24" value={subtask.description} onChange={(event) => setSubtask({ ...subtask, description: event.target.value })} /></label>
              <div className="flex gap-2 sm:col-span-2 sm:justify-end"><button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary flex-1 sm:flex-none" disabled={saving}>{saving ? "Adding…" : "Add subtask"}</button></div>
            </form>
          )}

          {loading ? <div className="p-5"><div className="skeleton h-28" /></div> : subtasks.length ? (
            <div className="divide-y divide-neutral-100">
              {subtasks.map((item) => (
                <details key={item._id}>
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><div className="mt-1 flex items-center gap-2 text-xs text-neutral-500"><Badge>{item.priority}</Badge><DateText value={item.dueDate} /></div></div>
                    <Badge>{item.status}</Badge>
                    {item.isCreator && <div className="col-span-2 justify-self-end sm:col-span-1">
                      <TaskActionsMenu task={item} canEdit={canEdit} canDelete={canDelete} onEdit={() => setEditTarget(item)} onToggleStatus={() => updateStatus(item, item.status === "Completed" ? "To Do" : "Completed")} onDelete={() => setDeleteTarget(item)} />
                    </div>}
                  </summary>
                  <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 sm:px-5">
                    {item.description && <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{item.description}</p>}
                    <TaskCommentsPanel taskId={item._id} permissions={permissions} readOnly={!item.isCreator} />
                  </div>
                </details>
              ))}
            </div>
          ) : <p className="p-5 text-sm text-neutral-500">No subtasks yet. Break this task into smaller deliverables.</p>}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <TaskCommentsPanel taskId={taskId} permissions={permissions} heading="Main task comments" readOnly={!task.isCreator} />
        </section>
      </div>

      {editTarget && <TaskDialog open task={editTarget} projectId={projectId} onClose={() => setEditTarget(null)} onSaved={() => { load(); onChanged?.(); }} />}
      <ConfirmDialog key={deleteTarget?._id || "subtask-delete"} open={Boolean(deleteTarget)} title={deleteTarget ? `Delete “${deleteTarget.title}”?` : "Delete this subtask?"} description="The subtask and all of its comments will be permanently deleted." verificationText={deleteTarget?.title} confirmLabel="Delete subtask" onClose={() => setDeleteTarget(null)} onConfirm={deleteSubtask} />
    </>
  );
}
