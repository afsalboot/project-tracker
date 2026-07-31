"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Check, Grid2X2, List, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ENVIRONMENTS, PRIORITIES, PROJECT_STAGES, PROJECT_TYPES, ZOHO_PRODUCTS } from "@/constants/project";
import { Badge, DateText, EmptyState, FilterPanel, PageIntro, Progress } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProjectDialog from "@/components/forms/ProjectDialog";
import AssigneeSummary from "@/components/ui/AssigneeSummary";
import Dropdown from "@/components/ui/Dropdown";

export default function ProjectsView({ permissions = [] }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [filters, setFilters] = useState({ search: "", stage: [], priority: [], zohoProduct: [], projectType: [], environment: [], sort: "updated", archived: "" });
  const capabilities = {
    create: permissions.includes("projects.create"),
    edit: permissions.includes("projects.edit"),
    archive: permissions.includes("projects.archive"),
    delete: permissions.includes("projects.delete"),
  };
  const availableProjectTypes = [...new Set([
    ...PROJECT_TYPES,
    ...data.flatMap((project) => project.projectTypes || []),
  ])];

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
    const timer = setTimeout(() => {
      if (capabilities.create && new URLSearchParams(window.location.search).get("create") === "1") {
        setCreateOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [capabilities.create]);
  useEffect(() => {
    if (!capabilities.create) return;
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("open-project-create", openCreate);
    return () => window.removeEventListener("open-project-create", openCreate);
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
      <PageIntro eyebrow="Portfolio" title="All projects" description="Track general projects and Zoho customizations in one workspace." actions={capabilities.create && <button className="btn btn-primary hidden sm:inline-flex" onClick={() => setCreateOpen(true)}><Plus size={17} />New project</button>} />
      <div className="mb-4 flex w-fit rounded-xl border border-neutral-200 bg-white p-1" aria-label="Project archive filter">
        {[["", "Active"], ["true", "Archived"], ["all", "All"]].map(([value, label]) => (
          <button
            key={label}
            className={`min-h-9 rounded-lg px-4 text-sm font-semibold ${filters.archived === value ? "bg-[#176b4d] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
            onClick={() => setFilters({ ...filters, archived: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <FilterPanel
        title="Project filters"
        activeCount={(filters.search ? 1 : 0) + ["stage", "priority", "zohoProduct", "projectType", "environment"].reduce((sum, key) => sum + filters[key].length, 0)}
        onClear={() => setFilters({ ...filters, search: "", stage: [], priority: [], zohoProduct: [], projectType: [], environment: [] })}
        collapsed={filtersCollapsed}
        onToggle={() => setFiltersCollapsed((value) => !value)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="relative xl:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input aria-label="Search projects" className="field search-field" placeholder="Search projects or clients…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <Filter label="All stages" values={PROJECT_STAGES} value={filters.stage} onChange={(stage) => setFilters({ ...filters, stage })} />
          <Filter label="All priorities" values={PRIORITIES} value={filters.priority} onChange={(priority) => setFilters({ ...filters, priority })} />
          <Filter label="All platforms" values={ZOHO_PRODUCTS} value={filters.zohoProduct} onChange={(zohoProduct) => setFilters({ ...filters, zohoProduct })} />
          <Filter label="All types" values={availableProjectTypes} value={filters.projectType} onChange={(projectType) => setFilters({ ...filters, projectType })} />
          <Filter label="All environments" values={ENVIRONMENTS} value={filters.environment} onChange={(environment) => setFilters({ ...filters, environment })} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          <Dropdown ariaLabel="Sort projects" className="max-w-44 text-xs [&_.field]:!min-h-9 [&_.field]:!py-1" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} options={[["updated", "Recently updated"], ["due", "Due date"], ["name", "Project name"], ["created", "Newest"]]} />
          <div className="ml-auto flex gap-2"><button className={`btn ${view === "cards" ? "btn-primary" : "btn-secondary"}`} aria-label="Card view" onClick={() => setView("cards")}><Grid2X2 size={17} /></button><button className={`btn ${view === "table" ? "btn-primary" : "btn-secondary"}`} aria-label="Table view" onClick={() => setView("table")}><List size={17} /></button></div>
        </div>
        <ProjectFilterChips filters={filters} setFilters={setFilters} />
      </FilterPanel>
      {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div className="skeleton h-64" key={item} />)}</div> :
      data.length === 0 ? <EmptyState title={filters.archived === "true" ? "No archived projects" : "No projects found"} description={filters.archived === "true" ? "Projects you archive will appear here and can be restored at any time." : "Create your first project or adjust the active filters."} action={capabilities.create && filters.archived !== "true" && <button onClick={() => setCreateOpen(true)} className="btn btn-primary">Create project</button>} /> :
      view === "cards" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((project) => <ProjectCard key={project._id} project={project} action={action} edit={() => setEditId(project._id)} capabilities={capabilities} />)}</div> :
      <ProjectTable projects={data} action={action} edit={setEditId} capabilities={capabilities} />}
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

function ProjectCard({ project, action, edit, capabilities }) {
  return <article className="card p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/projects/${project._id}`} className="font-semibold hover:text-emerald-700">{project.name}</Link><p className="mt-1 truncate text-sm text-neutral-500">{project.clientName || "Personal project"} · {project.zohoProduct}</p></div><Actions project={project} action={action} edit={edit} capabilities={capabilities} /></div><AssigneeSummary users={project.assignedUsers} className="mt-3" /><div className="mt-4 flex flex-wrap gap-2">{project.isArchived && <Badge className="border-neutral-300 bg-neutral-100 text-neutral-700">Archived</Badge>}<Badge>{project.stage}</Badge><Badge>{project.priority}</Badge><Badge>{project.environment}</Badge></div><div className="mt-5"><Progress value={project.progress} /></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 text-xs"><div><p className="text-neutral-400">Due</p><p className="mt-1 font-medium"><DateText value={project.dueDate} /></p></div><div><p className="text-neutral-400">Tasks</p><p className="mt-1 font-medium">{project.completedTasks || 0} of {project.totalTasks || 0} completed</p></div></div></article>;
}
function ProjectTable({ projects, action, edit, capabilities }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {projects.map((project) => (
          <article className="card p-4" key={project._id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="block truncate font-semibold" href={`/projects/${project._id}`}>{project.name}</Link>
                <p className="mt-1 truncate text-xs text-neutral-500">{project.clientName || project.zohoProduct}</p>
                <AssigneeSummary users={project.assignedUsers} className="mt-2" />
              </div>
              <Actions project={project} action={action} edit={() => edit(project._id)} capabilities={capabilities} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.isArchived && <Badge className="border-neutral-300 bg-neutral-100 text-neutral-700">Archived</Badge>}
              <Badge>{project.stage}</Badge>
              <Badge>{project.priority}</Badge>
            </div>
            <div className="mt-4"><Progress value={project.progress} /></div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-500">{project.environment}</span>
              <DateText value={project.dueDate} />
            </div>
          </article>
        ))}
      </div>
      <div className="card hidden overflow-visible md:block">
      <table className="w-full min-w-[980px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[23%]" />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[20%]" />
          <col className="w-[13%]" />
          <col className="w-[11%]" />
          <col className="w-[4%]" />
        </colgroup>
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
          <tr>
            {["Project", "Stage", "Priority", "Progress", "Due", "Environment"].map((label) => (
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
                <p className="mt-1 truncate text-xs text-neutral-500">{project.clientName || project.zohoProduct}</p>
                <AssigneeSummary users={project.assignedUsers} className="mt-2" />
              </td>
              <td className="px-5 py-5"><Badge>{project.stage}</Badge></td>
              <td className="px-5 py-5"><Badge>{project.priority}</Badge></td>
              <td className="px-5 py-5"><div className="min-w-40"><Progress value={project.progress} /></div></td>
              <td className="whitespace-nowrap px-5 py-5"><DateText value={project.dueDate} /></td>
              <td className="px-5 py-5">{project.environment}</td>
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
  return <details className="relative"><summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-neutral-200" aria-label={`Actions for ${project.name}`}><MoreHorizontal size={17} /></summary><div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">{capabilities.edit && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={edit}><Pencil size={15} />Edit</button>}{capabilities.edit && !project.isArchived && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => action(project._id, "complete")}><Check size={15} />Complete</button>}{capabilities.archive && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => action(project._id, "archive")}><Archive size={15} />{project.isArchived ? "Restore" : "Archive"}</button>}{capabilities.delete && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => action(project._id, "delete", project.name)}><Trash2 size={15} />Delete</button>}</div></details>;
}
function Filter({ label, values, value, onChange }) {
  return <Dropdown multiple ariaLabel={label} value={value} onChange={onChange} placeholder={label} options={values.map((item) => [item, item])} />;
}

function filterParams(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value) && value.length) value.forEach((item) => params.append(key, item));
    else if (!Array.isArray(value) && value) params.set(key, value);
  }
  return params;
}

function ProjectFilterChips({ filters, setFilters }) {
  const labels = { stage: "Stage", priority: "Priority", zohoProduct: "Platform", projectType: "Type", environment: "Environment" };
  const selections = Object.entries(labels).flatMap(([key, label]) =>
    filters[key].map((value) => ({ key, label, value })),
  );
  if (!selections.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Active project filters">
      {selections.map(({ key, label, value }) => (
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          key={`${key}-${value}`}
          onClick={() => setFilters({ ...filters, [key]: filters[key].filter((item) => item !== value) })}
          title={`Remove ${label} ${value}`}
          type="button"
        >
          <span className="text-emerald-600">{label}:</span> {value}<X size={13} />
        </button>
      ))}
    </div>
  );
}
