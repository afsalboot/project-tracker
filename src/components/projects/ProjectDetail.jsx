"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Check, Clipboard, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge, DateText, EmptyState, Progress } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TaskDialog from "@/components/forms/TaskDialog";
import TaskActionsMenu from "@/components/tasks/TaskActionsMenu";
import TaskExpandedContent from "@/components/tasks/TaskExpandedContent";
import SubtaskSummary from "@/components/tasks/SubtaskSummary";
import AssigneeSummary from "@/components/ui/AssigneeSummary";
import ProjectDialog from "@/components/forms/ProjectDialog";
import Dropdown from "@/components/ui/Dropdown";
import useProjectCustomization from "@/components/settings/useProjectCustomization";
import { projectPlatformName, projectZohoPlatforms } from "@/lib/customization";

export default function ProjectDetail({ projectId, permissions = [] }) {
  const { customization, workspaceType } = useProjectCustomization();
  const showPeople = Boolean(workspaceType && workspaceType !== "personal");
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState([]);
  const [search, setSearch] = useState("");
  const canEditProject = permissions.includes("projects.edit");
  const canCompleteProject = canEditProject && Boolean(customization.projectStages.find((item) => item.id === "completed")?.enabled);
  const canArchiveProject = permissions.includes("projects.archive");
  const canViewTasks = permissions.includes("tasks.view");
  const canCreateTasks = permissions.includes("tasks.create");
  const canEditTasks = permissions.includes("tasks.edit");
  const canDeleteTasks = permissions.includes("tasks.delete");
  const stageOptions = customization.projectStages.filter((item) => item.enabled).map((item) => item.label);
  const statusOptions = customization.taskStatuses.filter((item) => item.enabled).map((item) => item.label);
  const showStage = stageOptions.length > 0;
  const showStatus = statusOptions.length > 0;
  const showEnvironment = customization.environments.some((item) => item.enabled);
  const showProjectTypes = customization.projectTypes.some((item) => item.enabled);
  const showProjectPlatform = customization.projectPlatforms.some((item) => item.enabled);
  const showZohoPlatform = customization.zohoPlatforms.some((item) => item.enabled);
  const completedStatus = customization.taskStatuses.find((item) => item.id === "completed")?.label || "Completed";
  const defaultStatus = customization.taskStatuses.find((item) => item.id === "to-do" && item.enabled)?.label || statusOptions[0] || "To Do";
  const blockedStatus = customization.taskStatuses.find((item) => item.id === "blocked")?.label || "Blocked";
  const load = useCallback(async () => {
    const result = await fetch(`/api/projects/${projectId}`).then((response) => response.json());
    if (!result.success) return toast.error(result.message);
    setData(result.data);
  }, [projectId]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (canEditProject && new URLSearchParams(window.location.search).get("edit") === "1") {
        setEditProjectOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [canEditProject]);

  function closeProjectEdit() {
    setEditProjectOpen(false);
    if (window.location.search.includes("edit=1")) {
      window.history.replaceState({}, "", `/projects/${projectId}`);
    }
  }

  async function mutate(path, body) {
    const response = await fetch(`/api/projects/${projectId}/${path}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message); load();
  }
  async function updateTask(taskId, status) {
    const result = await fetch(`/api/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((response) => response.json());
    result.success ? (toast.success(result.message), load()) : toast.error(result.message);
  }
  function requestTaskDelete(task) {
    setDeleteTask({ id: task._id, title: task.title });
  }
  async function confirmTaskDelete() {
    const response = await fetch(`/api/tasks/${deleteTask.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteTask.title }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        toast.error("This task no longer exists. The project has been refreshed.");
        setDeleteTask(null);
        load();
      } else {
        toast.error(result.message);
      }
      return;
    }
    toast.success(result.message);
    setDeleteTask(null);
    load();
  }

  if (!data) return <div className="space-y-4"><div className="skeleton h-44" /><div className="skeleton h-96" /></div>;
  const { project, tasks, stats } = data;
  const visibleTasks = tasks.filter((task) => (!statusFilter.length || statusFilter.includes(task.status)) && (!search || task.title.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <section className="card p-4 sm:p-5 md:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0"><div className="flex flex-wrap gap-2">{project.isArchived && <Badge className="border-neutral-300 bg-neutral-100 text-neutral-700">Archived</Badge>}{showStage && <Badge>{project.stage}</Badge>}<Badge>{project.priority}</Badge>{showEnvironment && <Badge>{project.environment}</Badge>}</div><h2 className="mt-4 break-words text-xl font-semibold sm:text-2xl">{project.name}</h2><p className="mt-1 break-words text-sm text-neutral-500">{project.clientName || "Personal project"}{showProjectPlatform ? ` · ${projectPlatformName(project)}` : ""}{showProjectPlatform && showZohoPlatform && projectZohoPlatforms(project).length ? ` · ${projectZohoPlatforms(project).join(", ")}` : ""}</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{canEditProject && <button onClick={() => setEditProjectOpen(true)} className="btn btn-secondary w-full sm:w-auto"><Pencil size={16} />Edit</button>}{canCreateTasks && <button className="btn btn-secondary w-full sm:w-auto" onClick={() => setDialog({})}><Plus size={16} />Add task</button>}{canCompleteProject && !project.isArchived && <button className="btn btn-primary w-full sm:w-auto" onClick={() => mutate("complete")}><Check size={16} />Complete</button>}{canArchiveProject && <button className="btn btn-secondary w-full sm:w-auto" aria-label={project.isArchived ? "Restore project" : "Archive project"} onClick={() => mutate("archive")}><Archive size={16} />{project.isArchived ? "Restore" : "Archive"}</button>}</div>
        </div>
        <div className="mt-7 max-w-2xl"><Progress value={project.progress} /><p className="mt-2 text-xs text-neutral-500">{stats.completed} of {stats.total} tasks completed · {stats.blocked} blocked · {stats.testing} testing</p></div>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-neutral-100 pt-5 text-sm"><Info label="Start date"><DateText value={project.startDate} /></Info><Info label="Due date"><DateText value={project.dueDate} /></Info>{showProjectTypes && <Info label="Project types">{project.projectTypes?.join(", ") || "Not specified"}</Info>}{showPeople && <Info label="Assigned users"><AssigneeSummary users={project.assignedUserIds} /></Info>}<Info label="Last updated">{new Date(project.updatedAt).toLocaleDateString()}</Info></div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-4 sm:p-5"><h3 className="font-semibold">Overview</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">{project.description || "No project description."}</p>{project.notes && <Technical label="Project notes" value={project.notes} />}{(project.zohoUrl || project.repositoryUrl) && <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">{project.zohoUrl && <a className="btn btn-secondary w-full sm:w-auto" target="_blank" rel="noreferrer" href={project.zohoUrl}><ExternalLink size={15} />Open project link</a>}{project.repositoryUrl && <a className="btn btn-secondary w-full sm:w-auto" target="_blank" rel="noreferrer" href={project.repositoryUrl}><ExternalLink size={15} />Open repository</a>}</div>}</section>
        <aside>
          {showStage && <section className="card p-5"><h3 className="font-semibold">Project stage</h3><Dropdown className="mt-3" disabled={!canEditProject} value={stageOptions.includes(project.stage) ? project.stage : ""} placeholder="Select an enabled stage" onChange={(stage) => mutate("stage", { stage })} options={stageOptions} /></section>}
        </aside>
        {canViewTasks && <section className="min-w-0 xl:col-span-2">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:flex"><label className="relative col-span-2 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input className="field search-field" placeholder="Search tasks…" aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} /></label>{showStatus && <Dropdown multiple className="sm:w-52" ariaLabel="Filter task status" value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" options={statusOptions} />}{canCreateTasks && <button className="btn btn-primary shrink-0" onClick={() => setDialog({})}><Plus size={16} />Add task</button>}</div>
          {visibleTasks.length ? <div className="space-y-3">{visibleTasks.map((task) => <TaskRow key={task._id} task={task} update={updateTask} edit={() => setDialog(task)} expanded={detailsTask?._id === task._id} toggle={() => setDetailsTask(detailsTask?._id === task._id ? null : task)} remove={requestTaskDelete} permissions={permissions} onChanged={load} canEdit={canEditTasks} canDelete={canDeleteTasks} statusOptions={statusOptions} completedStatus={completedStatus} defaultStatus={defaultStatus} blockedStatus={blockedStatus} showStatus={showStatus} showPeople={showPeople} />)}</div> : <EmptyState title="No tasks found" description="Add the first task or change the current filters." />}
        </section>}
      </div>
      {(canCreateTasks || canEditTasks) && <TaskDialog open={Boolean(dialog)} onClose={() => setDialog(null)} projectId={projectId} task={dialog?._id ? dialog : null} onSaved={load} />}
      {canEditProject && <ProjectDialog
        open={editProjectOpen}
        projectId={projectId}
        onClose={closeProjectEdit}
        onSaved={() => {
          closeProjectEdit();
          load();
        }}
      />}
      <ConfirmDialog
        key={deleteTask?.id || "project-task-delete"}
        open={Boolean(deleteTask)}
        title={deleteTask ? `Delete “${deleteTask.title}”?` : "Delete this task?"}
        description="This task and its technical and delivery details will be permanently removed from the project."
        verificationText={deleteTask?.title}
        confirmLabel="Delete task"
        onClose={() => setDeleteTask(null)}
        onConfirm={confirmTaskDelete}
      />
    </>
  );
}

function TaskRow({ task, update, edit, expanded, toggle, remove, permissions, onChanged, canEdit, canDelete, statusOptions, completedStatus, defaultStatus, blockedStatus, showStatus, showPeople }) {
  return (
    <article className="card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_44px]">
        <div className="min-w-0">
          <button className="block max-w-full truncate text-left font-semibold hover:text-emerald-700" onClick={toggle} aria-expanded={expanded}>{task.title}</button>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <Badge>{task.priority}</Badge>
            <DateText value={task.dueDate} />
            {task.moduleApiName && <code className="max-w-44 truncate rounded bg-neutral-100 px-2 py-1">{task.moduleApiName}</code>}
          </div>
          <SubtaskSummary task={task} className="mt-2" />
          {showStatus && task.status === blockedStatus && task.blockerReason && <p className="mt-2 line-clamp-2 text-xs text-red-600">{task.blockerReason}</p>}
        </div>
        <div className="row-start-2 flex flex-wrap items-center gap-3 sm:row-auto">{showStatus && <Badge>{task.status}</Badge>}{showPeople && <AssigneeSummary users={[task.userId]} empty="Creator unavailable" />}{showPeople && !task.isCreator && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">View only</span>}</div>
        <div className="col-start-2 row-start-1 sm:col-start-3 sm:row-auto">{task.isCreator && <TaskActionsMenu task={task} canEdit={canEdit} canDelete={canDelete} canChangeStatus={task.status === completedStatus ? statusOptions.includes(defaultStatus) : statusOptions.includes(completedStatus)} onEdit={edit} completedStatus={completedStatus} onToggleStatus={() => update(task._id, task.status === completedStatus ? defaultStatus : completedStatus)} onDelete={() => remove(task)} />}</div>
      </div>
      {expanded && <><TaskExpandedContent task={task} permissions={permissions} onChanged={onChanged} />{["functionName","workflowName","moduleApiName","fieldApiNames","webhookEvent","connectionName","testPayload","errorLogs"].some((key) => task[key]?.length) && <details className="border-t border-neutral-100 p-4"><summary className="cursor-pointer text-xs font-semibold text-neutral-500">Technical details</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{["functionName","workflowName","moduleApiName","fieldApiNames","webhookEvent","connectionName","testPayload","errorLogs"].map((key) => task[key]?.length ? <Technical key={key} label={key.replace(/([A-Z])/g, " $1")} value={Array.isArray(task[key]) ? task[key].join(", ") : task[key]} /> : null)}</div></details>}</>}
    </article>
  );
}
function Technical({ label, value }) { return <div className="mt-3 rounded-lg bg-neutral-50 p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold capitalize text-neutral-500">{label}</p><button aria-label={`Copy ${label}`} onClick={() => navigator.clipboard.writeText(value)}><Clipboard size={14} /></button></div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{value}</pre></div>; }
function Info({ label, children }) { return <div><p className="text-xs text-neutral-400">{label}</p><div className="mt-1 font-medium">{children}</div></div>; }
