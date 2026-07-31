"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import RoleIcon from "@/components/roles/RoleIcon";
import { ROLE_ICON_OPTIONS } from "@/constants/roles";
import SettingsModal from "./SettingsModal";

export default function RolesSettings() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("review");
  const [color, setColor] = useState("#047857");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/workspace/roles", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    setData(result.data);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createRole(event) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/workspace/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, color, permissions: [] }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success("Role created. Configure its permissions.");
    router.push(`/settings/permissions/${result.data.role.key}`);
    router.refresh();
  }

  if (!data) return <div className="space-y-4"><div className="skeleton h-20" /><div className="skeleton h-72" /></div>;

  return (
    <>
      <PageIntro
        eyebrow="Settings / Roles"
        title="Roles and permissions"
        description="Create a saved role, then open it to configure detailed access levels."
        actions={data.permissions.canManageRoles ? <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Create role</button> : null}
      />

      <SettingsModal
        open={createOpen && data.permissions.canManageRoles}
        onClose={() => !saving && setCreateOpen(false)}
        title="Create role"
        description="Name the role, choose a job icon and set the icon color used throughout the workspace."
        labelledBy="create-role-title"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={createRole}>
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <label>
            <span className="label">New role name</span>
            <input className="field" required minLength="2" maxLength="60" placeholder="e.g. Project Reviewer" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <fieldset>
            <legend className="label">Role icon</legend>
            <div className="flex flex-wrap gap-2">
              {ROLE_ICON_OPTIONS.map((option) => (
                <button
                  aria-label={option.label}
                  aria-pressed={icon === option.key}
                  className={`grid size-11 place-items-center rounded-xl border transition ${icon === option.key ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100" : "border-neutral-200 bg-white text-neutral-500 hover:border-emerald-200 hover:text-emerald-700"}`}
                  key={option.key}
                  onClick={() => setIcon(option.key)}
                  title={option.label}
                  type="button"
                >
                  <RoleIcon role={{ icon: option.key, color }} size={18} />
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span className="label">Role icon color</span>
            <span className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
              <input aria-label="Role icon color" className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <span className="font-mono text-sm uppercase text-neutral-600">{color}</span>
              <RoleIcon className="ml-auto" role={{ icon, color }} size={22} />
            </span>
          </label>
          </div>
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50/70 p-4 sm:flex-row sm:justify-end">
            <button className="btn btn-secondary" disabled={saving} onClick={() => setCreateOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" disabled={saving}><Plus size={16} />{saving ? "Creating..." : "Create role"}</button>
          </footer>
        </form>
      </SettingsModal>

      <div className="grid gap-3 md:grid-cols-2">
        {data.roles.map((role) => (
          <Link className="card group flex min-h-32 items-center gap-4 p-5 transition hover:border-emerald-200 hover:shadow-md" href={`/settings/permissions/${role.key}`} key={role.key}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-50">
              <RoleIcon role={role} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{role.name}</h3>
              <p className="mt-1 text-xs text-neutral-500">{role.permissions?.length || 0} permissions · {role.isSystem ? "System role" : "Custom role"}</p>
            </div>
            <ArrowRight className="text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700" size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}
