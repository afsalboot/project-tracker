"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminActionsMenu({ label, items }) {
  const id = useId();
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 190;
      const estimatedHeight = Math.max(48, items.length * 42 + 12);
      const openAbove =
        window.innerHeight - rect.bottom < estimatedHeight + 12 &&
        rect.top > estimatedHeight;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)),
        top: openAbove ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
        width,
      });
    }
    function outside(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-admin-actions="${id}"]`)
      ) return;
      setOpen(false);
    }
    reposition();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [id, items.length, open]);

  function run(item) {
    setOpen(false);
    item.onClick?.();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950",
          open && "border-emerald-300 bg-emerald-50 text-emerald-800",
        )}
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && position && createPortal(
        <div
          data-admin-actions={id}
          role="menu"
          className="fixed z-[150] rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.2)]"
          style={position}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                role="menuitem"
                key={item.label}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-50",
                  item.destructive && "text-red-600 hover:bg-red-50",
                )}
                onClick={() => run(item)}
              >
                {Icon && <Icon size={15} />}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
