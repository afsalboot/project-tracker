"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ENVIRONMENTS, PRIORITIES } from "@/constants/project";
import { DEPLOYMENT_STATUSES, TASK_STATUSES } from "@/constants/task";
import { taskSchema } from "@/lib/validations";
import Dropdown from "@/components/ui/Dropdown";

const defaults = {
  title: "", description: "", status: "To Do", priority: "Medium", dueDate: "",
  estimatedMinutes: 0, actualMinutes: 0, functionName: "", workflowName: "",
  moduleApiName: "", fieldApiNames: [], webhookEvent: "", connectionName: "",
  environment: "Not Applicable", technicalNotes: "", blockerReason: "", testResult: "",
  deploymentStatus: "Not Started", errorLogs: "", testPayload: "",
};

export default function TaskDialog({ open, onClose, projectId, task, projects = [], onSaved }) {
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: defaults,
  });
  const status = useWatch({ control, name: "status" });
  const priority = useWatch({ control, name: "priority" });
  const environment = useWatch({ control, name: "environment" });
  const deploymentStatus = useWatch({ control, name: "deploymentStatus" });
  const fieldApiNames = useWatch({ control, name: "fieldApiNames" });

  useEffect(() => {
    if (!open) return;
    reset({
      ...defaults,
      ...task,
      projectId: task?.projectId?._id || task?.projectId || projectId || "",
      dueDate: task?.dueDate?.slice(0, 10) || "",
      fieldApiNames: task?.fieldApiNames || [],
    });
  }, [open, projectId, reset, task]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  async function submit(values) {
    const targetProject = projectId || values.projectId;
    const url = task?._id ? `/api/tasks/${task._id}` : `/api/projects/${targetProject}/tasks`;
    const response = await fetch(url, {
      method: task?._id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.message);
    toast.success(result.message);
    onSaved?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/45 p-0 backdrop-blur-[2px] sm:p-5"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(92vh,900px)] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center border-b border-neutral-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-emerald-700">Task workspace</p>
            <h2 id="task-dialog-title" className="mt-1 text-lg font-semibold">{task ? "Edit task" : "Add task"}</h2>
            <p className="text-xs text-neutral-500">Capture the work first. Technical context stays optional.</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto grid size-10 place-items-center rounded-xl border border-neutral-200 transition hover:bg-neutral-50" aria-label="Close task form">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Task title" required error={errors.title?.message}>
                <input className="field" autoFocus {...register("title")} />
              </Field>
              {!projectId && (
                <Field label="Project" required error={errors.projectId?.message}>
                  <Controller
                    control={control}
                    name="projectId"
                    render={({ field }) => <Dropdown value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Select project" options={projects.map((item) => [item._id, item.name])} />}
                  />
                </Field>
              )}
              <div className="md:col-span-2">
                <Field label="Status" required>
                  <input type="hidden" {...register("status")} />
                  <PillGroup values={TASK_STATUSES} value={status} onChange={(value) => setValue("status", value, { shouldDirty: true, shouldValidate: true })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Priority" required>
                  <input type="hidden" {...register("priority")} />
                  <PillGroup values={PRIORITIES} value={priority} onChange={(value) => setValue("priority", value, { shouldDirty: true, shouldValidate: true })} />
                </Field>
              </div>
              <Field label="Due date" error={errors.dueDate?.message}>
                <input type="date" className="field" {...register("dueDate")} />
              </Field>
              <Field label="Environment">
                <input type="hidden" {...register("environment")} />
                <PillGroup values={ENVIRONMENTS} value={environment} onChange={(value) => setValue("environment", value, { shouldDirty: true, shouldValidate: true })} />
              </Field>
              <Field label="Estimated minutes"><input type="number" min="0" className="field" {...register("estimatedMinutes")} /></Field>
              <Field label="Actual minutes"><input type="number" min="0" className="field" {...register("actualMinutes")} /></Field>
              <div className="md:col-span-2"><Field label="Description"><textarea className="field" {...register("description")} /></Field></div>
              {status === "Blocked" && <div className="rounded-xl border border-red-200 bg-red-50 p-4 md:col-span-2"><Field label="Blocker reason" required><textarea className="field !border-red-200" {...register("blockerReason")} /></Field></div>}
            </div>

            <details className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <summary className="cursor-pointer font-semibold">Zoho technical details</summary>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Function name"><input className="field font-mono" {...register("functionName")} /></Field>
                <Field label="Workflow name"><input className="field font-mono" {...register("workflowName")} /></Field>
                <Field label="Module API name"><input className="field font-mono" {...register("moduleApiName")} /></Field>
                <Field label="Field API names"><input className="field font-mono" placeholder="Email, Deal_Name, Stage" key={(fieldApiNames || []).join(",")} defaultValue={(fieldApiNames || []).join(", ")} onBlur={(event) => setValue("fieldApiNames", event.target.value.split(",").map((value) => value.trim()).filter(Boolean), { shouldValidate: true })} /></Field>
                <Field label="Webhook event"><input className="field font-mono" {...register("webhookEvent")} /></Field>
                <Field label="Zoho connection name"><input className="field font-mono" {...register("connectionName")} /></Field>
                <div className="md:col-span-2">
                  <Field label="Deployment status">
                    <input type="hidden" {...register("deploymentStatus")} />
                    <PillGroup values={DEPLOYMENT_STATUSES} value={deploymentStatus} onChange={(value) => setValue("deploymentStatus", value, { shouldDirty: true, shouldValidate: true })} />
                  </Field>
                </div>
                <div className="md:col-span-2"><Field label="Technical notes"><textarea className="field min-h-36 font-mono text-xs" {...register("technicalNotes")} /></Field></div>
                <div className="md:col-span-2"><Field label="Testing result"><textarea className="field font-mono text-xs" {...register("testResult")} /></Field></div>
                <div className="md:col-span-2"><Field label="Test payload"><textarea className="field min-h-44 font-mono text-xs" {...register("testPayload")} /></Field></div>
                <div className="md:col-span-2"><Field label="Error logs"><textarea className="field min-h-44 font-mono text-xs" {...register("errorLogs")} /></Field></div>
              </div>
            </details>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 bg-white p-4 sm:px-6">
            <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary flex-1 sm:flex-none" disabled={isSubmitting}>{isSubmitting ? "Saving…" : task ? "Save task" : "Add task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}

function PillGroup({ values, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <button
          type="button"
          key={item}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${value === item ? "border-emerald-700 bg-emerald-700 text-white shadow-sm" : "border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300 hover:text-emerald-800"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
