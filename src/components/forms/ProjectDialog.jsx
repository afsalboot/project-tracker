"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import ProjectForm from "@/components/forms/ProjectForm";

export default function ProjectDialog({ open, onClose, onSaved, projectId }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
    return () => cancelAnimationFrame(frame);
  }, [open, projectId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-0 sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl sm:h-[min(92vh,920px)] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <header className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-5 md:px-6">
          <div>
            <h2 id="create-project-title" className="font-semibold">{projectId ? "Edit project" : "Create project"}</h2>
            <p className="text-xs text-neutral-500">{projectId ? "Update project scope and workflow" : "General project or Zoho customization"}</p>
          </div>
          <button className="ml-auto grid size-10 place-items-center rounded-xl border border-neutral-200" onClick={onClose} aria-label={projectId ? "Close edit project" : "Close create project"}><X size={18} /></button>
        </header>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <ProjectForm projectId={projectId} compact onCancel={onClose} onSuccess={onSaved} />
        </div>
      </section>
    </div>
  );
}
