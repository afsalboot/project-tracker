"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Check, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PRIORITIES } from "@/constants/project";
import { Badge, DateText, EmptyState, FilterPanel, PageIntro, Progress } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProjectDialog from "@/components/forms/ProjectDialog";
import AssigneeSummary from "@/components/ui/AssigneeSummary";
import Dropdown from "@/components/ui/Dropdown";
import SearchField from "@/components/ui/SearchField";
import useProjectCustomization from "@/components/settings/useProjectCustomization";
import { projectPlatformName, projectZohoPlatforms } from "@/lib/customization";

export default function ProjectsView({ permissions = [] }) {
  const { customization, workspaceType } = useProjectCustomization();
  const showAssignments = Boolean(workspaceType && workspaceType !== "personal");
  const [data, setData] = useState([]);
  const [recordUsers, setRecordUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [filters, setFilters] = useState({ search: "", userId: [], stage: [], priority: [], projectPlatform: [], zohoProduct: [], projectType: [], environment: [], sort: "updated", view: "active" });
  const canFilterUsers = permissions.includes("projects.view_others");
  const capabilities = {
    create: permissions.includes("projects.create"),
    edit: permissions.includes("projects.edit"),
    complete: permissions.includes("projects.edit") && Boolean(customization.projectStages.find((item) => item.id === "completed")?.enabled),
    archive: permissions.includes("projects.archive"),
    delete: permissions.includes("projects.delete"),
  };
  const availableProjectTypes = customization.projectTypes.filter((item) => item.enabled).map((item) => item.label);
  const visibility = {
    stage: customization.projectStages.some((item) => item.enabled),
    projectPlatform: customization.projectPlatforms.some((item) => item.enabled),
    zohoProduct: customization.zohoPlatforms.some((item) => item.enabled),
    projectType: availableProjectTypes.length > 0,
    environment: customization.environments.some((item) => item.enabled),
  };
  const visibleFilterKeys = ["stage", "projectPlatform", "zohoProduct", "projectType", "environment"].filter((key) => visibility[key]);

  const load = useCallback(async () => {
    setLoading(true);
    const query = filterParams(filters);
    const result = await fetch(`/api/projects?${query}`).then((response) => response.json());
    if (result.success) setData(result.data.items);
    else toast.error(result.message);
    setLoading(false);
  }, [filters]);

  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!canFilterUsers) return;
    const timer = setTimeout(async () => {
      const result = await fetch("/api/workspace/record-users?scope=projects").then((response) => response.json());
      if (result.success) setRecordUsers(result.data.users);
    }, 0);
    return () => clearTimeout(timer);
  }, [canFilterUsers]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (capabilities.create && new URLSearchParams(window.location.search).get("create") === "1") {
        setCreateOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [capabilities.create]);
  function closeCreate() {
    setCreateOpen(false);
    if (window.location.search.includes("create=1")) {
      window.history.replaceState({}, "", "/projects");
    }
  }

  function action(id, type, name) {
    if (type === "delete") {
      setDeleteProject({ id, name });
      return;
    }
    runAction(id, type);
  }

  async function runAction(id, type, confirmation) {
    const endpoint = type === "delete" ? `/api/projects/${id}` : `/api/projects/${id}/${type}`;
    const response = await fetch(endpoint, {
      method: type === "delete" ? "DELETE" : "PATCH",
      ...(type === "delete" && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 404 && type === "delete") {
        toast.error("This project no longer exists. The project list has been refreshed.");
        setDeleteProject(null);
        load();
      } else {
        toast.error(result.message);
      }
      return false;
    }
    toast.success(result.message);
    load();
    return true;
  }

  return (
    <>
      <PageIntro eyebrow="Portfolio" title="All projects" description="Track general projects and Zoho customizations in one workspace." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-xl border border-neutral-200 bg-white p-1" aria-label="Project status filter">
          {[["active", "Active"], ["archived", "Archive"], ...(permissions.includes("completed.view") ? [["completed", "Complete"]] : []), ["all", "All"]].map(([value, label]) => (
            <button
              key={label}
              className={`min-h-9 rounded-lg px-4 text-sm font-semibold transition ${filters.view === value ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"}`}
              onClick={() => setFilters({ ...filters, view: value })}
            >
              {label}
            </button>
          ))}
        </div>
        {capabilities.create && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} />New project</button>}
      </div>
      <FilterPanel
        title="Project filters"
        activeCount={(filters.search ? 1 : 0) + ["userId", "priority", ...visibleFilterKeys].reduce((sum, key) => sum + filters[key].length, 0)}
        onClear={() => setFilters({ ...filters, search: "", userId: [], stage: [], priority: [], projectPlatform: [], zohoProduct: [], projectType: [], environment: [] })}
      >
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.85)]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(220px,1.6fr)_repeat(8,minmax(130px,1fr))]">
            <SearchField ariaLabel="Search projects" inputClassName="!min-h-10 !rounded-xl !border-white/80 !bg-white/90 !py-1.5 shadow-sm" placeholder="Search projects or clients…" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} />
            {canFilterUsers && <Filter label="All users" options={recordUsers.map((user) => [user._id, user.username ? `${user.name} (@${user.username})` : user.name])} value={filters.userId} onChange={(userId) => setFilters({ ...filters, userId })} />}
            {visibility.stage && <Filter label="All stages" values={customization.projectStages.filter((item) => item.enabled).map((item) => item.label)} value={filters.stage} onChange={(stage) => setFilters({ ...filters, stage })} />}
            <Filter label="All priorities" values={PRIORITIES} value={filters.priority} onChange={(priority) => setFilters({ ...filters, priority })} />
            {visibility.projectPlatform && <Filter label="All project platforms" values={customization.projectPlatforms.filter((item) => item.enabled).map((item) => item.label)} value={filters.projectPlatform} onChange={(projectPlatform) => setFilters({ ...filters, projectPlatform })} />}
            {visibility.projectPlatform && visibility.zohoProduct && <Filter label="All Zoho platforms" values={customization.zohoPlatforms.filter((item) => item.enabled).map((item) => item.label)} value={filters.zohoProduct} onChange={(zohoProduct) => setFilters({ ...filters, zohoProduct })} />}
            {visibility.projectType && <Filter label="All types" values={availableProjectTypes} value={filters.projectType} onChange={(projectType) => setFilters({ ...filters, projectType })} />}
            {visibility.environment && <Filter label="All environments" values={customization.environments.filter((item) => item.enabled).map((item) => item.label)} value={filters.environment} onChange={(environment) => setFilters({ ...filters, environment })} />}
            <Dropdown ariaLabel="Sort projects" className="text-xs [&_.field]:!min-h-10 [&_.field]:!rounded-xl [&_.field]:!border-white/80 [&_.field]:!bg-white/90 [&_.field]:!py-1.5 [&_.field]:shadow-sm" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} options={[["updated", "Recently updated"], ["due", "Due date"], ["name", "Project name"], ["created", "Newest"]]} />
          </div>
          <ProjectFilterChips filters={filters} setFilters={setFilters} recordUsers={recordUsers} />
        </div>
      </FilterPanel>
      {loading ? <div className="space-y-3">{[1,2,3,4].map((item) => <div className="skeleton h-40" key={item} />)}</div> :
      data.length === 0 ? <ProjectEmptyState view={filters.view} canCreate={capabilities.create} onCreate={() => setCreateOpen(true)} /> :
      <ProjectTable projects={data} action={action} edit={setEditId} capabilities={capabilities} showAssignments={showAssignments} visibility={visibility} />}
      {capabilities.create && <ProjectDialog
        open={createOpen}
        onClose={closeCreate}
        onSaved={() => {
          closeCreate();
          load();
        }}
      />}
      {capabilities.edit && <ProjectDialog
        open={Boolean(editId)}
        projectId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => {
          setEditId(null);
          load();
        }}
      />}
      <ConfirmDialog
        key={deleteProject?.id || "project-delete"}
        open={Boolean(deleteProject)}
        title={deleteProject ? `Delete “${deleteProject.name}”?` : "Delete this project?"}
        description="The active project and every task inside it will be permanently deleted."
        verificationText={deleteProject?.name}
        confirmLabel="Delete project"
        onClose={() => setDeleteProject(null)}
        onConfirm={async () => {
          if (await runAction(deleteProject.id, "delete", deleteProject.name)) {
            setDeleteProject(null);
          }
        }}
      />
    </>
  );
}

function ProjectTable({ projects, action, edit, capabilities, showAssignments, visibility }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {projects.map((project) => (
          <article className="card p-4" key={project._id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="block truncate font-semibold" href={`/projects/${project._id}`}>{project.name}</Link>
                <p className="mt-1 truncate text-xs text-neutral-500">{project.clientName || (visibility.projectPlatform ? projectPlatformName(project) : "Personal project")}{visibility.projectPlatform && visibility.zohoProduct && projectZohoPlatforms(project).length ? ` · ${projectZohoPlatforms(project).join(", ")}` : ""}</p>
                {showAssignments && <AssigneeSummary users={project.assignedUsers} className="mt-2" />}
              </div>
              <Actions project={project} action={action} edit={() => edit(project._id)} capabilities={capabilities} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.isArchived && <Badge className="border-neutral-300 bg-neutral-100 text-neutral-700">Archived</Badge>}
              {visibility.stage && <Badge>{project.stage}</Badge>}
              <Badge>{project.priority}</Badge>
            </div>
            <div className="mt-4"><Progress value={project.progress} /></div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              {visibility.environment && <span className="text-neutral-500">{project.environment}</span>}
              <DateText value={project.dueDate} />
            </div>
          </article>
        ))}
      </div>
      <div className="card hidden overflow-visible md:block">
      <table className="w-full min-w-[980px] table-fixed text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
          <tr>
            {["Project", ...(visibility.stage ? ["Stage"] : []), "Priority", "Progress", "Due", ...(visibility.environment ? ["Environment"] : [])].map((label) => (
              <th className="px-5 py-4 font-semibold" key={label}>{label}</th>
            ))}
            <th className="px-3 py-4" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr className="border-b border-neutral-100 last:border-0" key={project._id}>
              <td className="px-5 py-5">
                <Link className="block truncate font-semibold hover:text-emerald-700" href={`/projects/${project._id}`}>{project.name}</Link>
                <p className="mt-1 truncate text-xs text-neutral-500">{project.clientName || (visibility.projectPlatform ? projectPlatformName(project) : "Personal project")}{visibility.projectPlatform && visibility.zohoProduct && projectZohoPlatforms(project).length ? ` · ${projectZohoPlatforms(project).join(", ")}` : ""}</p>
                {showAssignments && <AssigneeSummary users={project.assignedUsers} className="mt-2" />}
              </td>
              {visibility.stage && <td className="px-5 py-5"><Badge>{project.stage}</Badge></td>}
              <td className="px-5 py-5"><Badge>{project.priority}</Badge></td>
              <td className="px-5 py-5"><div className="min-w-40"><Progress value={project.progress} /></div></td>
              <td className="whitespace-nowrap px-5 py-5"><DateText value={project.dueDate} /></td>
              {visibility.environment && <td className="px-5 py-5">{project.environment}</td>}
              <td className="px-3 py-5"><Actions project={project} action={action} edit={() => edit(project._id)} capabilities={capabilities} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
function Actions({ project, action, edit, capabilities }) {
  if (!capabilities.edit && !capabilities.archive && !capabilities.delete) return null;
  return <details className="relative" data-action-menu><summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-neutral-200" aria-label={`Actions for ${project.name}`}><MoreHorizontal size={17} /></summary><div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">{capabilities.edit && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={edit}><Pencil size={15} />Edit</button>}{capabilities.complete && !project.isArchived && !project.isCompleted && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => action(project._id, "complete")}><Check size={15} />Complete</button>}{capabilities.edit && !project.isArchived && project.isCompleted && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => action(project._id, "reopen")}><RotateCcw size={15} />Reopen</button>}{capabilities.archive && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => action(project._id, "archive")}><Archive size={15} />{project.isArchived ? "Restore" : "Archive"}</button>}{capabilities.delete && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => action(project._id, "delete", project.name)}><Trash2 size={15} />Delete</button>}</div></details>;
}

function ProjectEmptyState({ view, canCreate, onCreate }) {
  const content = {
    archived: ["No archived projects", "Projects you archive will appear here and can be restored at any time."],
    completed: ["No completed projects", "Projects you complete will appear here."],
    active: ["No active projects", "Create your first project or adjust the active filters."],
    all: ["No projects found", "Create your first project or adjust the active filters."],
  }[view] || ["No projects found", "Adjust the active filters."];
  return <EmptyState title={content[0]} description={content[1]} action={canCreate && view !== "archived" && view !== "completed" && <button onClick={onCreate} className="btn btn-primary">Create project</button>} />;
}
function Filter({ label, values = [], options, value, onChange }) {
  return <Dropdown multiple ariaLabel={label} className="text-xs [&_.field]:!min-h-10 [&_.field]:!rounded-xl [&_.field]:!border-white/80 [&_.field]:!bg-white/90 [&_.field]:!py-1.5 [&_.field]:shadow-sm" value={value} onChange={onChange} placeholder={label} options={options || values.map((item) => [item, item])} />;
}

function filterParams(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value) && value.length) value.forEach((item) => params.append(key, item));
    else if (!Array.isArray(value) && value) params.set(key, value);
  }
  return params;
}

function ProjectFilterChips({ filters, setFilters, recordUsers }) {
  const labels = { userId: "User", stage: "Stage", priority: "Priority", projectPlatform: "Project platform", zohoProduct: "Zoho platform", projectType: "Type", environment: "Environment" };
  const userNames = new Map(recordUsers.map((user) => [String(user._id), user.name]));
  const selections = Object.entries(labels).flatMap(([key, label]) =>
    filters[key].map((value) => ({ key, label, value, displayValue: key === "userId" ? userNames.get(String(value)) || "User" : value })),
  );
  if (!selections.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Active project filters">
      {selections.map(({ key, label, value, displayValue }) => (
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          key={`${key}-${value}`}
          onClick={() => setFilters({ ...filters, [key]: filters[key].filter((item) => item !== value) })}
          title={`Remove ${label} ${value}`}
          type="button"
        >
          <span className="text-emerald-600">{label}:</span> {displayValue}<X size={13} />
        </button>
      ))}
    </div>
  );
}
