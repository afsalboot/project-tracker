"use client";

import { useState } from "react";
import { GripVertical, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { CUSTOMIZATION_SECTIONS } from "@/constants/customization";
import { PageIntro } from "@/components/ui";
import useProjectCustomization from "@/components/settings/useProjectCustomization";

const projectKeys = ["projectStages", "environments", "starterTemplates", "projectTypes", "projectPlatforms", "zohoPlatforms"];
const taskKeys = ["taskStatuses", "environments"];

export default function ProjectCustomization() {
  const { customization, setCustomization, loading } = useProjectCustomization();
  const [area, setArea] = useState("project");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const keys = area === "project" ? projectKeys : taskKeys;

  function change(key, id, patch) {
    setCustomization((current) => ({
      ...current,
      [key]: current[key].map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function add(key, afterId) {
    const isTemplate = key === "starterTemplates";
    const enabled = customization[key].length ? customization[key].some((item) => item.enabled) : true;
    const item = { id: `${key}-${crypto.randomUUID()}`.toLowerCase(), label: "New option", enabled, ...(isTemplate ? { tasks: [] } : {}) };
    setCustomization((current) => {
      const index = current[key].findIndex((option) => option.id === afterId);
      const options = [...current[key]];
      options.splice(index + 1, 0, item);
      return { ...current, [key]: options };
    });
  }

  function remove(key, id) {
    setCustomization((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  }

  function toggleSection(key, enabled) {
    setCustomization((current) => ({
      ...current,
      [key]: current[key].map((item) => ({ ...item, enabled })),
    }));
  }

  function move(key, targetId) {
    if (!dragging || dragging.key !== key || dragging.id === targetId) return;
    setCustomization((current) => {
      const options = [...current[key]];
      const from = options.findIndex((item) => item.id === dragging.id);
      const to = options.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const [item] = options.splice(from, 1);
      options.splice(to, 0, item);
      return { ...current, [key]: options };
    });
    setDragging(null);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/workspace/customization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customization),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.message);
      setCustomization(result.data.customization);
      toast.success(result.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="WORKSPACE CONFIGURATION" title="Project & Task Setup" description="Choose what appears in forms, rename options, and drag them into the order your team uses." />
      <div className="mb-6 inline-flex w-full rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm sm:w-auto">
        {["project", "task"].map((item) => <button type="button" key={item} onClick={() => setArea(item)} className={`min-w-32 flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold capitalize transition sm:flex-none ${area === item ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"}`}>{item}</button>)}
      </div>
      {loading ? <div className="skeleton h-96" /> : <>
        <div className="columns-1 gap-5 2xl:columns-2">
        {CUSTOMIZATION_SECTIONS.filter(([key]) => keys.includes(key)).map(([key, title, description]) => (
          <section className="card mb-5 inline-block w-full break-inside-avoid overflow-hidden align-top" key={key}>
            <div className="flex items-center gap-4 border-b border-neutral-100 bg-neutral-50/70 p-4 sm:px-5">
              <div className="min-w-0 flex-1"><h2 className="font-semibold text-neutral-900">{title}</h2><p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p></div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-600">
                <span>Enabled</span>
                <input className="peer sr-only" type="checkbox" checked={customization[key].length > 0 && customization[key].every((item) => item.enabled)} onChange={(event) => toggleSection(key, event.target.checked)} />
                <span className="relative h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-emerald-700 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
              </label>
            </div>
            <div className="space-y-2 p-3 sm:p-4">
              {customization[key].length ? customization[key].map((item) => (
                <div
                  className={`group rounded-xl border bg-white p-2 transition ${dragging?.id === item.id ? "border-emerald-400 opacity-50" : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm"}`}
                  key={item.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => move(key, item.id)}
                >
                  <div className="grid grid-cols-[32px_minmax(0,1fr)_34px_34px] items-center gap-1.5">
                    <button type="button" draggable onDragStart={() => setDragging({ key, id: item.id })} onDragEnd={() => setDragging(null)} className="grid size-8 cursor-grab place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing" aria-label={`Move ${item.label}`}><GripVertical size={17} /></button>
                    <input className="min-h-9 min-w-0 rounded-lg border-0 bg-transparent px-2 text-sm font-medium outline-none transition focus:bg-neutral-50 focus:ring-2 focus:ring-emerald-100" value={item.label} aria-label={`${title} option name`} onChange={(event) => change(key, item.id, { label: event.target.value })} />
                    <button type="button" className="grid size-8 place-items-center rounded-lg text-emerald-700 transition hover:bg-emerald-50" onClick={() => add(key, item.id)} aria-label={`Add option after ${item.label}`} title="Add below"><Plus size={16} /></button>
                    <button type="button" className="grid size-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => remove(key, item.id)} aria-label={`Delete ${item.label}`} title="Delete"><Minus size={16} /></button>
                  </div>
                  {key === "starterTemplates" && <textarea className="mt-2 min-h-24 w-full rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 text-xs leading-5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" value={(item.tasks || []).join("\n")} placeholder="Template tasks — one per line" onChange={(event) => change(key, item.id, { tasks: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} />}
                  </div>
              )) : <button type="button" className="flex min-h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-sm font-semibold text-neutral-500 transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700" onClick={() => add(key)}><Plus size={16} />Add first option</button>}
            </div>
          </section>
        ))}
        </div>
        <div className="sticky bottom-4 z-10 flex justify-end"><button className="btn btn-primary shadow-lg" disabled={saving} onClick={save}><Save size={16} />{saving ? "Saving…" : "Save customization"}</button></div>
      </>}
    </>
  );
}
