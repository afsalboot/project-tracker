"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  ENVIRONMENTS,
  PRIORITIES,
  PROJECT_STAGES,
  PROJECT_TEMPLATES,
  PROJECT_TYPES,
  ZOHO_PRODUCTS,
} from "@/constants/project";
import { projectSchema } from "@/lib/validations";
import AssigneeField from "@/components/forms/AssigneeField";
import Dropdown from "@/components/ui/Dropdown";

const defaults = {
  name: "",
  clientName: "",
  description: "",
  zohoProduct: "General Project",
  moduleName: "",
  projectTypes: ["General"],
  environment: "Not Applicable",
  stage: "Not Started",
  priority: "Medium",
  startDate: "",
  dueDate: "",
  zohoUrl: "",
  repositoryUrl: "",
  notes: "",
  template: "",
  assignedUserIds: [],
};

export default function ProjectForm({ projectId, onSuccess, onCancel, compact = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(Boolean(projectId));
  const [customType, setCustomType] = useState("");
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: defaults,
  });
  const selectedTypes = useWatch({ control, name: "projectTypes" }) || [];
  const assignedUserIds = useWatch({ control, name: "assignedUserIds" }) || [];

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error(result.message);
        const project = result.data.project;
        reset({
          ...defaults,
          ...project,
          assignedUserIds: (project.assignedUserIds || []).map((user) => user._id || user),
          startDate: project.startDate?.slice(0, 10) || "",
          dueDate: project.dueDate?.slice(0, 10) || "",
          template: "",
        });
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [projectId, reset]);

  async function submit(values) {
    const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
      method: projectId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    if (onSuccess) {
      onSuccess(result.data.project);
      return;
    }
    router.push(`/projects/${result.data.project._id}`);
    router.refresh();
  }

  function toggleType(type) {
    setValue(
      "projectTypes",
      selectedTypes.includes(type)
        ? selectedTypes.filter((item) => item !== type)
        : [...selectedTypes, type],
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addCustomType() {
    const value = customType.trim();
    if (!value || selectedTypes.includes(value)) return;
    setValue("projectTypes", [...selectedTypes, value], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setCustomType("");
  }

  if (loading) return <div className="card p-6"><div className="skeleton h-96" /></div>;

  return (
    <form onSubmit={handleSubmit(submit)} className={compact ? "space-y-5" : "space-y-6"}>
      <section className={compact ? "rounded-xl border border-neutral-200 p-4 sm:p-5" : "card p-5 md:p-6"}>
        <h3 className="font-semibold">Project details</h3>
        <p className="mt-1 text-sm text-neutral-500">Core context for a general project or Zoho customization.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Project name" required error={errors.name?.message}><input className="field" {...register("name")} /></Field>
          <Field label="Client or company" error={errors.clientName?.message}><input className="field" {...register("clientName")} /></Field>
          <Field label="Project platform" required error={errors.zohoProduct?.message}><FormDropdown control={control} name="zohoProduct" options={ZOHO_PRODUCTS} /></Field>
          <Field label="Module or work area" error={errors.moduleName?.message}><input className="field" placeholder="e.g. Deals, Website, Operations" {...register("moduleName")} /></Field>
          <div className="md:col-span-2"><Field label="Description" error={errors.description?.message}><textarea className="field" {...register("description")} /></Field></div>
          <div className="md:col-span-2"><AssigneeField scope="projects" value={assignedUserIds} onChange={(value) => setValue("assignedUserIds", value, { shouldDirty: true, shouldValidate: true })} error={errors.assignedUserIds?.message} /></div>
        </div>
      </section>

      <section className={compact ? "rounded-xl border border-neutral-200 p-4 sm:p-5" : "card p-5 md:p-6"}>
        <h3 className="font-semibold">Workflow</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field label="Stage" required error={errors.stage?.message}><FormDropdown control={control} name="stage" options={PROJECT_STAGES} /></Field>
          <Field label="Priority" required error={errors.priority?.message}><FormDropdown control={control} name="priority" options={PRIORITIES} /></Field>
          <Field label="Environment" required error={errors.environment?.message}><FormDropdown control={control} name="environment" options={ENVIRONMENTS} /></Field>
          <Field label="Start date" error={errors.startDate?.message}><input type="date" className="field" {...register("startDate")} /></Field>
          <Field label="Due date" error={errors.dueDate?.message}><input type="date" className="field" {...register("dueDate")} /></Field>
          {!projectId && <Field label="Starter template"><FormDropdown control={control} name="template" options={[["", "Start without template"], ...Object.entries(PROJECT_TEMPLATES).map(([value, config]) => [value, config.label])]} /></Field>}
          <fieldset className="md:col-span-3">
            <legend className="label">Project types</legend>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {PROJECT_TYPES.map((type) => <label key={type} className="flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm"><input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />{type}</label>)}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="field"
                value={customType}
                onChange={(event) => setCustomType(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomType();
                  }
                }}
                placeholder="Enter another project type"
                aria-label="Custom project type"
              />
              <button type="button" className="btn btn-secondary shrink-0" onClick={addCustomType}><Plus size={16} />Add type</button>
            </div>
            {selectedTypes.filter((type) => !PROJECT_TYPES.includes(type)).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTypes.filter((type) => !PROJECT_TYPES.includes(type)).map((type) => (
                  <span key={type} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {type}
                    <button type="button" onClick={() => toggleType(type)} aria-label={`Remove ${type}`}><X size={13} /></button>
                  </span>
                ))}
              </div>
            )}
            {errors.projectTypes && <p className="mt-1 text-xs text-red-600">{errors.projectTypes.message}</p>}
          </fieldset>
        </div>
      </section>

      <details className={compact ? "group rounded-xl border border-neutral-200 p-4 sm:p-5" : "card group p-5 md:p-6"} open>
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Links and technical notes <ChevronDown className="transition-transform group-open:rotate-180" size={18} /></summary>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Project or Zoho URL" error={errors.zohoUrl?.message}><input type="url" className="field" placeholder="https://…" {...register("zohoUrl")} /></Field>
          <Field label="Repository or code URL" error={errors.repositoryUrl?.message}><input type="url" className="field" placeholder="https://…" {...register("repositoryUrl")} /></Field>
          <div className="md:col-span-2"><Field label="Project notes" error={errors.notes?.message}><textarea className="field min-h-40 font-mono text-xs" {...register("notes")} /></Field></div>
        </div>
      </details>

      <div className={compact ? "sticky bottom-0 z-10 -mx-3 flex justify-end gap-3 border-t border-neutral-200 bg-white px-3 py-3 sm:mx-0 sm:px-0" : "flex justify-end gap-3"}>
        <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={() => onCancel ? onCancel() : router.back()}>Cancel</button>
        <button className="btn btn-primary flex-1 sm:flex-none" disabled={isSubmitting}><Save size={17} />{isSubmitting ? "Saving…" : projectId ? "Save changes" : "Create project"}</button>
      </div>
    </form>
  );
}

function Field({ label, required, error, children }) {
  return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
function FormDropdown({ control, name, options }) {
  return <Controller control={control} name={name} render={({ field }) => <Dropdown value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={options} />} />;
}
