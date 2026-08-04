"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function FloatingDateTime() {
  const [now, setNow] = useState(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const monthStart = startOfMonth(visibleMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });

  function goToday() {
    const today = new Date();
    setVisibleMonth(today);
    setSelectedDate(today);
  }

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-30 flex items-start gap-2 md:right-6 md:top-6">
      <NotificationBell onOpen={() => setOpen(false)} />
      {open && (
        <section className="absolute right-0 top-[calc(100%+10px)] w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_55px_rgba(20,32,26,.18)]" aria-label="Calendar">
          <div className="flex items-start justify-between bg-[var(--accent)] p-4 text-white">
            <div>
              <p className="text-xs font-semibold text-emerald-100">{now ? format(now, "EEEE") : "Today"}</p>
              <p className="mt-1 text-xl font-semibold">{now ? format(now, "MMMM d, yyyy") : "Calendar"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-100"><Clock size={14} />{now ? format(now, "h:mm:ss a") : "--:--"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white" aria-label="Close calendar"><X size={18} /></button>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <button type="button" className="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => setVisibleMonth((month) => subMonths(month, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <p className="text-sm font-semibold">{format(visibleMonth, "MMMM yyyy")}</p>
              <button type="button" className="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center">
              {weekdays.map((day) => <span key={day} className="py-2 text-[10px] font-bold uppercase text-neutral-400">{day.slice(0, 1)}</span>)}
              {days.map((day) => {
                const today = now && isSameDay(day, now);
                const selected = isSameDay(day, selectedDate);
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`mx-auto grid size-9 place-items-center rounded-full text-xs font-medium transition ${selected ? "bg-[var(--accent)] text-white" : today ? "bg-emerald-50 text-emerald-800" : isSameMonth(day, visibleMonth) ? "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800" : "text-neutral-300 hover:bg-neutral-50"}`}
                    aria-label={format(day, "MMMM d, yyyy")}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
              <p className="text-xs text-neutral-500">Selected: <span className="font-semibold text-neutral-700">{format(selectedDate, "MMM d, yyyy")}</span></p>
              <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={goToday}>Today</button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-12 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 text-left shadow-[0_8px_28px_rgba(20,32,26,.14)] transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={17} /></span>
        <span className="hidden min-[390px]:block">
          <span className="block whitespace-nowrap text-xs font-semibold text-neutral-800">{now ? format(now, "EEE, MMM d") : "Date & time"}</span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">{now ? format(now, "h:mm a") : "Loading..."}</span>
        </span>
      </button>
    </div>
  );
}
