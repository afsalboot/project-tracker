"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  description,
  verificationText,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [verificationValue, setVerificationValue] = useState("");
  const busyRef = useRef(false);
  const cancelRef = useRef(null);
  const verificationRef = useRef(null);
  const verified = !verificationText || verificationValue === verificationText;

  const close = useCallback(() => {
    if (busyRef.current) return;
    setVerificationValue("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => (verificationText ? verificationRef : cancelRef).current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open, verificationText]);

  if (!open) return null;

  async function confirm() {
    if (busyRef.current || !verified) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
      role="presentation"
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,.28)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-red-600">Confirm action</p>
              <h2 id="confirmation-title" className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              onClick={close}
              disabled={busy}
              aria-label="Close confirmation"
            >
              <X size={18} />
            </button>
          </div>
          <p id="confirmation-description" className="mt-5 text-sm leading-6 text-neutral-600">{description}</p>
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5 text-xs font-medium text-red-700">
            This action cannot be undone.
          </div>
          {verificationText && (
            <label className="mt-4 block text-sm font-medium text-neutral-700">
              Type <strong className="break-all text-neutral-950">{verificationText}</strong> to confirm
              <input
                ref={verificationRef}
                className="field mt-2"
                value={verificationValue}
                onChange={(event) => setVerificationValue(event.target.value)}
                autoComplete="off"
                spellCheck="false"
                aria-label={`Type ${verificationText} to confirm`}
              />
            </label>
          )}
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50/70 p-4 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="btn btn-secondary sm:min-w-24" onClick={close} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="btn border border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 disabled:cursor-not-allowed disabled:border-red-200 disabled:bg-red-200 sm:min-w-28" onClick={confirm} disabled={busy || !verified}>
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
