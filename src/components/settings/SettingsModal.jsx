"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";

export default function SettingsModal({
  open,
  onClose,
  title,
  description,
  children,
  labelledBy = "settings-modal-title",
}) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-neutral-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
      role="presentation"
    >
      <section
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(15,23,42,.28)] sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-white/70"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold" id={labelledBy}>{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>}
          </div>
          <button className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700" onClick={close} type="button" aria-label={`Close ${title}`}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
