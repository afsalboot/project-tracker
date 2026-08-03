"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export default function AssigneeField({ scope, operation, value = [], onChange, error }) {
  const [state, setState] = useState({ loading: true, enabled: false, members: [] });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ scope });
    if (operation) params.set("operation", operation);
    fetch(`/api/workspace/assignees?${params}`)
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        setState({
          loading: false,
          enabled: response.ok && result.data.enabled,
          members: response.ok ? result.data.members : [],
        });
      })
      .catch(() => active && setState({ loading: false, enabled: false, members: [] }));
    return () => { active = false; };
  }, [operation, scope]);

  if (state.loading) return <div className="skeleton h-20" />;
  if (!state.enabled) return <p className="text-sm leading-6 text-neutral-500">User assignment is available in Organization or Team workspaces and requires the appropriate project permission.</p>;

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <fieldset>
      <legend className="label">Assigned users</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {state.members.map((member) => (
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${value.includes(member._id) ? "border-emerald-200 bg-emerald-50" : "border-neutral-200"}`} key={member._id}>
            <input type="checkbox" checked={value.includes(member._id)} onChange={() => toggle(member._id)} />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-emerald-700 ring-1 ring-neutral-200">{member.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block truncate text-xs text-neutral-500">{member.email}</span></span>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600 ring-1 ring-neutral-200">{member.totalProjects || 0} project{member.totalProjects === 1 ? "" : "s"}</span>
          </label>
        ))}
      </div>
      {!state.members.length && <p className="text-sm text-neutral-500">Add workspace users before assigning work.</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500"><Users size={13} />{operation === "create" ? "Included with Create New Project permission." : "Requires Change Assigned Users permission."}</p>
    </fieldset>
  );
}
