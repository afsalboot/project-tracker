import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { normalizeCustomization } from "@/constants/customization";
import { requireApiUser } from "@/lib/server";
import { hasWorkspacePermission } from "@/lib/workspace";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Workspace from "@/models/Workspace";

export const runtime = "nodejs";

const optionSchema = z.object({
  id: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
});
const templateSchema = optionSchema.extend({
  tasks: z.array(z.string().trim().min(1).max(240)).max(100).default([]),
});
const customizationSchema = z.object({
  projectStages: z.array(optionSchema).max(50),
  taskStatuses: z.array(optionSchema).max(50),
  environments: z.array(optionSchema).max(50),
  starterTemplates: z.array(templateSchema).max(30),
  projectTypes: z.array(optionSchema).max(50),
  projectPlatforms: z.array(optionSchema).max(20),
  zohoPlatforms: z.array(optionSchema).max(50),
});

function validateOptions(customization) {
  for (const [key, options] of Object.entries(customization)) {
    const ids = new Set(options.map((item) => item.id));
    const labels = new Set(options.map((item) => item.label.toLowerCase()));
    if (ids.size !== options.length || labels.size !== options.length) {
      return `${key} contains duplicate names or identifiers.`;
    }
  }
  return null;
}

async function renameSavedValues(workspaceId, previous, next) {
  const generalProject = previous.projectPlatforms.find((item) => item.id === "general-project")?.label || "General Project";
  const zohoProject = previous.projectPlatforms.find((item) => item.id === "zoho-project")?.label || "Zoho Project";
  const jobs = [
    Project.updateMany({ workspaceId, projectPlatform: { $exists: false }, zohoProduct: { $nin: ["", "General Project"] } }, { $set: { projectPlatform: zohoProject } }),
    Project.updateMany({ workspaceId, projectPlatform: { $exists: false }, $or: [{ zohoProduct: "" }, { zohoProduct: "General Project" }, { zohoProduct: { $exists: false } }] }, { $set: { projectPlatform: generalProject } }),
    Project.updateMany(
      { workspaceId, zohoProducts: { $exists: false }, zohoProduct: { $nin: ["", "General Project"] } },
      [{ $set: { zohoProducts: ["$zohoProduct"] } }],
      { updatePipeline: true },
    ),
  ];
  const mappings = [
    ["projectStages", Project, "stage"],
    ["taskStatuses", Task, "status"],
    ["environments", Project, "environment"],
    ["environments", Task, "environment"],
    ["projectPlatforms", Project, "projectPlatform"],
    ["zohoPlatforms", Project, "zohoProduct"],
  ];
  for (const [key, Model, field] of mappings) {
    for (const oldOption of previous[key]) {
      const newOption = next[key].find((item) => item.id === oldOption.id);
      if (newOption && newOption.label !== oldOption.label) {
        jobs.push(Model.updateMany({ workspaceId, [field]: oldOption.label }, { $set: { [field]: newOption.label } }));
      }
    }
  }
  for (const oldOption of previous.projectTypes) {
    const newOption = next.projectTypes.find((item) => item.id === oldOption.id);
    if (newOption && newOption.label !== oldOption.label) {
      jobs.push(Project.updateMany(
        { workspaceId, projectTypes: oldOption.label },
        { $set: { "projectTypes.$[choice]": newOption.label } },
        { arrayFilters: [{ choice: oldOption.label }] },
      ));
    }
  }
  for (const oldOption of previous.zohoPlatforms) {
    const newOption = next.zohoPlatforms.find((item) => item.id === oldOption.id);
    if (newOption && newOption.label !== oldOption.label) {
      jobs.push(Project.updateMany(
        { workspaceId, zohoProducts: oldOption.label },
        { $set: { "zohoProducts.$[choice]": newOption.label } },
        { arrayFilters: [{ choice: oldOption.label }] },
      ));
    }
  }
  await Promise.all(jobs);
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    return ok({ customization: normalizeCustomization(auth.workspace.customization), workspaceType: auth.workspace.type });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!hasWorkspacePermission(auth.workspace, auth.role, "settings.project_customization") || !hasWorkspacePermission(auth.workspace, auth.role, "workspace.manage")) {
      return fail("You do not have permission to customize project settings.", 403);
    }
    const customization = customizationSchema.parse(await request.json());
    const issue = validateOptions(customization);
    if (issue) return fail(issue, 422);
    const previous = normalizeCustomization(auth.workspace.customization);
    await renameSavedValues(auth.workspaceId, previous, customization);
    await Workspace.findByIdAndUpdate(auth.workspaceId, { $set: { customization } }, { runValidators: true });
    return ok({ customization, workspaceType: auth.workspace.type }, "Project customization saved.");
  } catch (error) {
    return handleApiError(error);
  }
}
