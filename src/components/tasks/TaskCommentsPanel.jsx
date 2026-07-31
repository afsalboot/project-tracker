"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TaskCommentsPanel({ taskId, permissions, heading = "Comments", readOnly = false }) {
  const [comments, setComments] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const canManage = permissions.includes("tasks.edit");
  const canDelete = permissions.includes("tasks.delete");

  const load = useCallback(async () => {
    const response = await fetch(`/api/tasks/${taskId}/comments`);
    const result = await response.json();
    if (response.ok) {
      setComments(result.data.comments);
      setCurrentUserId(String(result.data.currentUserId));
    }
  }, [taskId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(event) {
    event.preventDefault();
    const body = editing ? editing.body : draft;
    if (!body.trim()) return;
    setSaving(true);
    const url = editing ? `/api/tasks/${taskId}/comments/${editing._id}` : `/api/tasks/${taskId}/comments`;
    const response = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setDraft("");
    setEditing(null);
    load();
  }

  async function remove() {
    const response = await fetch(`/api/tasks/${taskId}/comments/${deleteTarget._id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setDeleteTarget(null);
    load();
  }

  return (
    <>
      <div className="flex items-center gap-2"><MessageSquare size={17} className="text-emerald-700" /><h4 className="font-semibold">{heading}</h4><span className="text-xs text-neutral-400">{comments.length}</span></div>
      <div className="mt-4 space-y-3">
        {comments.map((comment) => {
          const mine = String(comment.userId?._id || comment.userId) === currentUserId;
          return (
            <article className="rounded-xl border border-neutral-200 bg-white p-3" key={comment._id}>
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">{(comment.userId?.name || "U").slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2"><p className="text-xs font-semibold">{comment.userId?.name || "Former user"}</p><time className="text-[11px] text-neutral-400">{new Date(comment.createdAt).toLocaleString()}</time>{comment.editedAt && <span className="text-[10px] text-neutral-400">edited</span>}</div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-neutral-700">{comment.body}</p>
                </div>
                {!readOnly && (mine || canManage || canDelete) && <div className="flex shrink-0 gap-1">{(mine || canManage) && <button className="grid size-8 place-items-center rounded-lg hover:bg-neutral-100" onClick={() => setEditing({ _id: comment._id, body: comment.body })} aria-label="Edit comment"><Pencil size={13} /></button>}{(mine || canDelete) && <button className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(comment)} aria-label="Delete comment"><Trash2 size={13} /></button>}</div>}
              </div>
            </article>
          );
        })}
        {!comments.length && <p className="text-sm text-neutral-500">No comments yet.</p>}
      </div>
      {!readOnly ? <form className="mt-4" onSubmit={save}>
        <label><span className="label">{editing ? "Edit comment" : "Add comment"}</span><textarea className="field min-h-24" maxLength={5000} value={editing ? editing.body : draft} onChange={(event) => editing ? setEditing({ ...editing, body: event.target.value }) : setDraft(event.target.value)} placeholder="Share an update, question, or blocker…" /></label>
        <div className="mt-2 flex justify-end gap-2">{editing && <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>}<button className="btn btn-primary" disabled={saving || !(editing ? editing.body : draft).trim()}>{saving ? "Saving…" : editing ? "Save comment" : "Comment"}</button></div>
      </form> : <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Read-only task. Only the task creator can add or change comments.</p>}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this comment?" description="This comment will be permanently removed from the task discussion." confirmLabel="Delete comment" onClose={() => setDeleteTarget(null)} onConfirm={remove} />
    </>
  );
}
