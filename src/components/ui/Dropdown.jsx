"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

function normalizeOption(option) {
  if (Array.isArray(option)) return { value: String(option[0]), label: String(option[1]) };
  if (typeof option === "object") return { ...option, value: String(option.value) };
  return { value: String(option), label: String(option) };
}

export default function Dropdown({
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option",
  ariaLabel,
  className = "",
  disabled = false,
  onBlur,
  multiple = false,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const normalized = useMemo(() => options.map(normalizeOption), [options]);
  const selectedValues = multiple
    ? new Set((Array.isArray(value) ? value : []).map(String))
    : new Set([String(value)]);
  const selected = normalized.find((option) => selectedValues.has(option.value));
  const selectedOptions = normalized.filter((option) => selectedValues.has(option.value));
  const displayValue = multiple
    ? selectedOptions.length > 2
      ? `${selectedOptions.length} selected`
      : selectedOptions.map((option) => option.label).join(", ")
    : selected?.label;

  useEffect(() => {
    if (!open) return;
    function positionMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const openAbove = availableBelow < 220 && rect.top > availableBelow;
      const maxHeight = Math.max(140, Math.min(280, openAbove ? rect.top - 12 : availableBelow));
      setPosition({
        left: rect.left,
        top: openAbove ? undefined : rect.bottom + 6,
        bottom: openAbove ? window.innerHeight - rect.top + 6 : undefined,
        width: rect.width,
        maxHeight,
      });
    }
    function outside(event) {
      if (rootRef.current?.contains(event.target) || event.target.closest?.(`[data-dropdown-menu="${id}"]`)) return;
      setOpen(false);
      onBlur?.();
    }
    positionMenu();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [id, onBlur, open]);

  function choose(nextValue) {
    if (multiple) {
      const next = new Set(selectedValues);
      if (next.has(nextValue)) next.delete(nextValue);
      else next.add(nextValue);
      onChange?.([...next]);
      return;
    }
    onChange?.(nextValue);
    setOpen(false);
    onBlur?.();
    buttonRef.current?.focus();
  }

  function keyDown(event) {
    if (disabled) return;
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className={`relative min-w-0 ${className}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`field flex w-full items-center gap-2 text-left transition ${open ? "!border-emerald-600 !ring-[3px] !ring-emerald-100" : ""}`}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={keyDown}
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOptions.length ? "text-neutral-900" : "text-neutral-500"}`}>
          {displayValue || placeholder}
        </span>
        <ChevronDown className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180 text-emerald-700" : ""}`} size={16} />
      </button>
      {open && position && createPortal(
        <div
          data-dropdown-menu={id}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className="fixed z-[120] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.18)]"
          style={position}
        >
          {multiple && selectedOptions.length > 0 && (
            <button
              className="mb-1 flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-red-600"
              onClick={() => onChange?.([])}
              type="button"
            >
              Clear selections <X size={14} />
            </button>
          )}
          {normalized.map((option) => {
            const active = selectedValues.has(option.value);
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-emerald-50 font-semibold text-emerald-800" : "text-neutral-700 hover:bg-emerald-50/70 hover:text-emerald-800"}`}
                key={option.value}
                onClick={() => choose(option.value)}
              >
                {option.icon}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active && <Check className="shrink-0" size={15} />}
              </button>
            );
          })}
          {!normalized.length && <p className="px-3 py-3 text-sm text-neutral-500">No options available</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}
