"use client";

import { useState } from "react";
import { Check, MoreHorizontal, Plus, Trash2, UserRoundPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RoleIcon from "@/components/roles/RoleIcon";
import { SettingsSkeleton, useWorkspaceData } from "./useWorkspaceData";
import SettingsModal from "./SettingsModal";
import Dropdown from "@/components/ui/Dropdown";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrors, memberSchema } from "@/lib/validations";

const emptyUser = { name: "", email: "", password: "", role: "member" };

export default function UsersSettings() {
  const { data, loading, reload } = useWorkspaceData();
  const [showAdd, setShowAdd] = useState(false);
  const [user, setUser] = useState(emptyUser);
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [errors, setErrors] = useState({});

  function updateUser(field, value) {
    setUser((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  async function addUser(event) {
    event.preventDefault();
    const selectedRole = roles.some((role) => role.key === user.role)
      ? user.role
      : roles[0]?.key;
    if (!selectedRole) {
      setErrors({ role: "Create an assignable role before adding a user." });
      return;
    }
    const validation = getFieldErrors(memberSchema, { ...user, role: selectedRole });
    if (!validation.data) return setErrors(validation.errors);
    setErrors({});
    setSaving(true);
    const response = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      const serverErrors = result.errors || {};
      const emailConflict = /email|account/i.test(result.message) ? { email: result.message } : {};
      setErrors({ ...serverErrors, ...emailConflict, form: Object.keys(serverErrors).length || emailConflict.email ? undefined : result.message });
      return toast.error(result.message);
    }
    toast.success(result.message);
    setUser(emptyUser);
    setErrors({});
    setShowAdd(false);
    reload();
  }

  async function updateRole(memberId, role) {
    const response = await fetch(`/api/workspace/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    reload();
  }

  function removeUser(memberId, memberName) {
    setRemoveTarget({ memberId, memberName });
  }

  async function confirmRemoveUser() {
    const response = await fetch(`/api/workspace/members/${removeTarget.memberId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setRemoveTarget(null);
    reload();
  }

  if (loading || !data) return <SettingsSkeleton />;

  const roles = (data.workspace.roles || []).filter((role) =>
    data.assignableRoleKeys?.includes(role.key),
  );
  const selectedRole = roles.some((role) => role.key === user.role)
    ? user.role
    : roles[0]?.key || "";
  const canView = data.permissions.canViewMembers;
  const canCreate = data.permissions.canCreateMembers;
  const canManage = data.permissions.canManageMembers;

  return (
    <>
      <PageIntro
        eyebrow="Settings / Users"
        title="Users and access"
        description="Add people to this workspace and assign one of your saved roles."
        actions={canCreate && data.workspace.type !== "personal" ? (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} />Add user
          </button>
        ) : null}
      />

      {data.workspace.type === "personal" && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Switch the workspace to Organization or Team before adding more users.
        </div>
      )}

      <SettingsModal
        open={showAdd && canCreate}
        onClose={() => { if (!saving) { setShowAdd(false); setErrors({}); } }}
        title="Add workspace user"
        description="Create secure sign-in details and assign one of your saved roles."
        labelledBy="add-user-title"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={addUser}>
          <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
          <div className="flex items-center gap-3 sm:col-span-2">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRoundPlus size={19} /></span>
            <div><h3 className="font-semibold">Account access</h3><p className="text-xs text-neutral-500">The user can sign in with this email and temporary password.</p></div>
          </div>
          <label><span className="label">Name</span><input className="field" aria-invalid={Boolean(errors.name)} value={user.name} onChange={(event) => updateUser("name", event.target.value)} /><FieldError message={errors.name} /></label>
          <label><span className="label">Email</span><input className="field" aria-invalid={Boolean(errors.email)} type="email" value={user.email} onChange={(event) => updateUser("email", event.target.value)} /><FieldError message={errors.email} /></label>
          <label><span className="label">Temporary password</span><input className="field" aria-invalid={Boolean(errors.password)} type="password" autoComplete="new-password" value={user.password} onChange={(event) => updateUser("password", event.target.value)} /><FieldError message={errors.password} /><span className="mt-1 block text-xs text-neutral-500">At least 8 characters with uppercase, lowercase, and a number.</span></label>
          <div>
            <span className="label">Saved role</span>
            <Dropdown value={selectedRole} onChange={(role) => updateUser("role", role)} options={roles.map((role) => ({ value: role.key, label: role.name, icon: <RoleIcon role={role} size={15} /> }))} />
            <FieldError message={errors.role} />
          </div>
          </div>
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50/70 p-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setShowAdd(false); setErrors({}); }}>Cancel</button>
            <FieldError message={errors.form} className="self-center" />
            <button className="btn btn-primary" disabled={saving || !selectedRole}>{saving ? "Adding..." : "Add user"}</button>
          </footer>
        </form>
      </SettingsModal>

      <section className="card overflow-visible">
        <div className="flex items-center gap-3 border-b border-neutral-100 p-4 sm:px-6">
          <span className="grid size-9 place-items-center rounded-lg bg-neutral-100 text-neutral-600"><Users size={17} /></span>
          <div><h3 className="font-semibold">Workspace users</h3><p className="text-xs text-neutral-500">{canView ? `${data.members.length} users` : "Directory access is restricted"}</p></div>
        </div>
        {canView ? (
          <div className="divide-y divide-neutral-100">
            {data.members.map((member) => (
              <div className="relative grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 p-4 has-[details[open]]:z-40 sm:px-6" key={member._id}>
                <span className="grid size-10 place-items-center rounded-full bg-emerald-50 font-semibold text-emerald-700">{member.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name}</p><p className="truncate text-xs text-neutral-500">{member.email}</p></div>
                <div className="col-span-2 col-start-2 flex min-w-0 items-center justify-between gap-2 sm:col-span-1 sm:col-start-auto">
                  <RoleBadge roles={data.workspace.roles} roleKey={member.role} />
                  {canManage && member.role !== "owner" && (
                    <details className="group relative open:z-40" data-action-menu>
                      <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-emerald-200 hover:text-emerald-700 [&::-webkit-details-marker]:hidden" aria-label={`Actions for ${member.name}`}>
                        <MoreHorizontal size={18} />
                      </summary>
                      <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Change role</p>
                        <div className="space-y-1">
                          {roles.map((role) => (
                            <button
                              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-neutral-50 ${member.role === role.key ? "bg-emerald-50 text-emerald-800" : "text-neutral-700"}`}
                              key={role.key}
                              onClick={() => updateRole(member._id, role.key)}
                              type="button"
                            >
                              <RoleIcon role={role} size={16} />
                              <span className="min-w-0 flex-1 truncate">{role.name}</span>
                              {member.role === role.key && <Check size={15} />}
                            </button>
                          ))}
                        </div>
                        {String(member._id) !== String(data.currentUserId) && (
                          <>
                            <div className="my-2 h-px bg-neutral-100" />
                            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50" onClick={() => removeUser(member._id, member.name)} type="button">
                              <Trash2 size={16} />Remove member
                            </button>
                          </>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-neutral-500">Your role does not include the View users permission.</p>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove ${removeTarget?.memberName || "this user"}?`}
        description="This user will lose access to the workspace and its shared projects and tasks."
        confirmLabel="Remove user"
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemoveUser}
      />
    </>
  );
}

function roleName(roles = [], key) {
  return roles.find((role) => role.key === key)?.name || key;
}

function RoleBadge({ roles = [], roleKey }) {
  const role = roles.find((item) => item.key === roleKey) || {
    key: roleKey,
    name: roleName(roles, roleKey),
  };
  const owner = roleKey === "owner";

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${owner ? "border-amber-200 bg-amber-50 text-amber-700" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>
      <RoleIcon role={role} size={14} />
      <span className="truncate">{role.name}</span>
    </span>
  );
}
