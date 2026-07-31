"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge, DateText, EmptyState, PageIntro, Progress } from "@/components/ui";
import { TASK_STATUSES } from "@/constants/task";
import ReportsView from "@/components/reports/ReportsView";
import Dropdown from "@/components/ui/Dropdown";

export default function DashboardView() {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const result = await fetch("/api/dashboard", { cache: "no-store" }).then((response) => response.json());
    if (result.success) setData(result.data); else toast.error(result.message);
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function status(taskId, value) {
    const result = await fetch(`/api/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) }).then((response) => response.json());
    result.success ? (toast.success(result.message), load()) : toast.error(result.message);
  }

  if (!data) return <div className="space-y-5"><div className="skeleton h-20" /><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[1,2,3,4,5].map((item) => <div className="skeleton h-28" key={item} />)}</div><div className="skeleton h-96" /></div>;
  const cards = [
    ["Active projects", data.activeProjects, FolderKanban, "text-emerald-700 bg-emerald-50"],
    ["Due today", data.tasksDueToday, CalendarClock, "text-sky-700 bg-sky-50"],
    ["Overdue", data.overdueTasks, AlertTriangle, "text-red-700 bg-red-50"],
    ["Blocked", data.blockedTasks, Ban, "text-amber-700 bg-amber-50"],
    ["Completed this week", data.completedThisWeek, CheckCircle2, "text-violet-700 bg-violet-50"],
  ];

  return (
    <>
      <PageIntro eyebrow="Today" title="Your project workspace" description="Attention, project allocation, recent delivery, and workspace analytics in one place." actions={<Link href="/projects?create=1" className="btn btn-primary hidden md:inline-flex"><Plus size={17} />Create project</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label, value, Icon, colors]) => <div className="card min-h-32 p-3 sm:p-4" key={label}><span className={`grid size-8 place-items-center rounded-lg sm:size-9 sm:rounded-xl ${colors}`}><Icon size={17} /></span><p className="mt-3 text-xl font-semibold sm:mt-4 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] font-medium leading-4 text-neutral-500 sm:text-xs">{label}</p></div>)}</div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Today’s tasks</h3><Link className="text-sm font-semibold text-emerald-700" href="/tasks">View all</Link></div>
          {data.todayTasks.length ? <div className="card divide-y divide-neutral-100">{data.todayTasks.map((task) => (
            <div key={task._id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 p-4 sm:grid-cols-[22px_minmax(0,1fr)_auto_150px] sm:items-center">
              {task.isCreator ? <button onClick={() => status(task._id, "Completed")} aria-label={`Complete ${task.title}`} className="mt-0.5 size-5 rounded-md border border-neutral-300 sm:mt-0" /> : <span className="mt-1 size-2 rounded-full bg-neutral-300" />}
              <div className="min-w-0"><p className="truncate font-medium">{task.title}</p><p className="mt-1 truncate text-xs text-neutral-500">{task.projectId?.name || "Project"}{!task.isCreator ? " · View only" : ""}</p></div>
              <Badge>{task.priority}</Badge>
              {task.isCreator ? <Dropdown className="col-span-2 col-start-2 w-full sm:col-auto sm:w-40 [&_.field]:!min-h-9" value={task.status} onChange={(value) => status(task._id, value)} options={TASK_STATUSES} /> : <div className="col-span-2 col-start-2 sm:col-auto"><Badge>{task.status}</Badge></div>}
            </div>
          ))}</div> : <EmptyState title="No tasks due today" description="You are clear for today." />}
        </section>
        <section><h3 className="mb-3 font-semibold">Upcoming deadlines</h3>{data.upcomingDeadlines.length ? <div className="card divide-y divide-neutral-100">{data.upcomingDeadlines.slice(0, 7).map((item) => <div className="p-4" key={`${item.kind}-${item._id}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{item.name || item.title}</p><Badge>{item.kind}</Badge></div><p className="mt-2 text-xs text-neutral-500"><DateText value={item.dueDate} /></p></div>)}</div> : <EmptyState title="No upcoming deadlines" description="Nothing is due in the next two weeks." />}</section>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-start justify-between gap-3"><h3 className="font-semibold">Recent projects</h3><Link href="/projects" className="shrink-0 text-sm font-semibold text-emerald-700">All projects</Link></div>
        {data.recentProjects.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.recentProjects.map((project) => <Link href={`/projects/${project._id}`} className="card p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5" key={project._id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{project.name}</p><p className="mt-1 truncate text-xs text-neutral-500">{project.clientName || project.zohoProduct}</p></div><Badge>{project.priority}</Badge></div><div className="mt-5"><Progress value={project.progress} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs"><Badge>{project.stage}</Badge><DateText value={project.dueDate} /></div></Link>)}</div> : <EmptyState title="No projects yet" description="Create your first project." action={<Link href="/projects?create=1" className="btn btn-primary">Create project</Link>} />}
      </section>

      <section className="mt-8 border-t border-neutral-200 pt-8"><ReportsView embeddedData={data} /></section>
    </>
  );
}
