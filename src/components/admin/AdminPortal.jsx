"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  Building2,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import FeedbackAdmin from "@/components/admin/FeedbackAdmin";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Dropdown from "@/components/ui/Dropdown";
import { EmptyState, PageIntro } from "@/components/ui";
import { cn } from "@/lib/utils";

const sections = [
  ["overview", "Overview", LayoutDashboard],
  ["users", "Users", UsersRound],
  ["workspaces", "Workspaces", Building2],
  ["feedback", "Feedback", MessageSquareText],
];

export default function AdminPortal() {
  const [section, setSection] = useState("overview");

  return (
    <>
      <PageIntro
        eyebrow="Website administration"
        title="Website control center"
        description="Manage every website account and workspace. These controls are separate from workspace roles and permissions."
        actions={<span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={15} />Site administrator</span>}
      />
      <nav className="card mb-6 flex gap-1 overflow-x-auto p-1.5" aria-label="Administration sections">
        {sections.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-neutral-500 transition",
              section === key ? "bg-[#176b4d] text-white shadow-sm" : "hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>
      {section === "overview" && <Overview onOpen={setSection} />}
      {section === "users" && <UsersAdmin />}
      {section === "workspaces" && <WorkspacesAdmin />}
      {section === "feedback" && <FeedbackAdmin />}
    </>
  );
}

function Overview({ onOpen }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) return toast.error(result.message);
        setData(result.data);
      })
      .catch(() => active && toast.error("Unable to load website analytics."));
    return () => { active = false; };
  }, []);

  if (!data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div className="skeleton h-32" key={index} />)}</div>;

  const metrics = [
    ["Total users", data.metrics.users, UsersRound, "bg-sky-50 text-sky-700"],
    ["Active users", data.metrics.activeUsers, UserRoundCheck, "bg-emerald-50 text-emerald-700"],
    ["Workspaces", data.metrics.workspaces, Building2, "bg-violet-50 text-violet-700"],
    ["Active workspaces", data.metrics.activeWorkspaces, CheckCircle2, "bg-teal-50 text-teal-700"],
    ["Projects", data.metrics.projects, FolderKanban, "bg-amber-50 text-amber-700"],
    ["Tasks", data.metrics.tasks, Activity, "bg-indigo-50 text-indigo-700"],
    ["Suspended users", data.metrics.suspendedUsers, UsersRound, "bg-red-50 text-red-700"],
    ["Pending feedback", data.feedback.pending, MessageSquareText, "bg-orange-50 text-orange-700"],
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon, tone]) => (
          <article className="card p-5" key={label}>
            <span className={cn("grid size-10 place-items-center rounded-xl", tone)}><Icon size={18} /></span>
            <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-sm text-neutral-500">{label}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminShortcut title="Manage users" description="Review every account and control website access." icon={UsersRound} onClick={() => onOpen("users")} />
        <AdminShortcut title="Manage workspaces" description="Inspect workspace usage and suspend access when required." icon={Building2} onClick={() => onOpen("workspaces")} />
        <AdminShortcut title="Moderate feedback" description="Approve public testimonials and review submissions." icon={MessageSquareText} onClick={() => onOpen("feedback")} />
      </div>
    </>
  );
}

function AdminShortcut({ title, description, icon: Icon, onClick }) {
  return (
    <button type="button" className="card group flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md" onClick={onClick}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18} /></span>
      <span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span></span>
    </button>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState(null);
  const [adminId, setAdminId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    setUsers(result.data.users);
    setAdminId(result.data.currentAdminId);
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateStatus() {
    const response = await fetch(`/api/admin/users/${action.item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action.nextStatus }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    toast.success(result.message);
    setAction(null);
    await load();
  }

  async function deleteUser() {
    const response = await fetch(`/api/admin/users/${action.item._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: action.item.email }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message);
      throw new Error(result.message);
    }
    toast.success(result.message);
    setAction(null);
    await load();
  }

  return (
    <>
      <SectionHeading title="Website users" description="All registered accounts across every workspace." />
      <AdminFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} placeholder="Search users by name or email..." />
      {!users ? <div className="skeleton h-80" /> : users.length ? (
        <section className="card overflow-hidden">
          <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_130px_120px] gap-4 border-b border-neutral-100 bg-neutral-50/70 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 md:grid">
            <span>User</span><span>Workspace</span><span>Role</span><span className="text-right">Access</span>
          </div>
          {users.map((user) => {
            const suspended = user.status === "suspended";
            const isAdmin = String(user._id) === String(adminId);
            return (
              <article className="grid gap-3 border-b border-neutral-100 p-4 last:border-0 md:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_130px_120px] md:items-center md:gap-4 md:px-5" key={user._id}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><strong className="truncate text-sm">{user.name}</strong>{isAdmin && <span title="Site administrator" className="text-emerald-700"><ShieldCheck size={15} /></span>}</div>
                  <p className="truncate text-xs text-neutral-500">{user.email}</p>
                </div>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{user.workspaceId?.name || "No workspace"}</p><p className="text-xs capitalize text-neutral-400">{user.workspaceId?.type || "Unassigned"}</p></div>
                <span className="w-fit rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold capitalize">{user.role}</span>
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <Status status={suspended ? "suspended" : "active"} />
                  {!isAdmin && <AdminActionsMenu
                    label={user.name}
                    items={[
                      {
                        label: suspended ? "Reactivate access" : "Suspend access",
                        icon: suspended ? UserRoundCheck : Ban,
                        onClick: () => setAction({ kind: "status", type: "user", item: user, nextStatus: suspended ? "active" : "suspended" }),
                      },
                      {
                        label: "Delete user",
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setAction({ kind: "delete", type: "user", item: user }),
                      },
                    ]}
                  />}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="No users found" description="Try another search or status filter." />}
      <ActionDialog action={action?.kind === "status" ? action : null} onClose={() => setAction(null)} onConfirm={updateStatus} />
      <ConfirmDialog
        open={action?.kind === "delete"}
        title="Delete this website user?"
        description="The account, comments, and personal activity will be removed. Authored projects and tasks will be transferred to the workspace owner."
        verificationText={action?.item?.email}
        confirmLabel="Delete user"
        onClose={() => setAction(null)}
        onConfirm={deleteUser}
      />
    </>
  );
}

function WorkspacesAdmin() {
  const [workspaces, setWorkspaces] = useState(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [action, setAction] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const response = await fetch(`/api/admin/workspaces?${params}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    setWorkspaces(result.data.workspaces);
    setCurrentWorkspaceId(result.data.currentWorkspaceId);
  }, [search, status, type]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateStatus() {
    const response = await fetch(`/api/admin/workspaces/${action.item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action.nextStatus }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    toast.success(result.message);
    setAction(null);
    await load();
  }

  async function deleteWorkspace() {
    const response = await fetch(`/api/admin/workspaces/${action.item._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: action.item.name }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message);
      throw new Error(result.message);
    }
    toast.success(result.message);
    setAction(null);
    await load();
  }

  return (
    <>
      <SectionHeading title="Website workspaces" description="Inspect all personal, organization, and team workspaces." />
      <AdminFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} placeholder="Search workspace name...">
        <Dropdown className="sm:w-48" ariaLabel="Workspace type" value={type} onChange={setType} options={[["", "All workspace types"], ["personal", "Personal"], ["organization", "Organization"], ["team", "Team"]]} />
      </AdminFilters>
      {!workspaces ? <div className="skeleton h-80" /> : workspaces.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {workspaces.map((workspace) => {
            const suspended = workspace.status === "suspended";
            const isCurrent = String(workspace._id) === String(currentWorkspaceId);
            return (
              <article className="card p-5" key={workspace._id}>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Building2 size={18} /></span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{workspace.name}</h3><Status status={suspended ? "suspended" : "active"} /></div><p className="mt-1 text-xs capitalize text-neutral-500">{workspace.type} workspace</p></div>
                  {!isCurrent && <AdminActionsMenu
                    label={workspace.name}
                    items={[
                      {
                        label: suspended ? "Reactivate workspace" : "Suspend workspace",
                        icon: suspended ? CheckCircle2 : Ban,
                        onClick: () => setAction({ kind: "status", type: "workspace", item: workspace, nextStatus: suspended ? "active" : "suspended" }),
                      },
                      {
                        label: "Delete workspace",
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setAction({ kind: "delete", type: "workspace", item: workspace }),
                      },
                    ]}
                  />}
                </div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-100 bg-neutral-50/60 py-3 text-center">
                  <Count label="Members" value={workspace.counts.members} />
                  <Count label="Projects" value={workspace.counts.projects} />
                  <Count label="Tasks" value={workspace.counts.tasks} />
                </div>
                <div className="mt-4 border-t border-neutral-100 pt-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Owner</p><p className="mt-1 text-sm font-medium">{workspace.ownerId?.name || "Unknown owner"}</p><p className="truncate text-xs text-neutral-500">{workspace.ownerId?.email || "Owner account unavailable"}</p></div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="No workspaces found" description="Try another search, type, or status filter." />}
      <ActionDialog action={action?.kind === "status" ? action : null} onClose={() => setAction(null)} onConfirm={updateStatus} />
      <ConfirmDialog
        open={action?.kind === "delete"}
        title="Delete this workspace?"
        description="Every user, project, task, subtask, comment, and activity record in this workspace will be permanently deleted."
        verificationText={action?.item?.name}
        confirmLabel="Delete workspace"
        onClose={() => setAction(null)}
        onConfirm={deleteWorkspace}
      />
    </>
  );
}

function AdminFilters({ search, setSearch, status, setStatus, placeholder, children }) {
  return (
    <section className="card mb-5 overflow-visible p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input className="field search-field" aria-label="Search" placeholder={placeholder} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <Dropdown className="sm:w-44" ariaLabel="Access status" value={status} onChange={setStatus} options={[["", "All statuses"], ["active", "Active"], ["suspended", "Suspended"]]} />
        {children}
      </div>
    </section>
  );
}

function SectionHeading({ title, description }) {
  return <div className="mb-4"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-neutral-500">{description}</p></div>;
}

function Status({ status }) {
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", status === "suspended" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{status}</span>;
}

function Count({ label, value }) {
  return <div><p className="font-semibold">{value}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-400">{label}</p></div>;
}

function ActionDialog({ action, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!action) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [action]);
  if (!action) return null;
  const suspending = action.nextStatus === "suspended";
  const label = action.item.name;
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-start gap-3"><span className={cn("grid size-10 place-items-center rounded-xl", suspending ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}><ShieldCheck size={18} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Website access</p><h2 className="mt-1 text-lg font-semibold">{suspending ? "Suspend" : "Reactivate"} {action.type}?</h2></div><button className="grid size-9 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button></div>
        <p className="mt-5 text-sm leading-6 text-neutral-600">{suspending ? `${label} will lose website access immediately. Existing sessions will be invalidated.` : `${label} will be allowed to access the website again.`}</p>
        <div className="mt-6 flex justify-end gap-2"><button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className={cn("btn text-white", suspending ? "bg-red-600 hover:bg-red-700" : "bg-[#176b4d] hover:bg-[#125b40]")} onClick={confirm} disabled={busy}>{busy ? "Please wait..." : suspending ? "Suspend access" : "Reactivate"}</button></div>
      </section>
    </div>
  );
}
