"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AtSign, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMentionAliases(members) {
  const firstNameCounts = new Map();
  for (const member of members) {
    const firstName = member.name.trim().split(/\s+/)[0].toLowerCase();
    firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
  }

  const aliases = new Set();
  for (const member of members) {
    const name = member.name.trim();
    const firstName = name.split(/\s+/)[0];
    [member.username, member.email, name, name.replace(/\s+/g, "."), name.replace(/\s+/g, "")]
      .filter(Boolean)
      .forEach((alias) => aliases.add(alias));
    if (firstNameCounts.get(firstName.toLowerCase()) === 1) aliases.add(firstName);
  }

  return [...aliases].sort((a, b) => b.length - a.length);
}

function CommentBody({ body, mentionAliases }) {
  if (!mentionAliases.length) return body;

  const mentionPattern = mentionAliases.map(escapeRegex).join("|");
  const mentionRegex = new RegExp(`(^|\\s)(@(?:${mentionPattern}))(?=$|[\\s,.:;!?])`, "gi");
  const parts = [];
  let cursor = 0;
  let match;

  while ((match = mentionRegex.exec(body)) !== null) {
    if (match.index > cursor) parts.push(body.slice(cursor, match.index));
    if (match[1]) parts.push(match[1]);
    parts.push(
      <span key={`${match.index}-${match[2]}`} className="mx-0.5 inline-flex min-h-6 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 align-middle text-xs font-semibold leading-5 text-emerald-700">
        {match[2]}
      </span>,
    );
    cursor = mentionRegex.lastIndex;
  }

  if (cursor < body.length) parts.push(body.slice(cursor));
  return parts;
}

export default function TaskCommentsPanel({ taskId, permissions, heading = "Comments", readOnly = false, workspaceType = "personal", onChanged }) {
  const [comments, setComments] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [mentionMembers, setMentionMembers] = useState([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef(null);
  const mentionListId = useId();
  const canManage = permissions.includes("tasks.edit");
  const canDelete = permissions.includes("tasks.delete");
  const mentionAliases = useMemo(() => getMentionAliases(mentionMembers), [mentionMembers]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/tasks/${taskId}/comments`);
    const result = await response.json();
    if (response.ok) {
      setComments(result.data.comments);
      setCurrentUserId(String(result.data.currentUserId));
      setMentionMembers(result.data.mentionMembers || []);
    }
  }, [taskId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filteredMentionMembers = useMemo(() => {
    if (!mentionSearch) return [];
    const query = mentionSearch.query.trim().toLowerCase();
    return mentionMembers
      .filter((member) => String(member._id) !== currentUserId)
      .filter((member) => !query || String(member.name).toLowerCase().includes(query) || String(member.username || "").toLowerCase().includes(query) || String(member.email).toLowerCase().includes(query))
      .slice(0, 8);
  }, [currentUserId, mentionMembers, mentionSearch]);

  function updateMentionSearch(value, cursor) {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(^|\s)@([^@\n]{0,60})$/);
    if (!match) {
      setMentionSearch(null);
      return;
    }
    const atIndex = beforeCursor.lastIndexOf("@");
    setMentionSearch({ start: atIndex, end: cursor, query: match[2] });
    setActiveMentionIndex(0);
  }

  function updateBody(value, cursor) {
    if (editing) setEditing({ ...editing, body: value });
    else setDraft(value);
    updateMentionSearch(value, cursor);
  }

  function insertMention(member) {
    if (!mentionSearch) return;
    const body = editing ? editing.body : draft;
    const nextBody = `${body.slice(0, mentionSearch.start)}${body.slice(mentionSearch.end)}`;
    if (editing) setEditing({ ...editing, body: nextBody });
    else setDraft(nextBody);
    setSelectedMentions((current) => current.some((item) => String(item._id) === String(member._id)) ? current : [...current, member]);
    setMentionSearch(null);
    const nextCursor = mentionSearch.start;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleMentionKeys(event) {
    if (!mentionSearch || !filteredMentionMembers.length) {
      if (event.key === "Escape") setMentionSearch(null);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveMentionIndex((index) => (index + direction + filteredMentionMembers.length) % filteredMentionMembers.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(filteredMentionMembers[activeMentionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMentionSearch(null);
    }
  }

  async function save(event) {
    event.preventDefault();
    const commentText = editing ? editing.body : draft;
    if (!commentText.trim()) return;
    const mentionPrefix = selectedMentions.map((member) => `@${member.username || member.name.trim().replace(/\s+/g, ".")}`).join(" ");
    const body = mentionPrefix ? `${mentionPrefix}\n${commentText.trimStart()}` : commentText;
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
    setMentionSearch(null);
    setSelectedMentions([]);
    load();
    onChanged?.();
  }

  async function remove() {
    const response = await fetch(`/api/tasks/${taskId}/comments/${deleteTarget._id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    setDeleteTarget(null);
    load();
    onChanged?.();
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
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-neutral-700"><CommentBody body={comment.body} mentionAliases={mentionAliases} /></p>
                </div>
                {!readOnly && (mine || canManage || canDelete) && <div className="flex shrink-0 gap-1">{(mine || canManage) && <button className="grid size-8 place-items-center rounded-lg hover:bg-neutral-100" onClick={() => { setEditing({ _id: comment._id, body: comment.body }); setMentionSearch(null); setSelectedMentions([]); }} aria-label="Edit comment"><Pencil size={13} /></button>}{(mine || canDelete) && <button className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(comment)} aria-label="Delete comment"><Trash2 size={13} /></button>}</div>}
              </div>
            </article>
          );
        })}
        {!comments.length && <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-5 text-center"><p className="text-sm font-medium text-neutral-600">No comments yet</p><p className="mt-1 text-xs text-neutral-400">Start the discussion with an update or mention a teammate.</p></div>}
      </div>
      {!readOnly ? <form className="mt-5" onSubmit={save}>
        <label className="relative block"><span className="label">{editing ? "Edit comment" : "Add comment"}</span>
          <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white transition focus-within:border-emerald-600 focus-within:ring-[3px] focus-within:ring-emerald-100">
            {selectedMentions.length > 0 && <div className="flex flex-wrap gap-1.5 px-3 pb-1 pt-3">{selectedMentions.map((member) => {
              const handle = member.username || member.name.trim().replace(/\s+/g, ".");
              return <span key={member._id} className="inline-flex min-h-7 items-center rounded-full border border-emerald-200 bg-emerald-50 pl-2.5 pr-1.5 text-xs font-semibold text-emerald-700">@{handle}<button type="button" className="ml-1 grid size-5 place-items-center rounded-full text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800" onClick={() => setSelectedMentions((current) => current.filter((item) => String(item._id) !== String(member._id)))} aria-label={`Remove ${member.name} mention`}><X size={11} /></button></span>;
            })}</div>}
            <textarea ref={textareaRef} role="combobox" className={`block min-h-28 w-full resize-y border-0 bg-transparent px-3 pb-3 text-sm leading-6 text-neutral-800 outline-none focus:outline-none focus-visible:outline-none ${selectedMentions.length ? "pt-2" : "pt-3"}`} maxLength={5000} value={editing ? editing.body : draft} onChange={(event) => updateBody(event.target.value, event.target.selectionStart)} onClick={(event) => updateMentionSearch(event.currentTarget.value, event.currentTarget.selectionStart)} onKeyUp={(event) => { if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) updateMentionSearch(event.currentTarget.value, event.currentTarget.selectionStart); }} onKeyDown={handleMentionKeys} placeholder={workspaceType === "personal" ? "Add a note, update, question, or blocker about this task…" : workspaceType === "organization" ? "Share an update with your organization… Use @name, @username, or @email to mention someone." : "Share an update with your team… Use @name, @username, or @email to mention someone."} aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={Boolean(mentionSearch)} aria-controls={mentionListId} />
          </div>
          {mentionSearch && <div id={mentionListId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
            {filteredMentionMembers.length ? filteredMentionMembers.map((member, index) => <button key={member._id} type="button" role="option" aria-selected={index === activeMentionIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(member)} onMouseEnter={() => setActiveMentionIndex(index)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${index === activeMentionIndex ? "bg-emerald-50" : "hover:bg-neutral-50"}`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{member.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-800">{member.name}</span><span className="block truncate text-xs text-neutral-500">{member.username ? `@${member.username} · ${member.email}` : member.email}</span></span>
              <AtSign size={12} className="shrink-0 text-neutral-400" />
            </button>) : <p className="px-3 py-4 text-center text-sm text-neutral-500">No matching users</p>}
          </div>}
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-4 text-neutral-400">{workspaceType === "personal" ? "Keep task context and progress notes together." : "Use @name, @username, or @email to notify a workspace member."}</p><div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">{editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setMentionSearch(null); setSelectedMentions([]); }}>Cancel</button>}<button className={`btn btn-primary ${editing ? "" : "col-span-2 sm:col-span-1"}`} disabled={saving || !(editing ? editing.body : draft).trim()}>{saving ? "Saving…" : editing ? "Save comment" : "Comment"}</button></div></div>
      </form> : <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Read-only task. Only the task creator can add or change comments.</p>}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this comment?" description="This comment will be permanently removed from the task discussion." confirmLabel="Delete comment" onClose={() => setDeleteTarget(null)} onConfirm={remove} />
    </>
  );
}
