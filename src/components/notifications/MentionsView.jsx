"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AtSign, Bell, UserPlus } from "lucide-react";
import { EmptyState, PageIntro } from "@/components/ui";

const tabs = [["all", "All"], ["mention", "Mentions"], ["assignment", "Assignments"]];

export default function MentionsView() {
  const [tab, setTab] = useState("all");
  const [state, setState] = useState({ items: [], loading: true });
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=100", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setState({ items: result.data.items, loading: false });
    } catch {
      setState((current) => ({ ...current, loading: false }));
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(load, 0);
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    const interval = window.setInterval(load, 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const items = useMemo(() => tab === "all" ? state.items : state.items.filter((item) => item.type === tab), [state.items, tab]);

  return <>
    <PageIntro eyebrow="For you" title="Mentions & notifications" description="Project assignments and comments that mention you, updated automatically." />
    <div className="mb-4 flex w-fit rounded-xl border border-neutral-200 bg-white p-1" role="tablist" aria-label="Notification type">
      {tabs.map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)} className={`min-h-9 rounded-lg px-4 text-sm font-semibold transition ${tab === value ? "bg-[var(--accent)] text-white shadow-sm" : "text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"}`}>{label}</button>)}
    </div>
    {state.loading ? <div className="space-y-3">{[1, 2, 3, 4].map((item) => <div className="skeleton h-28" key={item} />)}</div> : items.length ? <section className="card divide-y divide-neutral-100 overflow-hidden">{items.map((item) => <MentionRow item={item} key={item._id} />)}</section> : <EmptyState title={`No ${tab === "all" ? "notifications" : `${tab}s`} yet`} description={tab === "mention" ? "Comments that mention your username, name, or email will appear here." : tab === "assignment" ? "Projects assigned to you will appear here." : "New project assignments and mentions will appear here."} />}
  </>;
}

function MentionRow({ item }) {
  const Icon = item.type === "mention" ? AtSign : UserPlus;
  return <Link href={item.href} className="group flex gap-4 p-4 transition hover:bg-emerald-50/50 sm:p-5">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19} /></span>
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm text-neutral-900">{item.title}</strong><span className="text-xs text-neutral-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span></span>
      <span className="mt-1 block text-sm leading-6 text-neutral-600">{item.type === "mention" ? item.message : `Project: ${item.projectName}`}</span>
      {item.type === "mention" && <span className="mt-1 block text-xs font-medium text-emerald-700">{item.taskName} · {item.projectName}</span>}
    </span>
  </Link>;
}
