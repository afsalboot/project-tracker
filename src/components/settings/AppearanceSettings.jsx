"use client";

import { useRef, useState } from "react";
import { Check, LayoutPanelLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import { DEFAULT_SIDEBAR_THEME, SIDEBAR_THEMES, sidebarTheme } from "@/constants/appearance";

export default function AppearanceSettings({ initialTheme }) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialTheme || DEFAULT_SIDEBAR_THEME);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);
  const preview = sidebarTheme(selected);

  function selectTheme(themeId) {
    setSelected(themeId);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      previewRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

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
    const savedTheme = sidebarTheme(selected);
    const root = document.documentElement;
    root.dataset.workspaceTheme = "true";
    root.style.setProperty("--sidebar", savedTheme.background);
    root.style.setProperty("--accent", savedTheme.accent);
    root.style.setProperty("--accent-hover", savedTheme.accentHover);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <PageIntro eyebrow="Settings / Appearance" title="Workspace appearance" description="Choose the shared color theme for navigation, actions, filters, and module accents." />
      <section className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 p-3 min-[380px]:p-4 sm:p-6 lg:order-1">
            <h3 className="font-semibold">Theme</h3>
            <p className="mt-1 text-sm text-neutral-500">The theme is applied across desktop and mobile navigation, buttons, links, icons, filters, and selection states.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 2xl:grid-cols-3">
              {SIDEBAR_THEMES.map((theme) => {
                const active = selected === theme.id;
                return (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    aria-pressed={active}
                    className={`relative min-h-24 rounded-xl border p-3 text-left transition sm:min-h-32 sm:p-4 ${active ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/10" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"}`}
                  >
                    <span className="flex items-center gap-2 pr-5">
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-black/5" style={{ background: theme.background }}><span className="absolute bottom-0 right-0 size-4 rounded-tl-md" style={{ background: theme.accent }} /></span>
                      <span className="truncate text-sm font-semibold sm:text-base">{theme.name}</span>
                    </span>
                    <span className="mt-3 hidden text-xs leading-5 text-neutral-500 sm:block">{theme.description}</span>
                    {active && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-emerald-600 text-white sm:right-3 sm:top-3"><Check size={14} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={previewRef} className="order-1 scroll-mt-20 border-b border-neutral-200 bg-neutral-50 p-4 min-[380px]:p-5 lg:order-2 lg:border-b-0 lg:border-l">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-neutral-400">Live preview</p><p className="mt-1 text-sm font-semibold text-neutral-800">{preview.name}</p></div><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: preview.accent }}>Selected</span></div>
            <div className="mt-4 flex h-64 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="flex w-[43%] shrink-0 flex-col p-2.5 text-white" style={{ background: preview.background }}>
                <div className="flex items-center gap-2 border-b border-white/10 px-1 pb-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10"><LayoutPanelLeft size={16} /></span><span className="truncate text-[11px] font-semibold">Workspace</span></div>
                <div className="mt-3 rounded-lg px-2 py-2.5 text-[11px] font-semibold text-white" style={{ background: preview.accent }}>Dashboard</div>
                <div className="mt-1 px-2 py-2 text-[11px] text-white/65">My Tasks</div>
                <div className="mt-1 px-2 py-2 text-[11px] text-white/65">Projects</div>
                <div className="mt-auto border-t border-white/10 px-2 pt-2 text-[10px] text-white/55">Navigation</div>
              </div>
              <div className="min-w-0 flex-1 bg-[#f6f7f9] p-3">
                <div className="flex items-center justify-between"><div><div className="h-2 w-14 rounded-full bg-neutral-300" /><div className="mt-1.5 h-1.5 w-10 rounded-full bg-neutral-200" /></div><span className="size-7 rounded-lg" style={{ background: preview.accent }} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><span className="h-12 rounded-lg border border-neutral-200 bg-white" /><span className="h-12 rounded-lg border border-neutral-200 bg-white" /></div>
                <div className="mt-2 h-20 rounded-lg border border-neutral-200 bg-white p-2"><div className="h-2 w-2/3 rounded-full" style={{ background: `${preview.accent}30` }} /><div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100" /><div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-neutral-100" /></div>
                <div className="mt-3 ml-auto h-7 w-16 rounded-lg" style={{ background: preview.accent }} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Previewing navigation, buttons, links, filters, and workspace accents before you save.</p>
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
