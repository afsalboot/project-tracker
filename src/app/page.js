import Link from "next/link";
import { ArrowRight, Check, Layers3, MessageSquareText, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import LandingFeedback from "@/components/landing/LandingFeedback";

export default async function Home() {
  const user = await getCurrentUser();
  const destinations = [
    ["dashboard.view", "/dashboard"],
    ["projects.view", "/projects"],
    ["tasks.view", "/tasks"],
    ["completed.view", "/completed"],
    ["settings.view", "/settings"],
  ];
  const workspaceHref = user
    ? destinations.find(([permission]) => hasWorkspacePermission(user.workspace, user.role, permission))?.[1] || "/access-denied"
    : "/login";

  return (
    <main className="min-h-screen bg-[#f4f6f3] text-neutral-950">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-[#174c3b] text-white"><Layers3 size={19} /></span>
          Project Tracker
        </Link>
        <Link href={workspaceHref} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-neutral-950">
          {user ? "Open workspace" : "Sign in"}
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:px-12 lg:pb-28 lg:pt-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-emerald-800">Projects without the noise</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-6xl">Keep the work visible. Keep ownership clear.</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">One focused workspace for projects, tasks, subtasks, comments, and delivery context—built for personal work, teams, and organizations.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href={workspaceHref} className="inline-flex items-center gap-2 rounded-full bg-[#174c3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103b2e]">
              {user ? "Continue working" : "Enter your workspace"} <ArrowRight size={16} />
            </Link>
            <a href="#workflow" className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-white">See how it works</a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2.5rem] border border-emerald-900/10" />
          <div className="relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-[0_30px_80px_-45px_rgba(15,55,42,.45)] sm:p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">Current focus</p><h2 className="mt-1 text-xl font-semibold">A calmer delivery view</h2></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">3 in motion</span>
            </div>
            <div className="mt-4 space-y-3">
              <PreviewTask title="Shape the project" meta="Scope · owner" status="Ready" />
              <PreviewTask title="Turn intent into tasks" meta="Subtasks · comments" status="Active" active />
              <PreviewTask title="Review and deliver" meta="Progress · history" status="Next" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#eef6f1] p-4"><Users size={18} className="text-emerald-700" /><p className="mt-5 text-sm font-semibold">Project-level access</p><p className="mt-1 text-xs leading-5 text-neutral-500">Everyone sees the context. Creators keep control of their tasks.</p></div>
              <div className="rounded-2xl bg-neutral-100 p-4"><MessageSquareText size={18} className="text-neutral-700" /><p className="mt-5 text-sm font-semibold">Work stays together</p><p className="mt-1 text-xs leading-5 text-neutral-500">Comments and subtasks expand exactly where the task lives.</p></div>
            </div>
          </div>
        </div>
      </section>

      <LandingFeedback />

      <section id="workflow" className="border-t border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3 lg:px-12">
          <Step number="01" title="Create the project" text="Set the outcome, project type, delivery context, and the people who need visibility." />
          <Step number="02" title="Own the task" text="The creator edits and completes the task. Assigned project members stay informed without accidental changes." />
          <Step number="03" title="Expand when needed" text="Add subtasks, comments, or Zoho technical details only when the work calls for them." />
        </div>
      </section>
    </main>
  );
}

function PreviewTask({ title, meta, status, active }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? "border-emerald-200 bg-emerald-50/60" : "border-neutral-200"}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${active ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-500"}`}><Check size={16} /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-neutral-500">{meta}</p></div>
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-neutral-600">{status}</span>
    </div>
  );
}

function Step({ number, title, text }) {
  return <article><p className="font-mono text-xs text-emerald-700">{number}</p><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">{text}</p></article>;
}
