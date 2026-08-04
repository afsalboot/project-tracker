"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { endOfDay, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { Badge, DateText, EmptyState, FilterPanel, PageIntro } from "@/components/ui";
import Dropdown from "@/components/ui/Dropdown";
import SearchField from "@/components/ui/SearchField";
import useProjectCustomization from "@/components/settings/useProjectCustomization";
import { projectPlatformName, projectZohoPlatforms } from "@/lib/customization";

export default function CompletedView() {
  const { customization, loading: customizationLoading } = useProjectCustomization();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ period: [], projectPlatform: [], zohoProduct: [], projectType: [], client: [], environment: [], search: "" });
  const completedStatus = customization.taskStatuses.find((item) => item.id === "completed")?.label || "Completed";
  const completedStage = customization.projectStages.find((item) => item.id === "completed")?.label || "Completed";
  useEffect(() => {
    if (customizationLoading) return;
    Promise.all([
      fetch(`/api/tasks?status=${encodeURIComponent(completedStatus)}&limit=100&sort=updated`).then((response) => response.json()),
      fetch(`/api/projects?stage=${encodeURIComponent(completedStage)}&archived=all&limit=100&sort=updated`).then((response) => response.json()),
    ]).then(([taskResult, projectResult]) => {
      if (!taskResult.success) toast.error(taskResult.message);
      if (!projectResult.success) toast.error(projectResult.message);
      setTasks(taskResult.data?.items || []);
      setProjects(projectResult.data?.items || []);
    }).finally(() => setLoading(false));
  }, [completedStage, completedStatus, customizationLoading]);

  const records = useMemo(() => {
    const combined = [
      ...tasks.map((task) => ({ ...task, kind: "Task", completion: task.completedDate, project: task.projectId })),
      ...projects.map((project) => ({ ...project, title: project.name, kind: "Project", completion: project.completedDate, project })),
    ];
    const now = new Date();
    const starts = { today: startOfDay(now), week: startOfWeek(now, { weekStartsOn: 1 }), month: startOfMonth(now) };
    return combined.filter((record) => {
      const project = record.project || {};
      if (filters.period.length && (!record.completion || !filters.period.some((period) => isWithinInterval(new Date(record.completion), { start: starts[period], end: endOfDay(now) })))) return false;
      if (filters.projectPlatform.length && !filters.projectPlatform.includes(projectPlatformName(project))) return false;
      if (filters.zohoProduct.length && !projectZohoPlatforms(project).some((platform) => filters.zohoProduct.includes(platform))) return false;
      if (filters.projectType.length && !project.projectTypes?.some((type) => filters.projectType.includes(type))) return false;
      if (filters.client.length && !filters.client.includes(project.clientName)) return false;
      if (filters.environment.length && !filters.environment.includes(record.environment) && !filters.environment.includes(project.environment)) return false;
      if (filters.search && !`${record.title} ${project.name || ""} ${project.clientName || ""}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => new Date(b.completion || 0) - new Date(a.completion || 0));
  }, [filters, projects, tasks]);
  const clients = [...new Set(projects.map((item) => item.clientName).filter(Boolean))].sort();
  const availableTypes = customization.projectTypes.filter((item) => item.enabled).map((item) => item.label);
  const visibility = {
    projectPlatform: customization.projectPlatforms.some((item) => item.enabled),
    zohoProduct: customization.zohoPlatforms.some((item) => item.enabled),
    projectType: availableTypes.length > 0,
    environment: customization.environments.some((item) => item.enabled),
  };
  const visibleFilterKeys = ["projectPlatform", "zohoProduct", "projectType", "environment"].filter((key) => visibility[key]);

  return (
    <>
      <PageIntro eyebrow="History" title="Completed work" description="A durable, searchable record of deployed projects and finished tasks." />
      <FilterPanel
        title="Completed work filters"
        activeCount={(filters.search ? 1 : 0) + ["period", "client", ...visibleFilterKeys].reduce((sum, key) => sum + filters[key].length, 0)}
        onClear={() => setFilters({ period: [], projectPlatform: [], zohoProduct: [], projectType: [], client: [], environment: [], search: "" })}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <SearchField className="sm:col-span-2 xl:col-span-2" ariaLabel="Search completed work" placeholder="Search completed work…" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} />
          <Select label="Any completion date" value={filters.period} change={(period) => setFilters({ ...filters, period })} items={[["today","Completed today"],["week","Completed this week"],["month","Completed this month"]]} />
          {visibility.projectPlatform && <Select label="All project platforms" value={filters.projectPlatform} change={(projectPlatform) => setFilters({ ...filters, projectPlatform })} items={customization.projectPlatforms.filter((item) => item.enabled).map((item) => [item.label,item.label])} />}
          {visibility.projectPlatform && visibility.zohoProduct && <Select label="All Zoho platforms" value={filters.zohoProduct} change={(zohoProduct) => setFilters({ ...filters, zohoProduct })} items={customization.zohoPlatforms.filter((item) => item.enabled).map((item) => [item.label,item.label])} />}
          {visibility.projectType && <Select label="All project types" value={filters.projectType} change={(projectType) => setFilters({ ...filters, projectType })} items={availableTypes.map((item) => [item,item])} />}
          {visibility.environment && <Select label="All environments" value={filters.environment} change={(environment) => setFilters({ ...filters, environment })} items={customization.environments.filter((item) => item.enabled).map((item) => [item.label,item.label])} />}
          {clients.length > 0 && <Select label="All clients" value={filters.client} change={(client) => setFilters({ ...filters, client })} items={clients.map((item) => [item,item])} />}
        </div>
      </FilterPanel>
      {loading ? <div className="skeleton h-96" /> : records.length === 0 ? <EmptyState title="No completed work found" description="Completed tasks and projects will remain searchable here." /> :
      <><div className="space-y-3 md:hidden">{records.map((record) => <CompletedCard record={record} visibility={visibility} key={`${record.kind}-${record._id}`} />)}</div><div className="card hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500"><tr>{["Work","Type","Project",...(visibility.projectPlatform ? ["Platform"] : []),...(visibility.environment ? ["Environment"] : []),"Time spent","Completed"].map((label) => <th className="px-4 py-4" key={label}>{label}</th>)}</tr></thead><tbody>{records.map((record) => <tr className="border-b border-neutral-100 last:border-0" key={`${record.kind}-${record._id}`}><td className="px-4 py-4 font-semibold">{record.kind === "Project" ? <Link className="hover:text-emerald-700" href={`/projects/${record._id}`}>{record.title}</Link> : record.title}</td><td className="px-4 py-4"><Badge>{record.kind}</Badge></td><td className="px-4 py-4">{record.project?.name || "—"}</td>{visibility.projectPlatform && <td className="px-4 py-4">{record.project ? [projectPlatformName(record.project), ...(visibility.zohoProduct ? projectZohoPlatforms(record.project) : [])].join(" · ") : "—"}</td>}{visibility.environment && <td className="px-4 py-4">{record.environment || record.project?.environment || "—"}</td>}<td className="px-4 py-4">{record.kind === "Task" && record.actualMinutes ? `${Math.floor(record.actualMinutes/60)}h ${record.actualMinutes%60}m` : "—"}</td><td className="whitespace-nowrap px-4 py-4"><DateText value={record.completion} /></td></tr>)}</tbody></table></div></>}
    </>
  );
}
function Select({ label, value, change, items }) { return <Dropdown multiple ariaLabel={label} value={value} onChange={change} placeholder={label} options={items} />; }
function CompletedCard({ record, visibility }) {
  return <article className="card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{record.kind === "Project" ? <Link href={`/projects/${record._id}`}>{record.title}</Link> : record.title}</p><p className="mt-1 truncate text-xs text-neutral-500">{record.project?.name || "Project"}{visibility.projectPlatform && record.project ? ` · ${[projectPlatformName(record.project), ...(visibility.zohoProduct ? projectZohoPlatforms(record.project) : [])].join(" · ")}` : ""}</p></div><Badge>{record.kind}</Badge></div><div className={`mt-4 grid gap-3 border-t border-neutral-100 pt-3 text-xs ${visibility.environment ? "grid-cols-2" : "grid-cols-1"}`}>{visibility.environment && <div><p className="text-neutral-400">Environment</p><p className="mt-1 font-medium">{record.environment || record.project?.environment || "—"}</p></div>}<div><p className="text-neutral-400">Completed</p><p className="mt-1 font-medium">{record.completion ? new Date(record.completion).toLocaleDateString() : "—"}</p></div></div></article>;
}
