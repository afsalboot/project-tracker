"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfWeek, isBefore, isSameDay, startOfDay } from "date-fns";
import { GripVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PRIORITIES } from "@/constants/project";
import { Badge, DateText, EmptyState, FilterPanel, PageIntro } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TaskDialog from "@/components/forms/TaskDialog";
import TaskActionsMenu from "@/components/tasks/TaskActionsMenu";
import TaskExpandedContent from "@/components/tasks/TaskExpandedContent";
import SubtaskSummary from "@/components/tasks/SubtaskSummary";
import AssigneeSummary from "@/components/ui/AssigneeSummary";
import Dropdown from "@/components/ui/Dropdown";
import useProjectCustomization from "@/components/settings/useProjectCustomization";

export default function TasksView({ mode = "list", permissions = [] }) {
  const { customization, workspaceType, loading: customizationLoading } = useProjectCustomization();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recordUsers, setRecordUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [filters, setFilters] = useState({ search: "", userId: [], projectId: [], status: mode === "completed" ? ["Completed"] : [], priority: [], environment: [] });
  const canFilterUsers = permissions.includes("tasks.view_others");
  const canCreate = permissions.includes("tasks.create");
  const canEdit = permissions.includes("tasks.edit");
  const canDelete = permissions.includes("tasks.delete");
  const statusOptions = customization.taskStatuses.filter((item) => item.enabled).map((item) => item.label);
  const environmentOptions = customization.environments.filter((item) => item.enabled).map((item) => item.label);
  const showStatus = statusOptions.length > 0;
  const showEnvironment = environmentOptions.length > 0;
  const completedStatus = customization.taskStatuses.find((item) => item.id === "completed")?.label || "Completed";
  const defaultStatus = customization.taskStatuses.find((item) => item.id === "to-do" && item.enabled)?.label || statusOptions[0] || "To Do";

  useEffect(() => {
    if (mode !== "completed" || customizationLoading) return;
    const timer = setTimeout(() => setFilters((current) => current.status.length === 1 && current.status[0] === completedStatus ? current : { ...current, status: [completedStatus] }), 0);
    return () => clearTimeout(timer);
  }, [completedStatus, customizationLoading, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    const query = filterParams(filters);
    const [taskResult, projectResult] = await Promise.all([
      fetch(`/api/tasks?limit=100&${query}`).then((response) => response.json()),
      fetch("/api/projects?limit=100&sort=name").then((response) => response.json()),
    ]);
    if (taskResult.success) setTasks(taskResult.data.items); else toast.error(taskResult.message);
    if (projectResult.success) setProjects(projectResult.data.items);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!canFilterUsers) return;
    const timer = setTimeout(async () => {
      const result = await fetch("/api/workspace/record-users?scope=tasks").then((response) => response.json());
      if (result.success) setRecordUsers(result.data.users);
    }, 0);
    return () => clearTimeout(timer);
  }, [canFilterUsers]);

  async function update(taskId, status) {
    const result = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then((response) => response.json());
    result.success ? (toast.success(result.message), load()) : toast.error(result.message);
  }

  function remove(task) {
    setDeleteTask({ id: task._id, title: task.title });
  }

  async function confirmDelete() {
    const response = await fetch(`/api/tasks/${deleteTask.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteTask.title }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        toast.error("This task no longer exists. The task list has been refreshed.");
        setDeleteTask(null);
        load();
      } else toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setDeleteTask(null);
    load();
  }

  const grouped = useMemo(() => groupTasks(tasks), [tasks]);
  const title = mode === "board" ? "Task board" : mode === "completed" ? "Completed work" : "My tasks";
  const description = mode === "board" ? "Drag tasks between stages. Only task creators can move their work." : mode === "completed" ? "A searchable history of completed tasks and their delivery context." : "Plan daily work around deadlines, blockers and priority.";
  const toggle = (task) => setDetailsTask(detailsTask?._id === task._id ? null : task);
  const commonProps = { update, edit: setDialog, expandedId: detailsTask?._id, toggle, remove, permissions, onChanged: load, canEdit, canDelete, statusOptions, completedStatus, defaultStatus, showStatus, showEnvironment, showPeople: Boolean(workspaceType && workspaceType !== "personal") };

  return (
    <>
      <PageIntro eyebrow={mode === "completed" ? "History" : "Execution"} title={title} description={description} actions={canCreate && <button className="btn btn-primary" onClick={() => setDialog({})}><Plus size={17} />Add task</button>} />
      <FilterPanel
        title="Task filters"
        activeCount={(filters.search ? 1 : 0) + ["userId", "projectId", "priority", ...(showStatus ? ["status"] : []), ...(showEnvironment ? ["environment"] : [])].reduce((sum, key) => sum + filters[key].length, 0)}
        onClear={() => setFilters({ ...filters, search: "", userId: [], projectId: [], status: mode === "completed" ? [completedStatus] : [], priority: [], environment: [] })}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
          <label className="relative sm:col-span-2 xl:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input className="field search-field" aria-label="Search tasks" placeholder="Search tasks…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          {canFilterUsers && <Filter label="All creators" items={recordUsers.map((user) => [user._id, user.username ? `${user.name} (@${user.username})` : user.name])} value={filters.userId} change={(userId) => setFilters({ ...filters, userId })} />}
          <Filter label="All projects" items={projects.map((item) => [item._id, item.name])} value={filters.projectId} change={(projectId) => setFilters({ ...filters, projectId })} />
          {mode !== "completed" && showStatus && <Filter label="All statuses" items={statusOptions.map((item) => [item, item])} value={filters.status} change={(status) => setFilters({ ...filters, status })} />}
          <Filter label="All priorities" items={PRIORITIES.map((item) => [item, item])} value={filters.priority} change={(priority) => setFilters({ ...filters, priority })} />
          {showEnvironment && <Filter label="All environments" items={environmentOptions.map((item) => [item, item])} value={filters.environment} change={(environment) => setFilters({ ...filters, environment })} />}
        </div>
      </FilterPanel>

      {loading ? <div className="skeleton h-96" /> : tasks.length === 0 ? (
        <EmptyState title={mode === "completed" ? "No completed work yet" : "No tasks found"} description={mode === "completed" ? "Completed tasks will remain searchable here." : "Create a task or adjust the active filters."} />
      ) : mode === "board" && showStatus ? (
        <Board tasks={tasks} {...commonProps} />
      ) : mode === "completed" ? (
        <TaskList tasks={tasks} showCompleted {...commonProps} />
      ) : (
        <div className="space-y-6">{Object.entries(grouped).map(([group, items]) => items.length ? <section key={group}><h3 className="mb-3 text-sm font-semibold">{group} <span className="text-neutral-400">{items.length}</span></h3><TaskList tasks={items} {...commonProps} /></section> : null)}</div>
      )}

      {(canCreate || canEdit) && <TaskDialog open={Boolean(dialog)} onClose={() => setDialog(null)} task={dialog?._id ? dialog : null} projects={projects} onSaved={load} />}
      <ConfirmDialog
        key={deleteTask?.id || "task-delete"}
        open={Boolean(deleteTask)}
        title={deleteTask ? `Delete “${deleteTask.title}”?` : "Delete this task?"}
        description="This task and its recorded delivery details will be permanently removed."
        verificationText={deleteTask?.title}
        confirmLabel="Delete task"
        onClose={() => setDeleteTask(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function TaskList({ tasks, update, edit, expandedId, toggle, remove, permissions, onChanged, showCompleted, canEdit, canDelete, statusOptions, completedStatus, defaultStatus, showStatus, showEnvironment, showPeople }) {
  return <div className="space-y-3">{tasks.map((task) => (
    <article key={task._id} className="card relative overflow-visible p-4 sm:p-5">
      <div className="min-w-0 sm:pr-44">
        <button className="block max-w-full truncate text-left font-semibold hover:text-emerald-700" onClick={() => toggle(task)} aria-expanded={expandedId === task._id}>{task.title}</button>
        <p className="mt-1 truncate text-xs text-neutral-500">{task.projectId?.name || "Project"}{showEnvironment ? ` · ${task.environment}` : ""}</p>
        <SubtaskSummary task={task} className="mt-2" />
      </div>
      <div className="mt-3 flex items-center gap-2 sm:absolute sm:right-5 sm:top-4 sm:mt-0">{showStatus && <StatusPill status={task.status} />}{task.isCreator && <TaskActionsMenu task={task} canEdit={canEdit} canDelete={canDelete} canChangeStatus={showStatus && (task.status === completedStatus ? statusOptions.includes(defaultStatus) : statusOptions.includes(completedStatus))} completedStatus={completedStatus} onEdit={() => edit(task)} onToggleStatus={() => update(task._id, task.status === completedStatus ? defaultStatus : completedStatus)} onDelete={() => remove(task)} />}</div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-3">
        <Badge>{task.priority}</Badge>
        <span className="whitespace-nowrap text-xs"><DateText value={showCompleted ? task.completedDate : task.dueDate} /></span>
        {showPeople && <AssigneeSummary users={[task.userId]} empty="Creator unavailable" />}
        {showPeople && !task.isCreator && <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">View only</span>}
      </div>
      {showCompleted && task.completedDate && <p className="mt-2 text-[11px] text-neutral-400 sm:hidden">Completed {new Date(task.completedDate).toLocaleDateString()}</p>}
      {expandedId === task._id && <TaskExpandedContent task={task} permissions={permissions} onChanged={onChanged} />}
    </article>
  ))}</div>;
}

function Board({ tasks, update, edit, expandedId, toggle, remove, permissions, onChanged, canEdit, canDelete, statusOptions, completedStatus, defaultStatus, showPeople }) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropStatus, setDropStatus] = useState(null);

  function finishDrag() {
    setDraggedTaskId(null);
    setDropStatus(null);
  }

  function drop(event, status) {
    event.preventDefault();
    const task = tasks.find((item) => item._id === draggedTaskId);
    finishDrag();
    if (!task || !task.isCreator || !canEdit || task.status === status) return;
    update(task._id, status);
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]">
      <div className="grid min-w-max grid-flow-col auto-cols-[minmax(280px,320px)] items-stretch gap-4">
        {statusOptions.map((status) => {
          const items = tasks.filter((task) => task.status === status);
          const activeDrop = dropStatus === status && draggedTaskId;
          return (
            <section
              key={status}
              className={`flex min-h-[480px] snap-start flex-col rounded-2xl border p-3 transition-colors ${activeDrop ? "border-emerald-400 bg-emerald-50" : "border-neutral-200 bg-neutral-100/70"}`}
              onDragOver={(event) => {
                if (!draggedTaskId) return;
                event.preventDefault();
                setDropStatus(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropStatus(null);
              }}
              onDrop={(event) => drop(event, status)}
            >
              <div className="flex h-11 shrink-0 items-center justify-between px-1"><StatusPill status={status} /><span className="grid size-7 place-items-center rounded-full bg-white text-xs font-semibold text-neutral-600 shadow-sm">{items.length}</span></div>
              <div className="mt-2 flex flex-1 flex-col gap-3">
                {items.map((task) => {
                  const draggable = task.isCreator && canEdit;
                  return (
                    <article
                      key={task._id}
                      draggable={draggable}
                      onDragStart={(event) => {
                        if (!draggable) return event.preventDefault();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task._id);
                        setDraggedTaskId(task._id);
                      }}
                      onDragEnd={finishDrag}
                      className={`card overflow-visible p-4 transition ${draggedTaskId === task._id ? "scale-[.98] opacity-45" : "hover:-translate-y-0.5 hover:shadow-md"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {draggable && <GripVertical size={17} className="mt-0.5 shrink-0 text-neutral-300" aria-label="Drag task" />}
                        <button className="line-clamp-2 min-h-10 min-w-0 flex-1 text-left font-semibold leading-5 hover:text-emerald-700" onClick={() => toggle(task)} aria-expanded={expandedId === task._id}>{task.title}</button>
                        {task.isCreator && <TaskActionsMenu task={task} canEdit={canEdit} canDelete={canDelete} canChangeStatus={task.status === completedStatus ? statusOptions.includes(defaultStatus) : statusOptions.includes(completedStatus)} completedStatus={completedStatus} onEdit={() => edit(task)} onToggleStatus={() => update(task._id, task.status === completedStatus ? defaultStatus : completedStatus)} onDelete={() => remove(task)} />}
                      </div>
                      <p className="mt-2 truncate text-xs font-medium text-neutral-500">{task.projectId?.name || "Project"}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2"><Badge>{task.priority}</Badge><span className="ml-auto whitespace-nowrap text-xs text-neutral-500"><DateText value={task.dueDate} /></span></div>
                      <div className="mt-3 border-t border-neutral-100 pt-3"><SubtaskSummary task={task} />{showPeople && <AssigneeSummary users={[task.userId]} empty="Creator unavailable" className="mt-2" />}</div>
                      {showPeople && !task.isCreator && <p className="mt-3 rounded-lg bg-neutral-50 px-2.5 py-2 text-[11px] font-medium text-neutral-400">Project access · View only</p>}
                      {expandedId === task._id && <TaskExpandedContent task={task} permissions={permissions} onChanged={onChanged} />}
                    </article>
                  );
                })}
                {items.length === 0 && <div className={`grid min-h-36 flex-1 place-items-center rounded-xl border border-dashed px-4 text-center text-xs ${activeDrop ? "border-emerald-400 bg-white text-emerald-700" : "border-neutral-300 bg-white/50 text-neutral-400"}`}>{activeDrop ? `Move task to ${status}` : "No tasks in this status"}</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "Blocked" ? "border-red-200 bg-red-50 text-red-700" : status === "In Progress" ? "border-blue-200 bg-blue-50 text-blue-700" : status === "Testing" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-neutral-200 bg-white text-neutral-600";
  return <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone}`}>{status}</span>;
}

function groupTasks(tasks) {
  const now = startOfDay(new Date()), tomorrow = addDays(now, 1), weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const groups = { Overdue: [], Today: [], Tomorrow: [], "This Week": [], "No Due Date": [], Later: [] };
  for (const task of tasks) {
    if (!task.dueDate) groups["No Due Date"].push(task);
    else {
      const due = new Date(task.dueDate);
      if (isBefore(due, now)) groups.Overdue.push(task);
      else if (isSameDay(due, now)) groups.Today.push(task);
      else if (isSameDay(due, tomorrow)) groups.Tomorrow.push(task);
      else if (due <= weekEnd) groups["This Week"].push(task);
      else groups.Later.push(task);
    }
  }
  return groups;
}

function Filter({ label, items, value, change }) {
  return <Dropdown multiple ariaLabel={label} value={value} onChange={change} placeholder={label} options={items} />;
}

function filterParams(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value) && value.length) value.forEach((item) => params.append(key, item));
    else if (!Array.isArray(value) && value) params.set(key, value);
  }
  return params;
}
