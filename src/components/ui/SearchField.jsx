"use client";

import { Search, X } from "lucide-react";

export default function SearchField({ value, onChange, placeholder, ariaLabel = "Search", className = "", inputClassName = "", ...inputProps }) {
  return (
    <div className={`relative block min-w-0 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
      <input
        {...inputProps}
        className={`field search-field pr-11 ${inputClassName}`}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          aria-label={`Clear ${ariaLabel.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
