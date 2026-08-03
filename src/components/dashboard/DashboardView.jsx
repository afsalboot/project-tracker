"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isBefore, startOfDay } from "date-fns";
import {
  AlertTriangle,
  AtSign,
  Bell,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge, DateText, EmptyState, PageIntro, Progress } from "@/components/ui";
import Dropdown from "@/components/ui/Dropdown";
import useProjectCustomization from "@/components/settings/useProjectCustomization";

const taskTabs = [
  ["mine", "My tasks"],
  ["assigned", "Assigned"],
  ["overdue", "Overdue"],
  ["completed", "Completed"],
];

export default function DashboardView() {
  const { customization } = useProjectCustomization();
  const [data, setData] = useState(null);
  const [taskTab, setTaskTab] = useState("mine");
  const [filters, setFilters] = useState({ projectId: "", range: "month" });
  const statusOptions = customization.taskStatuses.filter((item) => item.enabled).map((item) => item.label);
  const showTaskStatus = statusOptions.length > 0;
  const showProjectStage = customization.projectStages.some((item) => item.enabled);
  const completedStatus = customization.taskStatuses.find((item) => item.id === "completed")?.label || "Completed";
  const load = useCallback(async () => {
    const query = new URLSearchParams(filters);
    const result = await fetch(`/api/dashboard?${query}`, { cache: "no-store" }).then((response) => response.json());
    if (result.success) setData(result.data); else toast.error(result.message);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateStatus(taskId, value) {
    const result = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    }).then((response) => response.json());
    result.success ? (toast.success(result.message), load()) : toast.error(result.message);
  }

  if (!data) return <DashboardSkeleton />;

  const greeting = greetingForNow();
  const cards = [
    ["Active projects", data.activeProjects, `${data.projectsInTesting} currently in testing`, FolderKanban, "text-emerald-700 bg-emerald-50", data.recentProjects.map((project, index) => ({ index, value: project.progress || 0 }))],
    ["Open tasks", data.openTasks, `${data.tasksDueToday} due today`, ListTodo, "text-emerald-700 bg-emerald-50", data.reports.taskStatus.filter((item) => item._id !== completedStatus).map((item, index) => ({ index, value: item.count }))],
    ["Completed", data.completedInRange, data.rangeLabel, CheckCircle2, "text-emerald-700 bg-emerald-50", data.performanceTrend.map((item, index) => ({ index, value: item.completedTasks }))],
    ["Overdue", data.overdueTasks, data.overdueTasks ? "Needs action" : "Everything is on track", AlertTriangle, "text-red-700 bg-red-50", data.needsAttention.map((item, index) => ({ index, value: item.overdueTasks }))],
  ];

  return (
    <>
      <PageIntro
        eyebrow="Workspace / Dashboard"
        title={`${greeting}, ${firstName(data.currentUser?.name)} 👋`}
        description={data.visibilityScope === "workspace" ? "Here’s how your workspace is performing." : "Here’s how the projects and tasks available to you are performing."}
      />
      <div className="mb-4 -mt-2 flex flex-wrap items-center gap-3">
        <Dropdown className="w-full sm:w-56" ariaLabel="Filter dashboard by project" value={filters.projectId} onChange={(projectId) => setFilters((current) => ({ ...current, projectId }))} options={[["", "All projects"], ...data.projectOptions.map((project) => [project._id, project.name])]} />
        <Dropdown className="w-full sm:w-44" ariaLabel="Dashboard date range" value={filters.range} onChange={(range) => setFilters((current) => ({ ...current, range }))} options={[["week", "This week"], ["month", "This month"], ["six-months", "Last 6 months"], ["year", "This year"]]} />
        {data.permissions.canCreateProjects && <Link href="/projects?create=1" className="btn btn-primary ml-auto">+ New project</Link>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, note, Icon, colors, spark]) => (
          <div className="card min-h-36 overflow-hidden p-3 sm:p-4" key={label}>
            <div className="flex items-start justify-between gap-2"><span className={`grid size-9 place-items-center rounded-xl ${colors}`}><Icon size={17} /></span><MiniSparkline data={spark} color={colors.includes("red") ? "#dc2626" : "var(--accent)"} /></div>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-700">{label}</p>
            <p className="mt-1 text-[11px] text-neutral-400">{note}</p>
          </div>
        ))}
      </div>

      <div className={`mt-5 grid gap-5 ${showTaskStatus ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]" : ""}`}>
        <ProjectPerformance data={data.performanceTrend} rangeLabel={data.rangeLabel} />
        {showTaskStatus && <TaskDistribution items={data.reports.taskStatus} completedStatus={completedStatus} />}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <ProjectProgress projects={data.recentProjects} showStage={showProjectStage} />
        <UpcomingDeadlines items={data.upcomingDeadlines} />
      </div>

      {data.teamAnalytics && <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]"><TeamWorkload users={data.teamAnalytics.userContribution} /><NeedsAttention items={data.needsAttention} /></div>}
      {!data.teamAnalytics && <div className="mt-5"><NeedsAttention items={data.needsAttention} /></div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <TaskWorkspace
          tasks={data.dashboardTasks}
          tab={taskTab}
          setTab={setTaskTab}
          completedStatus={completedStatus}
          statusOptions={statusOptions}
          showStatus={showTaskStatus}
          updateStatus={updateStatus}
        />
        <MentionsUpdates items={data.forYouUpdates || []} />
      </div>
    </>
  );
}

const chartTooltipStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(15, 23, 42, .1)",
  fontSize: 12,
};

function MiniSparkline({ data, color }) {
  if (!data?.length) return <span className="mt-2 h-8 w-20 rounded-lg bg-neutral-50" />;
  return (
    <div className="h-9 w-24" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 3, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProjectPerformance({ data, rangeLabel }) {
  const hasData = data.some((item) => item.completedTasks || item.completedProjects);
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <SectionHeading title="Project performance" description={`Completed work during ${rangeLabel.toLowerCase()}.`} />
      <div className="mt-5 h-72 min-w-0">
        {hasData ? <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="tasksArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} /></linearGradient>
              <linearGradient id="projectsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.22} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0ee" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8a938e" }} minTickGap={22} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8a938e" }} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area type="monotone" dataKey="completedTasks" name="Completed tasks" stroke="var(--accent)" strokeWidth={2.5} fill="url(#tasksArea)" activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="completedProjects" name="Completed projects" stroke="#0ea5e9" strokeWidth={2} fill="url(#projectsArea)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 text-center"><div><p className="text-sm font-semibold">No completed work yet</p><p className="mt-1 text-xs text-neutral-500">Completed tasks and projects will form the performance chart.</p></div></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--accent)]" />Completed tasks</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-sky-500" />Completed projects</span></div>
    </section>
  );
}

function TaskDistribution({ items, completedStatus }) {
  const palette = ["var(--accent)", "#0ea5e9", "#8b5cf6", "#f59e0b", "#e11d48", "#64748b"];
  const chartData = [...items].sort((a, b) => b.count - a.count).map((item, index) => ({ name: item._id || "Unspecified", value: item.count, color: taskColor(item._id, palette[index % palette.length]) }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const completed = chartData.find((item) => item.name === completedStatus)?.value || 0;
  const completedPercent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <SectionHeading title="Task distribution" description="Current workflow balance." />
      {total ? <>
        <div className="relative mx-auto mt-4 size-52">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={92} paddingAngle={3} stroke="none">{chartData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} /></PieChart></ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-3xl">{completedPercent}%</strong><span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Completed</span></div>
        </div>
        <p className="text-center text-xs text-neutral-500"><strong className="text-neutral-800">{total} tasks</strong> · {completedPercent}% completed</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{chartData.slice(0, 6).map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-full" style={{ background: item.color }} /><span className="min-w-0 flex-1 truncate text-neutral-600">{item.name}</span><strong>{item.value}</strong></div>)}</div>
      </> : <div className="mt-4"><EmptyState title="No task data" description="Task distribution will appear after tasks are created." /></div>}
    </section>
  );
}

function ProjectProgress({ projects, showStage }) {
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <SectionHeading title="Project progress" description="Current delivery progress and upcoming dates." link="/projects" linkLabel="All projects" />
      {projects.length ? (
        <div className="mt-4 divide-y divide-neutral-100">
          {projects.slice(0, 6).map((project) => (
            <Link key={project._id} href={`/projects/${project._id}`} className="grid gap-3 py-4 transition first:pt-1 hover:bg-neutral-50/70 sm:grid-cols-[minmax(0,1fr)_110px_72px] sm:px-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{project.name}</p>{showStage && <Badge>{project.stage}</Badge>}</div>
                <p className="mt-1 truncate text-xs text-neutral-400">Owner: {project.userId?.name || "Workspace owner"}</p>
                <div className="mt-3"><Progress value={project.progress || 0} /></div>
              </div>
              <div className="self-center text-xs text-neutral-500"><span className="block text-neutral-400">Due date</span><span className="mt-1 block font-medium text-neutral-700"><DateText value={project.dueDate} /></span></div>
              <ProgressRing value={project.progress || 0} />
            </Link>
          ))}
        </div>
      ) : <div className="mt-4"><EmptyState title="No active projects" description="Active projects will appear here." /></div>}
    </section>
  );
}

function ProgressRing({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return <span className="relative mx-auto grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${safeValue}%, #e8eeeb ${safeValue}% 100%)` }}><span className="absolute inset-[5px] rounded-full bg-white" /><strong className="relative text-[11px] text-emerald-800">{safeValue}%</strong></span>;
}

function TaskWorkspace({ tasks, tab, setTab, completedStatus, statusOptions, showStatus, updateStatus }) {
  const today = startOfDay(new Date());
  const filtered = useMemo(() => tasks.filter((task) => {
    if (tab === "mine") return task.isCreator && task.status !== completedStatus;
    if (tab === "assigned") return !task.isCreator && task.status !== completedStatus;
    if (tab === "overdue") return task.status !== completedStatus && task.dueDate && isBefore(new Date(task.dueDate), today);
    return task.status === completedStatus;
  }).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  }).slice(0, 8), [completedStatus, tab, tasks, today]);

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <SectionHeading title="Tasks" description="Move directly into the work that matters now." link="/tasks" linkLabel="View all" />
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
        {taskTabs.filter(([value]) => showStatus || value !== "completed").map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${tab === value ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"}`}>{label}</button>)}
      </div>
      {filtered.length ? <div className="mt-3 divide-y divide-neutral-100">{filtered.map((task) => (
        <div key={task._id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 py-3 sm:items-center">
          {task.isCreator && task.status !== completedStatus && statusOptions.includes(completedStatus) ? <button type="button" onClick={() => updateStatus(task._id, completedStatus)} className="mt-0.5 size-5 rounded-md border border-neutral-300 hover:border-emerald-600 hover:bg-emerald-50 sm:mt-0" aria-label={`Complete ${task.title}`} /> : <span className={`mt-1 size-2 rounded-full ${task.status === completedStatus ? "bg-emerald-500" : "bg-neutral-300"}`} />}
          <div className="min-w-0"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-1 truncate text-xs text-neutral-400">{task.projectId?.name || "Project"} · <DateText value={task.dueDate} /></p></div>
          <div className="flex items-center gap-2"><Badge>{task.priority}</Badge>{showStatus && task.isCreator && <Dropdown className="hidden w-36 sm:block [&_.field]:!min-h-9" value={statusOptions.includes(task.status) ? task.status : ""} placeholder="Enabled status" onChange={(value) => updateStatus(task._id, value)} options={statusOptions} />}</div>
        </div>
      ))}</div> : <div className="mt-4"><EmptyState title="Nothing in this view" description="Tasks matching this tab will appear here." /></div>}
    </section>
  );
}

function UpcomingDeadlines({ items }) {
  return (
    <section className="card p-4 sm:p-5">
      <SectionHeading title="Upcoming deadlines" description="Due within the next two weeks." />
      {items.length ? <div className="relative mt-5 space-y-1 before:absolute before:bottom-5 before:left-[17px] before:top-4 before:w-px before:bg-neutral-200">{items.slice(0, 7).map((item, index) => (
        <div className="relative flex items-start gap-3 py-2" key={`${item.kind}-${item._id}`}>
          <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-4 border-white ${index < 2 ? "bg-amber-100 text-amber-700" : "bg-sky-50 text-sky-700"}`}><CalendarClock size={14} /></span>
          <div className="min-w-0 flex-1 rounded-xl bg-neutral-50 px-3 py-2.5"><p className="truncate text-sm font-medium">{item.name || item.title}</p><p className="mt-1 text-xs text-neutral-400">{item.kind} · <DateText value={item.dueDate} /></p></div>
        </div>
      ))}</div> : <div className="mt-4"><EmptyState title="No upcoming deadlines" description="Nothing is due in the next two weeks." /></div>}
    </section>
  );
}

function NeedsAttention({ items }) {
  return (
    <section className="card p-4 sm:p-5">
      <SectionHeading title="Needs attention" description="Exceptions worth reviewing first." />
      {items.length ? <div className="mt-4 space-y-2">{items.map((item) => (
        <Link href={`/projects/${item._id}`} key={item._id} className="block rounded-xl border border-red-100 bg-red-50/45 p-3 transition hover:border-red-200">
          <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={16} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{[item.overdueTasks ? `${item.overdueTasks} overdue task${item.overdueTasks === 1 ? "" : "s"}` : "", item.blockedTasks ? `${item.blockedTasks} blocked task${item.blockedTasks === 1 ? "" : "s"}` : "", item.deadlineSoon ? `Deadline approaching · ${item.progress}% complete` : ""].filter(Boolean).join(" · ")}</p></div></div>
        </Link>
      ))}</div> : <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">No overdue or blocked work in your current visibility scope.</div>}
    </section>
  );
}

function TeamWorkload({ users }) {
  const rows = users.map((user) => {
    const openTasks = Math.max(0, user.tasks - user.completedTasks);
    return { ...user, openTasks, state: openTasks >= 11 ? "Overloaded" : openTasks >= 8 ? "Busy" : openTasks >= 4 ? "Balanced" : "Available" };
  }).filter((user) => user.openTasks || user.projects).slice(0, 8);
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound size={18} /></span><div><h3 className="font-semibold">Team workload</h3><p className="mt-0.5 text-xs text-neutral-500">Visible only to roles with full workspace access.</p></div></div>
      {rows.length ? <>
        <div className="mt-4 h-[280px] min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf0ee" /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8a938e" }} /><YAxis type="category" dataKey="name" width={92} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#525b56" }} tickFormatter={(name) => name.length > 13 ? `${name.slice(0, 12)}…` : name} /><Tooltip contentStyle={chartTooltipStyle} /><Bar dataKey="openTasks" name="Open tasks" fill="var(--accent)" radius={[0, 7, 7, 0]} barSize={17} /></BarChart></ResponsiveContainer></div>
        <div className="mt-3 flex flex-wrap gap-2">{rows.map((user) => <span key={user.name} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${workloadTone(user.state)}`}><span className="grid size-5 place-items-center rounded-full bg-white/70 text-[9px]">{initials(user.name)}</span>{user.name.split(" ")[0]} · {user.state}</span>)}</div>
      </> : <div className="mt-4"><EmptyState title="No team workload yet" description="Workload appears when team members have project or task activity." /></div>}
    </section>
  );
}

function MentionsUpdates({ items }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? items : items.filter((item) => item.type === tab.slice(0, -1));
  const tabs = [["all", "All"], ["mentions", "Mentions"], ["assignments", "Assignments"]];
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Bell size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">For you</p><h3 className="font-semibold">Mentions &amp; Updates</h3><p className="mt-0.5 text-xs text-neutral-500">Communication and changes relevant specifically to you.</p></div></div>
      <div className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1" role="tablist" aria-label="Mentions and updates filters">
        {tabs.map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)} className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold transition ${tab === value ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"}`}>{label}</button>)}
      </div>
      {filtered.length ? <div className="mt-3 divide-y divide-neutral-100">{filtered.slice(0, 8).map((item) => {
        const Icon = item.type === "mention" ? AtSign : item.type === "assignment" ? UserPlus : Bell;
        const tone = item.type === "mention" ? "bg-violet-50 text-violet-700" : item.type === "assignment" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700";
        return <Link href={item.href || "#"} key={item._id} className="flex items-start gap-3 py-3 first:pt-1 hover:bg-neutral-50/70">
          <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tone}`}><Icon size={15} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-neutral-800">{item.title}</p><p className={`mt-1 text-xs ${item.type === "mention" ? "line-clamp-2 text-neutral-600" : "truncate text-neutral-500"}`}>{forYouMessage(item)}</p>{item.taskName && <p className="mt-1 truncate text-[11px] text-neutral-400">{item.taskName} · {item.projectName}</p>}</div>
          <span className="shrink-0 text-[10px] text-neutral-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
        </Link>;
      })}</div> : <div className="mt-4"><EmptyState title={`No ${tab === "all" ? "updates" : tab} yet`} description={tab === "mentions" ? "Comments that mention you will appear here." : tab === "assignments" ? "Projects assigned to you will appear here." : "Mentions, assignments, and relevant project changes will appear here."} /></div>}
    </section>
  );
}

function forYouMessage(item) {
  if (item.type === "update" && String(item.title).includes("due date changed")) {
    const due = item.newValue ? format(new Date(item.newValue), "MMM dd") : "No due date";
    return `${item.message} → ${due}`;
  }
  return item.message;
}

function taskColor(status, fallback) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) return "var(--accent)";
  if (normalized.includes("block")) return "#e11d48";
  if (normalized.includes("progress")) return "#0ea5e9";
  if (normalized.includes("review") || normalized.includes("test")) return "#8b5cf6";
  if (normalized.includes("hold")) return "#f59e0b";
  return fallback;
}

function workloadTone(state) {
  if (state === "Overloaded") return "bg-red-50 text-red-700";
  if (state === "Busy") return "bg-amber-50 text-amber-700";
  if (state === "Balanced") return "bg-sky-50 text-sky-700";
  return "bg-emerald-50 text-emerald-700";
}

function SectionHeading({ title, description, link, linkLabel }) {
  return <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-neutral-500">{description}</p></div>{link && <Link href={link} className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800">{linkLabel}</Link>}</div>;
}


function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function firstName(name = "there") {
  return name.trim().split(/\s+/)[0] || "there";
}

function greetingForNow() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function DashboardSkeleton() {
  return <div className="space-y-5"><div className="skeleton h-20" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <div className="skeleton h-32" key={item} />)}</div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><div className="skeleton h-96" /><div className="skeleton h-96" /></div></div>;
}
