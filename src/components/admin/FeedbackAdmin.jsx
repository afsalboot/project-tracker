"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageIntro } from "@/components/ui";
import Dropdown from "@/components/ui/Dropdown";
import SearchField from "@/components/ui/SearchField";

const statusOptions = [
  ["", "All feedback"],
  ["pending", "Pending review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

export default function FeedbackAdmin() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/feedback${status ? `?status=${status}` : ""}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    setData(result.data);
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!data || !term) return data?.items || [];
    return data.items.filter((item) =>
      `${item.name} ${item.email} ${item.context} ${item.message}`.toLowerCase().includes(term),
    );
  }, [data, search]);

  async function moderate(id, nextStatus) {
    setBusyId(id);
    const response = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    setBusyId(null);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    load();
  }

  return (
    <>
      <PageIntro
        eyebrow="Platform administration"
        title="Feedback moderation"
        description="Review landing-page feedback before it can appear publicly as a testimonial."
      />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Metric label="Pending" value={data?.totals?.pending || 0} icon={Clock3} tone="bg-amber-50 text-amber-700" />
        <Metric label="Approved" value={data?.totals?.approved || 0} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
        <Metric label="Rejected" value={data?.totals?.rejected || 0} icon={XCircle} tone="bg-red-50 text-red-700" />
      </div>
      <section className="card mb-5 overflow-visible">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <SearchField className="flex-1" ariaLabel="Search feedback" placeholder="Search name, email, or message..." value={search} onChange={setSearch} />
          <Dropdown className="sm:w-52" ariaLabel="Feedback status" value={status} onChange={setStatus} options={statusOptions} />
        </div>
      </section>
      {!data ? <div className="skeleton h-96" /> : items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <article className="card flex flex-col p-5" key={item._id}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><MessageSquareText size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.name}</h2><StatusBadge status={item.status} /></div>
                  <p className="mt-1 truncate text-xs text-neutral-500">{item.email}{item.context ? ` · ${item.context}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Star size={14} fill="currentColor" />{item.rating}</div>
              </div>
              <blockquote className="mt-4 flex-1 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">“{item.message}”</blockquote>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                <span className="mr-auto text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString()}</span>
                {item.status !== "pending" && <button className="btn btn-secondary" disabled={busyId === item._id} onClick={() => moderate(item._id, "pending")}><RotateCcw size={15} />Pending</button>}
                {item.status !== "rejected" && <button className="btn border border-red-100 bg-red-50 text-red-700 hover:bg-red-100" disabled={busyId === item._id} onClick={() => moderate(item._id, "rejected")}><XCircle size={15} />Reject</button>}
                {item.status !== "approved" && <button className="btn btn-primary" disabled={busyId === item._id} onClick={() => moderate(item._id, "approved")}><ShieldCheck size={15} />Approve</button>}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="No feedback found" description="New landing-page submissions will appear here for review." />}
    </>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return <div className="card p-3 sm:p-4"><span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon size={16} /></span><p className="mt-3 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>;
}

function StatusBadge({ status }) {
  const tone = status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{status}</span>;
}
