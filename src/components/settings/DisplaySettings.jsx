"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Save, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import RoleIcon from "@/components/roles/RoleIcon";

export default function DisplaySettings() {
  const [data, setData] = useState(null);
  const [standard, setStandard] = useState([]);
  const [allocation, setAllocation] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/workspace/display", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    setData(result.data);
    setStandard(result.data.highlightedRoleKeys);
    setAllocation(result.data.allocationRoleKeys);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/workspace/display", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlightedRoleKeys: standard, allocationRoleKeys: allocation }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    load();
  }

  if (!data) return <div className="space-y-4"><div className="skeleton h-20" /><div className="skeleton h-80" /></div>;

  return (
    <>
      <PageIntro eyebrow="Settings / Display" title="Team and Dashboard display" description="Choose standard roles shown separately from workspace members and roles used in allocation analytics." />
      <div className="grid gap-5 lg:grid-cols-2">
        <RoleSelection icon={UsersRound} title="Standard roles" description="Members with these roles appear in the Standard roles section and are excluded from the Workspace members list." roles={data.roles} selected={standard} onChange={setStandard} limit={8} />
        <RoleSelection icon={BarChart3} title="Dashboard allocation roles" description="Only these roles are included in project allocation and contribution analytics." roles={data.roles} selected={allocation} onChange={setAllocation} limit={20} />
      </div>
      <div className="sticky bottom-4 z-20 mt-5 flex justify-end rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button className="btn btn-primary w-full sm:w-auto" disabled={saving} onClick={save}><Save size={16} />{saving ? "Saving..." : "Save display settings"}</button>
      </div>
    </>
  );
}

function RoleSelection({ icon: Icon, title, description, roles, selected, onChange, limit }) {
  function toggle(key) {
    if (selected.includes(key)) onChange(selected.filter((item) => item !== key));
    else if (selected.length < limit) onChange([...selected, key]);
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex gap-3 border-b border-neutral-100 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18} /></span>
        <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p></div>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
        {roles.map((role) => {
          const active = selected.includes(role.key);
          return <button aria-pressed={active} className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-semibold transition ${active ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100" : "border-neutral-200 bg-white text-neutral-600 hover:border-emerald-200"}`} key={role.key} onClick={() => toggle(role.key)} type="button"><RoleIcon role={role} size={17} /><span className="min-w-0 flex-1 truncate">{role.name}</span>{active && <span className="text-xs">Selected</span>}</button>;
        })}
      </div>
    </section>
  );
}
