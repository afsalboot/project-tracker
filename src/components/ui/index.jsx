import { format, isPast, isToday } from "date-fns";
import { ChevronDown, ChevronUp, Inbox, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeStyles = {
  Urgent: "border-red-200 bg-red-50 text-red-700",
  High: "border-amber-200 bg-amber-50 text-amber-800",
  Medium: "border-sky-200 bg-sky-50 text-sky-700",
  Low: "border-neutral-200 bg-neutral-50 text-neutral-600",
  Blocked: "border-red-200 bg-red-50 text-red-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Testing: "border-violet-200 bg-violet-50 text-violet-700",
  "In Progress": "border-blue-200 bg-blue-50 text-blue-700",
  "To Do": "border-neutral-200 bg-neutral-50 text-neutral-600",
};

export function Badge({ children, className }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", badgeStyles[children] || "border-neutral-200 bg-neutral-50 text-neutral-600", className)}>{children}</span>;
}

export function Progress({ value = 0 }) {
  return <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div><span className="w-9 text-right text-xs font-semibold text-neutral-600">{value}%</span></div>;
}

export function DateText({ value }) {
  if (!value) return <span className="text-neutral-400">No due date</span>;
  const date = new Date(value);
  return <span className={cn(isPast(date) && !isToday(date) && "font-medium text-red-600")}>{isToday(date) ? "Today" : format(date, "MMM d, yyyy")}</span>;
}

export function EmptyState({ title, description, action }) {
  return <div className="card flex min-h-56 flex-col items-center justify-center p-8 text-center"><span className="grid size-11 place-items-center rounded-full bg-neutral-100 text-neutral-500"><Inbox size={20} /></span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function PageIntro({ eyebrow, title, description, actions }) {
  return <div className="mb-5 flex min-w-0 flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-end"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-700 sm:text-xs">{eyebrow}</p><h2 className="mt-1 break-words text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>{description && <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-neutral-500">{description}</p>}</div>{actions && <div className="grid w-full grid-cols-1 gap-2 min-[420px]:flex min-[420px]:w-auto min-[420px]:flex-wrap [&_.btn]:w-full min-[420px]:[&_.btn]:w-auto">{actions}</div>}</div>;
}

export function FilterPanel({ children, activeCount = 0, onClear, title = "Filters", collapsed = false, onToggle }) {
  return (
    <>
      <details className="card group mb-4 md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold">
          <SlidersHorizontal size={17} />
          {title}
          {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-emerald-700 text-[11px] text-white">{activeCount}</span>}
          <ChevronDown className="ml-auto transition-transform group-open:rotate-180" size={17} />
        </summary>
        <div className="border-t border-neutral-100 p-4">
          {children}
          {activeCount > 0 && onClear && <button className="mt-3 text-xs font-semibold text-red-600" onClick={onClear} type="button">Clear all filters</button>}
        </div>
      </details>
      <div className="card mb-5 hidden overflow-visible md:block">
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><SlidersHorizontal size={16} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-neutral-500">{activeCount ? `${activeCount} active selection${activeCount === 1 ? "" : "s"}` : "Narrow the results with one or more values."}</p></div>
          {activeCount > 0 && onClear && <button className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50" onClick={onClear} type="button">Clear all</button>}
          {onToggle && <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900" onClick={onToggle} type="button">{collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}{collapsed ? "Show filters" : "Hide filters"}</button>}
        </div>
        {!collapsed && <div className="p-4">{children}</div>}
      </div>
    </>
  );
}
