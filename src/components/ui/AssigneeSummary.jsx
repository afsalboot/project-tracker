import { Users } from "lucide-react";

export default function AssigneeSummary({ users = [], empty = "Unassigned", className = "" }) {
  const people = users.filter((user) => user && typeof user === "object" && user.name);
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs text-neutral-500 ${className}`}>
      <Users size={14} className="shrink-0 text-neutral-400" />
      <span className="truncate">{people.length ? people.map((user) => user.name).join(", ") : empty}</span>
    </span>
  );
}
