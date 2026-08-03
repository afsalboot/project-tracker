"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Search, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Badge, EmptyState, PageIntro, Progress } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RoleIcon from "@/components/roles/RoleIcon";
import Dropdown from "@/components/ui/Dropdown";

export default function TeamView() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState([]);
  const [project, setProject] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(async () => {
    const result = await fetch("/api/team", { cache: "no-store" }).then((response) => response.json());
    if (!result.success) return toast.error(result.message);
    setData(result.data);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateRole(memberId, nextRole) {
    const response = await fetch(`/api/workspace/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    load();
  }

  async function removeMember() {
    const response = await fetch(`/api/workspace/members/${removeTarget._id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setRemoveTarget(null);
    load();
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.members.filter((member) =>
      !data.highlightedRoleKeys.includes(member.role) &&
      (!term || member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term)) &&
      (!role.length || role.includes(member.role)) &&
      (!project.length || member.projects.some((item) => project.includes(String(item._id)))),
    );
  }, [data, project, role, search]);

  if (!data) return <div className="space-y-5"><div className="skeleton h-20" /><div className="skeleton h-36" /><div className="skeleton h-96" /></div>;
  const standardMembers = data.members.filter((member) => data.highlightedRoleKeys.includes(member.role));

  return (
    <>
      <PageIntro
        eyebrow="Workspace / Team"
        title="Team and project ownership"
        description="See standard roles separately from workspace members, with project and task contribution details."
      />

      {standardMembers.length > 0 && (
        <section className="mb-5">
          <div className="mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-700" /><h2 className="font-semibold">Workspace leadership</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {standardMembers.map((member) => <HighlightCard member={member} roles={data.roles} key={member._id} />)}
          </div>
        </section>
      )}

      <section className="card overflow-visible">
        <div className="flex flex-col gap-4 border-b border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound size={19} /></span><div><h2 className="font-semibold">Team members</h2><p className="text-xs text-neutral-500">{filtered.length} Team members</p></div></div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[760px]">
            <label className="relative sm:col-span-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input aria-label="Search members" className="field search-field" placeholder="Search members…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <Dropdown multiple value={role} onChange={setRole} placeholder="All roles" options={data.roles.filter((item) => !data.highlightedRoleKeys.includes(item.key)).map((item) => [item.key, item.name])} />
            <Dropdown multiple value={project} onChange={setProject} placeholder="All projects" options={data.projects.map((item) => [item._id, item.name])} />
          </div>
        </div>

        {filtered.length ? <div className="divide-y divide-neutral-100">{filtered.map((member) => (
          <MemberRow
            key={member._id}
            member={member}
            roles={data.roles}
            canManage={data.canManage}
            currentUserId={data.currentUserId}
            onRole={updateRole}
            onRemove={setRemoveTarget}
          />
        ))}</div> : <div className="p-5"><EmptyState title="No members found" description="Adjust the search or filters." /></div>}
      </section>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove ${removeTarget?.name || "this member"}?`}
        description="This member will lose access to the workspace and shared projects."
        confirmLabel="Remove member"
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeMember}
      />
    </>
  );
}

function HighlightCard({ member, roles }) {
  const role = roleDefinition(roles, member.role);
  return (
    <article className="card overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-50 font-semibold text-emerald-700">{initials(member.name)}</span>
        <div className="min-w-0"><p className="truncate font-semibold">{member.name}</p><p className="text-xs text-neutral-500">{roleName(roles, member.role)}</p></div>
        <RoleIcon className={`ml-auto ${member.role === "owner" ? "text-amber-600" : "text-emerald-700"}`} role={role} size={16} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-neutral-700">{member.totalProjects || 0} total project{member.totalProjects === 1 ? "" : "s"}</span><span className="text-neutral-400">{member.projects.length} active</span></div>
    </article>
  );
}

function MemberRow({ member, roles, canManage, currentUserId, onRole, onRemove }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const taskTotal = member.projects.reduce((sum, item) => sum + item.taskStats.tasks, 0);
  const subtaskTotal = member.projects.reduce((sum, item) => sum + item.taskStats.subtasks, 0);
  const completedSubtasks = member.projects.reduce((sum, item) => sum + item.taskStats.completedSubtasks, 0);
  const editable = canManage && member.role !== "owner";

  useEffect(() => {
    if (!open) return;
    function closeOutside(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <article className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[220px_150px_minmax(0,1fr)_150px_44px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold">{initials(member.name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name}</p><p className="truncate text-xs text-neutral-500">{member.email}</p></div></div>
      <div><Badge><span className="inline-flex items-center gap-1.5"><RoleIcon role={roleDefinition(roles, member.role)} size={14} />{roleName(roles, member.role)}</span></Badge></div>
      <div className="min-w-0">
        {member.projects.length ? <div className="flex flex-wrap gap-1.5">{member.projects.slice(0, 4).map((item) => <span className="max-w-40 truncate rounded-full bg-neutral-100 px-2.5 py-1 text-xs" key={item._id}>{item.name}</span>)}{member.projects.length > 4 && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">+{member.projects.length - 4}</span>}</div> : <span className="text-xs text-neutral-400">No project allocation</span>}
      </div>
      <div className="text-xs text-neutral-500"><p className="font-semibold text-neutral-700">{member.totalProjects || 0} project{member.totalProjects === 1 ? "" : "s"}</p><p className="mt-1">{taskTotal} tasks</p><p className="mt-1">{completedSubtasks} of {subtaskTotal} subtasks</p></div>
      <div className="relative justify-self-end" ref={menuRef}>
        {editable && <button className="grid size-10 place-items-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50" onClick={() => setOpen((value) => !value)} aria-label={`Actions for ${member.name}`}><MoreHorizontal size={17} /></button>}
        {open && <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
          <div><span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Change role</span><Dropdown className="mt-1" value={member.role} onChange={(value) => { onRole(member._id, value); setOpen(false); }} options={roles.filter((item) => item.key !== "owner").map((item) => ({ value: item.key, label: item.name, icon: <RoleIcon role={item} size={15} /> }))} /></div>
          {String(member._id) !== String(currentUserId) && <button className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { onRemove(member); setOpen(false); }}>Remove member</button>}
        </div>}
      </div>
    </article>
  );
}

function initials(name = "") { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function roleName(roles, key) { return roles.find((role) => role.key === key)?.name || key; }
function roleDefinition(roles, key) { return roles.find((role) => role.key === key) || { key, name: key }; }
