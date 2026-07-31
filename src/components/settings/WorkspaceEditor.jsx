"use client";

import { useState } from "react";
import { Building2, Save, User, Users } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import { SettingsSkeleton, useWorkspaceData } from "./useWorkspaceData";

const modes = [
  { value: "personal", label: "Personal", description: "A private workspace for one user.", icon: User },
  { value: "organization", label: "Organization", description: "Company projects shared across departments.", icon: Building2 },
  { value: "team", label: "Team", description: "A focused collaborative workspace.", icon: Users },
];

export default function WorkspaceEditor() {
  const { data, loading, reload } = useWorkspaceData();

  if (loading || !data) return <SettingsSkeleton />;
  return (
    <WorkspaceForm
      key={`${data.workspace._id}-${data.workspace.name}-${data.workspace.type}`}
      workspace={data.workspace}
      reload={reload}
    />
  );
}

function WorkspaceForm({ workspace, reload }) {
  const [name, setName] = useState(workspace.name);
  const [type, setType] = useState(workspace.type);
  const [saving, setSaving] = useState(false);

  async function saveWorkspace(event) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    reload();
  }

  return (
    <>
      <PageIntro eyebrow="Settings / Workspace" title="Workspace configuration" description="Edit workspace identity and choose how your users collaborate." />
      <form className="card p-4 sm:p-6" onSubmit={saveWorkspace}>
        <label className="block">
          <span className="label">Workspace name</span>
          <input className="field" required minLength="2" maxLength="120" value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <fieldset className="mt-6">
          <legend className="label">Workspace mode</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {modes.map(({ value, label, description, icon: Icon }) => (
              <button
                type="button"
                key={value}
                onClick={() => setType(value)}
                className={`min-h-36 rounded-xl border p-4 text-left transition ${
                  type === value
                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <Icon size={20} className={type === value ? "text-emerald-700" : "text-neutral-500"} />
                <p className="mt-4 font-semibold">{label}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end">
          <button className="btn btn-primary w-full sm:w-auto" disabled={saving}>
            <Save size={16} />{saving ? "Saving..." : "Save workspace"}
          </button>
        </div>
      </form>
    </>
  );
}
