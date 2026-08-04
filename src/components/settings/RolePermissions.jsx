"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RoleIcon from "@/components/roles/RoleIcon";
import { ROLE_ICON_OPTIONS } from "@/constants/roles";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrors, roleSchema } from "@/lib/validations";

const groupIcons = {
  visibility: Eye,
  records: Wrench,
  workspace: Settings2,
  settings_tabs: Settings2,
};

export default function RolePermissions({ roleKey }) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/workspace/roles/${encodeURIComponent(roleKey)}`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok) {
      setData({ error: result.message });
      return;
    }
    setData(result.data);
  }, [roleKey]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!data) return <div className="space-y-4"><div className="skeleton h-20" /><div className="skeleton h-96" /></div>;
  if (data.error) {
    return (
      <section className="card p-8 text-center">
        <h2 className="font-semibold">Role not found</h2>
        <p className="mt-2 text-sm text-neutral-500">{data.error}</p>
        <Link className="btn btn-primary mt-5" href="/settings/roles">Back to roles</Link>
      </section>
    );
  }
  const role = data.role;

  return (
    <RoleEditor
      key={`${role.key}-${role.name}-${role.icon}-${role.color}-${role.permissions.join(",")}`}
      role={role}
      groups={data.permissionGroups}
      permissions={data.availablePermissions}
      canManage={data.permissions.canManageRoles}
      canEditOwnerIcon={data.permissions.canEditOwnerIcon}
    />
  );
}

function RoleEditor({ role, groups, permissions, canManage, canEditOwnerIcon }) {
  const router = useRouter();
  const editable = canManage && role.key !== "owner";
  const iconEditable = editable || (role.key === "owner" && canEditOwnerIcon);
  const [draft, setDraft] = useState({
    name: role.name,
    icon: role.icon,
    color: role.color || "#047857",
    permissions: [...(role.permissions || [])],
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errors, setErrors] = useState({});

  function togglePermission(key) {
    if (!editable) return;
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((permission) => permission !== key)
        : [...current.permissions, key],
    }));
  }

  function toggleGroup(groupKey) {
    if (!editable) return;
    const groupKeys = permissions.filter((permission) => permission.group === groupKey).map((permission) => permission.key);
    const allSelected = groupKeys.every((key) => draft.permissions.includes(key));
    setDraft((current) => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter((key) => !groupKeys.includes(key))
        : [...new Set([...current.permissions, ...groupKeys])],
    }));
  }

  async function saveRole(event) {
    event.preventDefault();
    const validation = getFieldErrors(roleSchema, draft);
    if (!validation.data) return setErrors(validation.errors);
    setErrors({});
    setSaving(true);
    const response = await fetch(`/api/workspace/roles/${role.key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setErrors({ ...(result.errors || {}), form: result.message });
      return toast.error(result.message);
    }
    toast.success(result.message);
    router.refresh();
  }

  async function deleteRole() {
    const response = await fetch(`/api/workspace/roles/${role.key}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    router.push("/settings/roles");
    router.refresh();
  }

  return (
    <>
      <PageIntro
        eyebrow="Settings / Roles / Permissions"
        title={role.name}
        description="Configure exactly what users assigned to this role can see, create, and manage."
        actions={<Link className="btn btn-secondary" href="/settings/roles"><ArrowLeft size={16} />All roles</Link>}
      />

      <form onSubmit={saveRole}>
        <section className="card mb-5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-neutral-50">
              <RoleIcon role={{ ...role, icon: draft.icon, color: draft.color }} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{role.isSystem ? "System role" : "Custom role"}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{draft.permissions.length} of {permissions.length} permissions enabled</p>
            </div>
          </div>
          <label className="mt-5 block">
            <span className="label">Role name</span>
            <input className="field" aria-invalid={Boolean(errors.name)} disabled={!editable} value={draft.name} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setErrors((current) => ({ ...current, name: undefined, form: undefined })); }} />
            <FieldError message={errors.name} />
          </label>
          <fieldset className="mt-5" disabled={!iconEditable}>
            <legend className="label">Role icon</legend>
            <div className="flex flex-wrap gap-2">
              {ROLE_ICON_OPTIONS.map((option) => (
                <button
                  aria-label={option.label}
                  aria-pressed={draft.icon === option.key}
                  className={`grid size-11 place-items-center rounded-xl border transition ${draft.icon === option.key ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100" : "border-neutral-200 bg-white text-neutral-500"} disabled:cursor-not-allowed disabled:opacity-60`}
                  key={option.key}
                  onClick={() => setDraft({ ...draft, icon: option.key })}
                  title={option.label}
                  type="button"
                >
                  <RoleIcon role={{ icon: option.key, color: draft.color }} size={18} />
                </button>
              ))}
            </div>
            <FieldError message={errors.icon} />
          </fieldset>
          <label className="mt-5 block">
            <span className="label">Role icon color</span>
            <span className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
              <input aria-label="Role icon color" className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:cursor-not-allowed" disabled={!iconEditable} type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
              <span className="font-mono text-sm uppercase text-neutral-600">{draft.color}</span>
            </span>
            <FieldError message={errors.color} />
          </label>
          {role.key === "owner" && <p className="mt-3 text-xs leading-5 text-amber-700">The Owner name and full access are protected. The workspace owner can still choose any role icon.</p>}
        </section>

        <div className="space-y-4">
          {groups.map((group) => {
            const options = permissions.filter((permission) => permission.group === group.key);
            const selectedCount = options.filter((permission) => draft.permissions.includes(permission.key)).length;
            const Icon = groupIcons[group.key] || ShieldCheck;
            return (
              <section className="card overflow-hidden" key={group.key}>
                <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 sm:px-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{group.label}</h3>
                    <p className="mt-0.5 text-xs text-neutral-500">{group.description}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">{selectedCount}/{options.length}</span>
                  {editable && <button type="button" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800" onClick={() => toggleGroup(group.key)}>{selectedCount === options.length ? "Clear group" : "Select all"}</button>}
                </div>
                <div className="space-y-6 p-4 sm:p-6">
                  {permissionSections(options).map((section) => (
                    <div key={section.name || group.key}>
                      {section.name && (
                        <div className="mb-3 flex items-center gap-3">
                          <h4 className="text-sm font-semibold text-neutral-800">{section.name}</h4>
                          <span className="h-px flex-1 bg-neutral-100" />
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-2">
                        {section.items.map((permission) => {
                          const selected = draft.permissions.includes(permission.key);
                          return (
                            <label className={`flex min-h-20 items-start gap-3 rounded-xl border p-4 transition ${selected ? "border-emerald-200 bg-emerald-50/60" : "border-neutral-200 bg-white"} ${editable ? "cursor-pointer" : ""}`} key={permission.key}>
                              <input type="checkbox" className="mt-1" disabled={!editable} checked={selected} onChange={() => togglePermission(permission.key)} />
                              <span><span className="block text-sm font-semibold">{permission.label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{permission.description}</span></span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {(editable || iconEditable) && (
          <div className="sticky bottom-4 z-20 mt-5 flex flex-col-reverse gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
            <FieldError message={errors.form} className="self-center" />
            {!role.isSystem && <button type="button" className="btn btn-danger" onClick={() => setDeleteConfirmOpen(true)}><Trash2 size={16} />Delete role</button>}
            <button className="btn btn-primary" disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save permissions"}</button>
          </div>
        )}
      </form>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete the ${role.name} role?`}
        description="The saved role and its permission configuration will be permanently removed. Reassign any users before deleting it."
        confirmLabel="Delete role"
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteRole}
      />
    </>
  );
}

function permissionSections(options) {
  const names = [...new Set(options.map((permission) => permission.section).filter(Boolean))];
  if (!names.length) return [{ name: null, items: options }];
  return names.map((name) => ({
    name,
    items: options.filter((permission) => permission.section === name),
  }));
}
