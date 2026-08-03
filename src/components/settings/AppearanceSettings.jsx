"use client";

import { useState } from "react";
import { Check, LayoutPanelLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import { DEFAULT_SIDEBAR_THEME, SIDEBAR_THEMES, sidebarTheme } from "@/constants/appearance";

export default function AppearanceSettings({ initialTheme }) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialTheme || DEFAULT_SIDEBAR_THEME);
  const [saving, setSaving] = useState(false);
  const preview = sidebarTheme(selected);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/workspace/appearance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarTheme: selected }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <PageIntro eyebrow="Settings / Appearance" title="Workspace appearance" description="Choose the shared color theme for navigation, actions, filters, and module accents." />
      <section className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-4 sm:p-6">
            <h3 className="font-semibold">Theme</h3>
            <p className="mt-1 text-sm text-neutral-500">The theme is applied across desktop and mobile navigation, buttons, links, icons, filters, and selection states.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SIDEBAR_THEMES.map((theme) => {
                const active = selected === theme.id;
                return (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() => setSelected(theme.id)}
                    aria-pressed={active}
                    className={`relative min-h-32 rounded-xl border p-4 text-left transition ${active ? "border-emerald-600 ring-2 ring-emerald-600/10" : "border-neutral-200 hover:border-neutral-300"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-8 rounded-lg border border-black/5" style={{ background: theme.background }} />
                      <span className="font-semibold">{theme.name}</span>
                    </span>
                    <span className="mt-3 block text-xs leading-5 text-neutral-500">{theme.description}</span>
                    {active && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-emerald-600 text-white"><Check size={14} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50 p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-neutral-400">Preview</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 shadow-sm" style={{ background: preview.background }}>
              <div className="flex h-64 w-full flex-col p-3 text-white">
                <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><LayoutPanelLeft size={18} /></span><span className="text-sm font-semibold">My Workspace</span></div>
                <div className="mt-3 rounded-xl bg-white/12 px-3 py-3 text-sm font-medium">Dashboard</div>
                <div className="mt-1 px-3 py-3 text-sm text-white/65">My Tasks</div>
                <div className="mt-1 px-3 py-3 text-sm text-white/65">Projects</div>
                <div className="mt-auto border-t border-white/10 px-3 pt-3 text-xs text-white/55">{preview.name} theme</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-neutral-200 p-4 sm:px-6">
          <button className="btn btn-primary w-full sm:w-auto" type="button" disabled={saving || selected === initialTheme} onClick={save}>
            <Save size={16} />{saving ? "Saving..." : "Save appearance"}
          </button>
        </div>
      </section>
    </>
  );
}
