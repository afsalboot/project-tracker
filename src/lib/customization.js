import { normalizeCustomization, semanticLabel } from "@/constants/customization";

export function workspaceCustomization(workspace) {
  return normalizeCustomization(workspace?.customization);
}

export function activeChoice(workspace, key, value) {
  return workspaceCustomization(workspace)[key].some((item) => item.enabled && item.label === value);
}

export function hasEnabledChoices(workspace, key) {
  return workspaceCustomization(workspace)[key].some((item) => item.enabled);
}

export function completedTaskStatus(workspace) {
  const options = workspaceCustomization(workspace).taskStatuses;
  return options.find((item) => item.id === "completed")?.label || [...options].reverse().find((item) => item.enabled)?.label || "Completed";
}

export function defaultTaskStatus(workspace) {
  return semanticLabel(workspace, "taskStatuses", "to-do", workspaceCustomization(workspace).taskStatuses.find((item) => item.enabled)?.label || "To Do");
}

export function blockedTaskStatus(workspace) {
  return semanticLabel(workspace, "taskStatuses", "blocked", "Blocked");
}

export function testingTaskStatus(workspace) {
  return semanticLabel(workspace, "taskStatuses", "testing", "Testing");
}

export function completedProjectStage(workspace) {
  const options = workspaceCustomization(workspace).projectStages;
  return options.find((item) => item.id === "completed")?.label || [...options].reverse().find((item) => item.enabled)?.label || "Completed";
}

export function projectZohoPlatforms(project) {
  if (project?.zohoProducts?.length) return project.zohoProducts;
  return project?.zohoProduct && project.zohoProduct !== "General Project" ? [project.zohoProduct] : [];
}

export function projectPlatformName(project) {
  return project?.projectPlatform || (projectZohoPlatforms(project).length ? "Zoho Project" : "General Project");
}
