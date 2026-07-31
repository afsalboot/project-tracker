import { ListChecks } from "lucide-react";

export default function SubtaskSummary({ task, className = "" }) {
  const total = task.totalSubtasks || 0;
  const completed = task.completedSubtasks || 0;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-500 ${className}`}>
      <ListChecks size={14} className={total && completed === total ? "text-emerald-600" : "text-neutral-400"} />
      {completed} of {total} subtasks completed
    </span>
  );
}
