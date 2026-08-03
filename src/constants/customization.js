const option = (id, label, extra = {}) => ({ id, label, enabled: true, ...extra });

export const DEFAULT_CUSTOMIZATION = {
  projectStages: [
    option("not-started", "Not Started"),
    option("requirement-gathering", "Requirement Gathering"),
    option("planning", "Planning"),
    option("development", "Development"),
    option("internal-testing", "Internal Testing"),
    option("client-testing", "Client Testing"),
    option("review", "Review"),
    option("ready-for-deployment", "Ready for Deployment"),
    option("deployed", "Deployed"),
    option("completed", "Completed"),
    option("on-hold", "On Hold"),
    option("blocked", "Blocked"),
    option("cancelled", "Cancelled"),
  ],
  taskStatuses: [
    option("to-do", "To Do"),
    option("in-progress", "In Progress"),
    option("testing", "Testing"),
    option("blocked", "Blocked"),
    option("completed", "Completed"),
  ],
  environments: [
    option("not-applicable", "Not Applicable"),
    option("sandbox", "Sandbox"),
    option("production", "Production"),
    option("both", "Both"),
  ],
  projectTypes: [],
  projectPlatforms: [
    option("general-project", "General Project"),
    option("zoho-project", "Zoho Project"),
  ],
  zohoPlatforms: [
    option("zoho-crm", "Zoho CRM"),
    option("zoho-books", "Zoho Books"),
    option("zoho-cliq", "Zoho Cliq"),
    option("zoho-creator", "Zoho Creator"),
    option("zoho-desk", "Zoho Desk"),
    option("zoho-analytics", "Zoho Analytics"),
    option("zoho-flow", "Zoho Flow"),
    option("zoho-sign", "Zoho Sign"),
  ],
  starterTemplates: [option("none", "None", { tasks: [] })],
};

export const CUSTOMIZATION_SECTIONS = [
  ["projectStages", "Stage", "Project stages used across project forms and filters."],
  ["taskStatuses", "Task status", "Statuses used by tasks and subtasks."],
  ["environments", "Environment", "Workspace environments available to projects and tasks."],
  ["starterTemplates", "Starter template", "Reusable task lists available when creating a project."],
  ["projectTypes", "Project types", "Optional project classification choices."],
  ["projectPlatforms", "Project platform", "Top-level project platforms."],
  ["zohoPlatforms", "Zoho platform", "Products shown when Zoho Project is selected."],
];

export function normalizeCustomization(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_CUSTOMIZATION).map(([key, defaults]) => [
      key,
      Array.isArray(source[key]) ? source[key] : defaults.map((item) => ({ ...item })),
    ]),
  );
}

export function enabledLabels(customization, key) {
  return (customization?.[key] || []).filter((item) => item.enabled).map((item) => item.label);
}

export function semanticLabel(workspace, key, id, fallback) {
  return normalizeCustomization(workspace?.customization)[key].find((item) => item.id === id)?.label || fallback;
}
