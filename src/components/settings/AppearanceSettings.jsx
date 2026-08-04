"use client";

import { useRef, useState } from "react";
import { Check, LayoutPanelLeft, Moon, Save, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import { DEFAULT_COLOR_MODE, DEFAULT_SIDEBAR_THEME, sidebarTheme, themesForMode } from "@/constants/appearance";

export default function AppearanceSettings({ initialTheme, initialMode }) {
  const router = useRouter();
  const savedMode = initialMode === "dark" ? "dark" : DEFAULT_COLOR_MODE;
  const savedTheme = sidebarTheme(initialTheme || DEFAULT_SIDEBAR_THEME, savedMode).id;
  const [colorMode, setColorMode] = useState(savedMode);
  const [selected, setSelected] = useState(savedTheme);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);
  const availableThemes = themesForMode(colorMode);
  const preview = sidebarTheme(selected, colorMode);
  const darkPreview = colorMode === "dark";
  const previewColors = darkPreview
    ? { page: "#0c1117", card: "#151b23", line: "#303c49", bar: "#465464" }
    : { page: "#f6f7f9", card: "#ffffff", line: "#e5e7eb", bar: "#d1d5db" };

  function showPreview() {
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      previewRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  function selectTheme(themeId) {
    setSelected(themeId);
    showPreview();
  }

  function selectMode(mode) {
    if (mode === colorMode) return;
    setColorMode(mode);
    setSelected(themesForMode(mode)[0].id);
    showPreview();
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/workspace/appearance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarTheme: selected, colorMode }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    const selectedTheme = sidebarTheme(selected, colorMode);
    const root = document.documentElement;
    root.dataset.workspaceTheme = "true";
    root.dataset.colorMode = colorMode;
    root.style.setProperty("--sidebar", selectedTheme.background);
    root.style.setProperty("--accent", selectedTheme.accent);
    root.style.setProperty("--accent-hover", selectedTheme.accentHover);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <PageIntro eyebrow="Settings / Appearance" title="Workspace appearance" description="Choose the shared color theme for navigation, actions, filters, and module accents." />
      <section className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 p-3 min-[380px]:p-4 sm:p-6 lg:order-1">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5" aria-label="Appearance mode">
              {[["light", "Light", Sun], ["dark", "Dark", Moon]].map(([mode, label, Icon]) => <button key={mode} type="button" aria-pressed={colorMode === mode} onClick={() => selectMode(mode)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${colorMode === mode ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-700)]"}`}><Icon size={16} />{label}</button>)}
            </div>
            <h3 className="font-semibold">Theme</h3>
            <p className="mt-1 text-sm text-neutral-500">Showing {colorMode} themes only. The saved mode applies across navigation, cards, forms, popups, and workspace surfaces.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 2xl:grid-cols-3">
              {availableThemes.map((theme) => {
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
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-neutral-400">Live preview</p><p className="mt-1 text-sm font-semibold text-neutral-800">{preview.name} · {darkPreview ? "Dark" : "Light"}</p></div><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: preview.accent }}>Selected</span></div>
            <div className="mt-4 flex h-64 overflow-hidden rounded-2xl border shadow-sm" style={{ background: previewColors.card, borderColor: previewColors.line }}>
              <div className="flex w-[43%] shrink-0 flex-col p-2.5 text-white" style={{ background: preview.background }}>
                <div className="flex items-center gap-2 border-b border-white/10 px-1 pb-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10"><LayoutPanelLeft size={16} /></span><span className="truncate text-[11px] font-semibold">Workspace</span></div>
                <div className="mt-3 rounded-lg px-2 py-2.5 text-[11px] font-semibold text-white" style={{ background: preview.accent }}>Dashboard</div>
                <div className="mt-1 px-2 py-2 text-[11px] text-white/65">My Tasks</div>
                <div className="mt-1 px-2 py-2 text-[11px] text-white/65">Projects</div>
                <div className="mt-auto border-t border-white/10 px-2 pt-2 text-[10px] text-white/55">Navigation</div>
              </div>
              <div className="min-w-0 flex-1 p-3" style={{ background: previewColors.page }}>
                <div className="flex items-center justify-between"><div><div className="h-2 w-14 rounded-full" style={{ background: previewColors.bar }} /><div className="mt-1.5 h-1.5 w-10 rounded-full" style={{ background: previewColors.line }} /></div><span className="size-7 rounded-lg" style={{ background: preview.accent }} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><span className="h-12 rounded-lg border" style={{ background: previewColors.card, borderColor: previewColors.line }} /><span className="h-12 rounded-lg border" style={{ background: previewColors.card, borderColor: previewColors.line }} /></div>
                <div className="mt-2 h-20 rounded-lg border p-2" style={{ background: previewColors.card, borderColor: previewColors.line }}><div className="h-2 w-2/3 rounded-full" style={{ background: `${preview.accent}55` }} /><div className="mt-2 h-1.5 w-full rounded-full" style={{ background: previewColors.line }} /><div className="mt-1.5 h-1.5 w-4/5 rounded-full" style={{ background: previewColors.line }} /></div>
                <div className="mt-3 ml-auto h-7 w-16 rounded-lg" style={{ background: preview.accent }} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Previewing navigation, buttons, links, filters, and workspace accents before you save.</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-neutral-200 p-4 sm:px-6">
          <button className="btn btn-primary w-full sm:w-auto" type="button" disabled={saving || (selected === savedTheme && colorMode === savedMode)} onClick={save}>
            <Save size={16} />{saving ? "Saving..." : "Save appearance"}
          </button>
        </div>
      </section>
    </>
  );
}
