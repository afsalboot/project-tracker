"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AtSign, Bell, UserPlus } from "lucide-react";

export default function NotificationBell({ onOpen }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ items: [], unreadCount: 0, loading: true });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) {
        setState({ ...result.data, loading: false });
        return result.data;
      }
    } catch {
      setState((current) => ({ ...current, loading: false }));
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(load, 0);
    const interval = window.setInterval(load, 10000);
    const refresh = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", load);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    onOpen?.();
    const latest = await load();
    if (latest?.unreadCount || state.unreadCount) {
      setState((current) => ({ ...current, unreadCount: 0 }));
      fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative grid size-12 place-items-center rounded-2xl border border-neutral-200 bg-white text-emerald-700 shadow-[0_8px_28px_rgba(20,32,26,.14)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
        aria-label={state.unreadCount ? `${state.unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={19} />
        {state.unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{state.unreadCount > 99 ? "99+" : state.unreadCount}</span>}
      </button>

      {open && <section className="absolute right-0 top-[calc(100%+10px)] w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_55px_rgba(20,32,26,.18)]">
        <div className="flex items-center border-b border-neutral-100 px-4 py-3.5">
          <div><p className="font-semibold">Notifications</p><p className="mt-0.5 text-xs text-neutral-500">Assignments and mentions update automatically.</p></div>
          <Link href="/mentions" className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={() => setOpen(false)}>View all</Link>
        </div>
        <div className="max-h-[min(430px,65vh)] overflow-y-auto p-2">
          {state.loading ? <div className="space-y-2 p-2">{[1, 2, 3].map((item) => <div className="skeleton h-16" key={item} />)}</div> : state.items.length ? state.items.map((item) => <NotificationRow item={item} key={item._id} onClick={() => setOpen(false)} />) : <div className="px-5 py-10 text-center"><Bell className="mx-auto text-neutral-300" size={24} /><p className="mt-3 text-sm font-semibold">No notifications yet</p><p className="mt-1 text-xs text-neutral-500">New project assignments and mentions will appear here.</p></div>}
        </div>
      </section>}
    </div>
  );
}

export function NotificationRow({ item, onClick }) {
  const Icon = item.type === "mention" ? AtSign : UserPlus;
  return <Link href={item.href} onClick={onClick} className="flex gap-3 rounded-xl p-3 transition hover:bg-emerald-50/70">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={17} /></span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-neutral-800">{item.title}</span>
      <span className="mt-0.5 block truncate text-xs text-neutral-500">{item.type === "mention" ? item.taskName : item.message}</span>
      <span className="mt-1 block text-[11px] text-neutral-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
    </span>
  </Link>;
}
