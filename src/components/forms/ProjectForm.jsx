"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";
import {
  PRIORITIES,
} from "@/constants/project";
import { projectSchema } from "@/lib/validations";
import AssigneeField from "@/components/forms/AssigneeField";
import Dropdown from "@/components/ui/Dropdown";
import useProjectCustomization from "@/components/settings/useProjectCustomization";

const defaults = {
  name: "",
  clientName: "",
  description: "",
  projectPlatform: "General Project",
  zohoProduct: "",
  zohoProducts: [],
  moduleName: "",
  projectTypes: [],
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
  const initializedChoices = useRef(false);
  const { customization, workspaceType, loading: customizationLoading } = useProjectCustomization();
  const { register, handleSubmit, reset, control, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: defaults,
  });
  const selectedTypes = useWatch({ control, name: "projectTypes" }) || [];
  const projectPlatform = useWatch({ control, name: "projectPlatform" });
  const watchedZohoProducts = useWatch({ control, name: "zohoProducts" });
  const zohoProducts = useMemo(() => watchedZohoProducts || [], [watchedZohoProducts]);
  const assignedUserIds = useWatch({ control, name: "assignedUserIds" }) || [];
  const enabled = useCallback((key) => customization[key].filter((item) => item.enabled), [customization]);
  const labels = (key) => enabled(key).map((item) => item.label);
  const generalProject = customization.projectPlatforms.find((item) => item.id === "general-project")?.label || "General Project";
  const zohoProject = customization.projectPlatforms.find((item) => item.id === "zoho-project")?.label || "Zoho Project";

  useEffect(() => {
    if (projectId || customizationLoading || initializedChoices.current) return;
    initializedChoices.current = true;
    setValue("projectPlatform", enabled("projectPlatforms")[0]?.label || generalProject);
    setValue("stage", enabled("projectStages")[0]?.label || "Not Started");
    setValue("environment", enabled("environments")[0]?.label || "Not Applicable");
    setValue("template", enabled("starterTemplates")[0]?.id || "none");
  }, [customizationLoading, enabled, generalProject, projectId, setValue]);

  useEffect(() => {
    if (customizationLoading) return;
    if (projectPlatform === zohoProject && !zohoProducts.length) {
      const first = enabled("zohoPlatforms")[0]?.label;
      if (first) setValue("zohoProducts", [first]);
    } else if (projectPlatform !== zohoProject && zohoProducts.length) {
      setValue("zohoProducts", []);
    }
  }, [customizationLoading, enabled, projectPlatform, setValue, zohoProducts, zohoProject]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error(result.message);
        const project = result.data.project;
        const inferredPlatform = project.projectPlatform || (project.zohoProducts?.length || (project.zohoProduct && project.zohoProduct !== "General Project") ? zohoProject : generalProject);
        const platformOptions = enabled("projectPlatforms").map((item) => item.label);
        const stageOptions = enabled("projectStages").map((item) => item.label);
        const environmentOptions = enabled("environments").map((item) => item.label);
        const zohoOptions = enabled("zohoPlatforms").map((item) => item.label);
        const typeOptions = enabled("projectTypes").map((item) => item.label);
        const normalizedPlatform = platformOptions.length ? (platformOptions.includes(inferredPlatform) ? inferredPlatform : platformOptions[0]) : inferredPlatform;
        const savedZohoProducts = project.zohoProducts?.length ? project.zohoProducts : project.zohoProduct && project.zohoProduct !== "General Project" ? [project.zohoProduct] : [];
        reset({
          ...defaults,
          ...project,
          projectPlatform: normalizedPlatform,
          zohoProduct: "",
          zohoProducts: normalizedPlatform === zohoProject ? (zohoOptions.length ? savedZohoProducts.filter((value) => zohoOptions.includes(value)) : savedZohoProducts) : [],
          projectTypes: typeOptions.length ? (project.projectTypes || []).filter((value) => typeOptions.includes(value)) : project.projectTypes || [],
          stage: stageOptions.length ? (stageOptions.includes(project.stage) ? project.stage : stageOptions[0]) : project.stage,
          environment: environmentOptions.length ? (environmentOptions.includes(project.environment) ? project.environment : environmentOptions[0]) : project.environment,
          assignedUserIds: (project.assignedUserIds || []).map((user) => user._id || user),
          startDate: project.startDate?.slice(0, 10) || "",
          dueDate: project.dueDate?.slice(0, 10) || "",
          template: "",
        });
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [enabled, generalProject, projectId, reset, zohoProject]);

  async function submit(values) {
    if (values.projectPlatform === zohoProject && !values.zohoProducts?.length) {
      return setError("zohoProducts", { type: "manual", message: "Select at least one Zoho platform" });
    }
    const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
      method: projectId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      Object.entries(result.errors || {}).forEach(([field, message]) => setError(field, { type: "server", message }));
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

  if (loading || customizationLoading) return <div className="card p-6"><div className="skeleton h-96" /></div>;

  return (
    <form onSubmit={handleSubmit(submit)} className={compact ? "space-y-5" : "space-y-6"}>
      <section className={compact ? "rounded-xl border border-neutral-200 p-4 sm:p-5" : "card p-5 md:p-6"}>
        <h3 className="font-semibold">Project details</h3>
        <p className="mt-1 text-sm text-neutral-500">Core context for a general project or Zoho customization.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Project name" required error={errors.name?.message}><input className="field" {...register("name")} /></Field>
          <Field label="Client or company" error={errors.clientName?.message}><input className="field" {...register("clientName")} /></Field>
          {enabled("projectPlatforms").length > 0 && <Field label="Project platform" required error={errors.projectPlatform?.message}><FormDropdown control={control} name="projectPlatform" options={labels("projectPlatforms")} /></Field>}
          {enabled("projectPlatforms").length > 0 && enabled("zohoPlatforms").length > 0 && projectPlatform === zohoProject && <Field label="Zoho platforms" required error={errors.zohoProducts?.message}><FormDropdown multiple control={control} name="zohoProducts" options={labels("zohoPlatforms")} /></Field>}
          <div className="md:col-span-2"><Field label="Description" error={errors.description?.message}><textarea className="field" {...register("description")} /></Field></div>
        </div>
      </section>

      {workspaceType !== "personal" && <details className={compact ? "group rounded-xl border border-neutral-200 p-4 sm:p-5" : "card group p-5 md:p-6"}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Assigned users <ChevronDown className="transition-transform group-open:rotate-180" size={18} /></summary>
        <div className="mt-5"><AssigneeField scope="projects" operation={projectId ? "edit" : "create"} value={assignedUserIds} onChange={(value) => setValue("assignedUserIds", value, { shouldDirty: true, shouldValidate: true })} error={errors.assignedUserIds?.message} /></div>
      </details>}

      <section className={compact ? "rounded-xl border border-neutral-200 p-4 sm:p-5" : "card p-5 md:p-6"}>
        <h3 className="font-semibold">Workflow</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {enabled("projectStages").length > 0 && <Field label="Stage" required error={errors.stage?.message}><FormDropdown control={control} name="stage" options={labels("projectStages")} /></Field>}
          <Field label="Priority" required error={errors.priority?.message}><FormDropdown control={control} name="priority" options={PRIORITIES} /></Field>
          {enabled("environments").length > 0 && <Field label="Environment" required error={errors.environment?.message}><FormDropdown control={control} name="environment" options={labels("environments")} /></Field>}
          <Field label="Start date" error={errors.startDate?.message}><input type="date" className="field" {...register("startDate")} /></Field>
          <Field label="Due date" error={errors.dueDate?.message}><input type="date" className="field" {...register("dueDate")} /></Field>
          {!projectId && enabled("starterTemplates").length > 0 && <Field label="Starter template" error={errors.template?.message}><FormDropdown control={control} name="template" options={enabled("starterTemplates").map((item) => [item.id, item.label])} /></Field>}
          {enabled("projectTypes").length > 0 && <fieldset className="md:col-span-3">
            <legend className="label">Project types</legend>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {labels("projectTypes").map((type) => <label key={type} className="flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm"><input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />{type}</label>)}
            </div>
            {errors.projectTypes && <p className="mt-1 text-xs text-red-600">{errors.projectTypes.message}</p>}
          </fieldset>}
        </div>
      </section>

      <details className={compact ? "group rounded-xl border border-neutral-200 p-4 sm:p-5" : "card group p-5 md:p-6"}>
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
  return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-red-600" role="alert">{error}</span>}</label>;
}
function FormDropdown({ control, name, options, multiple = false }) {
  return <Controller control={control} name={name} render={({ field }) => <Dropdown multiple={multiple} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={options} />} />;
}
