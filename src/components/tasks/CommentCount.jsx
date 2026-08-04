import { MessageSquare } from "lucide-react";

export default function CommentCount({ count = 0, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500 ${className}`} aria-label={`${count} comment${count === 1 ? "" : "s"}`}>
      <MessageSquare size={14} className={count ? "text-emerald-600" : "text-neutral-400"} />
      {count} {count === 1 ? "comment" : "comments"}
    </span>
  );
}
