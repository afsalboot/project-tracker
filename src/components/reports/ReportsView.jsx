"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Boxes,
  CheckCircle2,
  FolderCheck,
  ListChecks,
  Tags,
  UsersRound,
  Workflow,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { EmptyState, PageIntro } from "@/components/ui";

export default function ReportsView({ embeddedData = null }) {
  const [data, setData] = useState(embeddedData);
  useEffect(() => {
    if (embeddedData) return;
    fetch("/api/dashboard", { cache: "no-store" }).then((response) => response.json()).then((result) => result.success ? setData(result.data) : toast.error(result.message));
  }, [embeddedData]);
  if (!data) return <div className="space-y-5"><div className="skeleton h-20" /><div className="skeleton h-96" /></div>;
  const report = data.reports;
  const summaries = [
    ["Projects completed this month", report.projectsCompletedThisMonth, FolderCheck],
    ["Tasks completed this week", data.completedThisWeek, CheckCircle2],
    ["Overdue tasks", data.overdueTasks, AlertTriangle],
    ["Blocked tasks", data.blockedTasks, Ban],
  ];
  const hasData = [report.taskStatus, report.projectStage, report.projectProduct, report.projectType].some((items) => items.length);
  return (
    <>
      {!embeddedData && <PageIntro eyebrow="Insights" title="Delivery reports" description="Live summaries calculated from your project and task records." />}
      {embeddedData && <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700">Workspace analytics</p><h2 className="mt-1 text-xl font-semibold">Delivery reports</h2><p className="mt-1 text-sm text-neutral-500">Live summaries and distribution calculated from project, task, and subtask records.</p></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{summaries.map(([label,value,Icon]) => <div className="card min-h-32 p-4 sm:p-5" key={label}><Icon size={18} className="text-emerald-700" /><p className="mt-3 text-xl font-semibold sm:mt-4 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] leading-4 text-neutral-500 sm:text-xs">{label}</p></div>)}</div>
      {data.workspaceMode !== "personal" && <TeamAnalytics data={data.teamAnalytics} workspace={data} />}
      {!hasData ? <div className="mt-5"><EmptyState title="No report data yet" description="Reports will populate as you create projects and complete tasks." /></div> :
      <section className="mt-6">
        <div className="mb-4">
          <h3 className="font-semibold">Workspace distribution</h3>
          <p className="mt-1 text-xs text-neutral-500">A visual breakdown of current tasks and projects.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Breakdown title="Task status" description="Current task workflow distribution." items={report.taskStatus} icon={ListChecks} palette={["#176b4d", "#0ea5e9", "#8b5cf6", "#e11d48", "#f59e0b"]} />
          <Breakdown title="Project stage" description="Projects across the delivery lifecycle." items={report.projectStage} icon={Workflow} palette={["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c"]} />
          <Breakdown title="Project platform" description="Technology and Zoho product distribution." items={report.projectProduct} icon={Boxes} palette={["#0284c7", "#4f46e5", "#7c3aed", "#0d9488", "#65a30d"]} />
          <Breakdown title="Project type" description="Functional project categories in this workspace." items={report.projectType} icon={Tags} palette={["#9333ea", "#db2777", "#ea580c", "#ca8a04", "#059669"]} />
          <section className="card p-4 sm:p-5 lg:col-span-2"><h3 className="font-semibold">Estimated versus actual time</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4"><Time label="Estimated" minutes={report.timeTotals.estimated} /><Time label="Actual" minutes={report.timeTotals.actual} /></div></section>
        </div>
      </section>}
    </>
  );
}

const CHART_COLORS = ["#176b4d", "#0ea5e9", "#8b5cf6", "#f59e0b", "#e11d48", "#14b8a6"];
const tooltipStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(15, 23, 42, .08)",
  fontSize: 12,
};

function TeamAnalytics({ data, workspace }) {
  const selectedRoles = workspace.allocationRoleKeys || [];
  const projects = data?.projectProgress || [];
  const users = data?.userContribution || [];
  const displayedUsers = users.filter((user) => selectedRoles.includes(user.role));
  const projectOwners = displayedUsers.filter((user) => user.projects > 0);
  const activeUsers = users
    .filter((user) => selectedRoles.includes(user.role) && (user.projects > 0 || user.tasks > 0))
    .map((user) => ({
      ...user,
      openTasks: Math.max(0, user.tasks - user.completedTasks),
    }));

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><UsersRound size={19} /></span>
        <div>
          <h3 className="font-semibold">Team analytics</h3>
          <p className="text-xs text-neutral-500">Project and user insights for Organization and Team workspaces.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Task completion by project"
          description="Completed and remaining tasks across the ten projects with the most tasks."
          className="lg:col-span-2"
        >
          {projects.length ? (
            <ResponsiveContainer width="100%" height={Math.max(280, projects.length * 48)}>
              <BarChart data={projects} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f2" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#737373" }} />
                <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#525252" }} tickFormatter={shortLabel} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="completedTasks" name="Completed" stackId="tasks" fill="#176b4d" radius={[4, 0, 0, 4]} />
                <Bar dataKey="remainingTasks" name="Remaining" stackId="tasks" fill="#d1fae5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="Create projects and tasks to populate project analytics." />}
        </ChartCard>

        <ChartCard title="Project allocation" description="Projects owned by or assigned to members in the selected roles.">
          {projectOwners.length ? (
            <>
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie data={projectOwners} dataKey="projects" nameKey="name" innerRadius={68} outerRadius={102} paddingAngle={3}>
                    {projectOwners.map((user, index) => <Cell fill={CHART_COLORS[index % CHART_COLORS.length]} key={user.name} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid gap-2 sm:grid-cols-2">
                {projectOwners.map((user, index) => (
                  <div className="flex items-center gap-2 text-xs" key={user.name}>
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate">{user.name}</span>
                    <strong>{user.projects}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <ChartEmpty message="Projects created by workspace users will appear here." />}
        </ChartCard>

        <ChartCard title="User contribution" description="Projects and task workload recorded by each workspace user.">
          {activeUsers.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={activeUsers} margin={{ top: 8, right: 8, bottom: 24, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f2" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={shortLabel} angle={activeUsers.length > 4 ? -20 : 0} textAnchor={activeUsers.length > 4 ? "end" : "middle"} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#737373" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="projects" name="Projects" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedTasks" name="Completed tasks" stackId="tasks" fill="#176b4d" />
                <Bar dataKey="openTasks" name="Open tasks" stackId="tasks" fill="#bae6fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="User project and task activity will appear here." />}
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, description, className = "", children }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function ChartEmpty({ message }) {
  return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-6 text-center text-sm text-neutral-500">{message}</div>;
}

function shortLabel(value = "") {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value;
}

function Breakdown({ title, description, items, icon: Icon, palette }) {
  const sortedItems = [...items]
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      label: item._id || "Unspecified",
      color: breakdownColor(item._id, index, palette),
    }));
  const total = sortedItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="card min-h-72 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-neutral-100 p-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">{title}</h4>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{description}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">{total} total</span>
      </div>

      {total ? (
        <div className="grid items-center gap-4 p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-5">
          <div className="relative mx-auto size-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sortedItems} dataKey="count" nameKey="label" innerRadius={55} outerRadius={78} paddingAngle={sortedItems.length > 1 ? 3 : 0} stroke="none">
                  {sortedItems.map((item) => <Cell fill={item.color} key={item.label} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <strong className="text-2xl leading-none">{total}</strong>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total</span>
            </div>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {sortedItems.map((item) => (
              <div className="flex items-center gap-3 rounded-lg border border-neutral-100 px-3 py-2.5" key={item.label}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                <span className="text-xs text-neutral-400">{Math.round((item.count / total) * 100)}%</span>
                <strong className="w-6 text-right text-sm">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-neutral-100 text-neutral-400"><Icon size={19} /></span>
            <p className="mt-3 text-sm font-semibold">No data yet</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-500">This breakdown will populate when matching workspace records are added.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function breakdownColor(label, index, palette) {
  const semanticColors = {
    Completed: "#176b4d",
    Blocked: "#e11d48",
    Testing: "#8b5cf6",
    "In Progress": "#0ea5e9",
    "To Do": "#64748b",
    Cancelled: "#a3a3a3",
  };
  return semanticColors[label] || palette[index % palette.length];
}
function Time({ label, minutes }) { return <div className="rounded-xl bg-neutral-50 p-3 sm:p-4"><p className="text-[11px] font-semibold text-neutral-500 sm:text-xs">{label}</p><p className="mt-2 text-lg font-semibold sm:text-xl">{Math.floor(minutes/60)}h {minutes%60}m</p></div>; }
