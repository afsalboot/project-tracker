"use client";

import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";

export default function TaskActionsMenu({ task, canEdit, canDelete, onEdit, onToggleStatus, onDelete }) {
  if (!canEdit && !canDelete) return null;

  function run(event, action) {
    event.preventDefault();
    event.stopPropagation();
    action?.();
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <details className="relative">
      <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50" aria-label={`Actions for ${task.title}`} onClick={(event) => event.stopPropagation()}>
        <MoreHorizontal size={17} />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
        {canEdit && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={(event) => run(event, onEdit)}><Pencil size={15} />Edit</button>}
        {canEdit && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" onClick={(event) => run(event, onToggleStatus)}>{task.status === "Completed" ? <RotateCcw size={15} /> : <Check size={15} />}{task.status === "Completed" ? "Reopen" : "Complete"}</button>}
        {canDelete && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={(event) => run(event, onDelete)}><Trash2 size={15} />Delete</button>}
      </div>
    </details>
  );
}
