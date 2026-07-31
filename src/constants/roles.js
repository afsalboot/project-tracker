export const ROLE_ICON_KEYS = [
  "crown",
  "shield",
  "users",
  "briefcase",
  "code",
  "chart",
  "headset",
  "review",
  "design",
  "marketing",
  "sales",
  "finance",
  "quality",
  "operations",
  "product",
  "research",
];

export const DEFAULT_ROLE_COLOR = "#047857";
export const ROLE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const ROLE_ICON_OPTIONS = [
  { key: "crown", label: "Leadership" },
  { key: "shield", label: "Administration" },
  { key: "users", label: "Team" },
  { key: "briefcase", label: "Management" },
  { key: "code", label: "Development" },
  { key: "chart", label: "Analytics" },
  { key: "headset", label: "Support" },
  { key: "review", label: "Review" },
  { key: "design", label: "Design" },
  { key: "marketing", label: "Marketing" },
  { key: "sales", label: "Sales" },
  { key: "finance", label: "Finance" },
  { key: "quality", label: "Quality assurance" },
  { key: "operations", label: "Operations" },
  { key: "product", label: "Product" },
  { key: "research", label: "Research" },
];

export function defaultRoleIcon(role = {}) {
  if (ROLE_ICON_KEYS.includes(role.icon)) return role.icon;
  if (role.key === "owner") return "crown";
  if (role.key === "admin") return "shield";
  if (role.key === "member") return "users";

  const searchable = `${role.key || ""} ${role.name || ""}`.toLowerCase();
  if (searchable.includes("lead") || searchable.includes("manager")) return "briefcase";
  if (searchable.includes("develop") || searchable.includes("engineer")) return "code";
  if (searchable.includes("report") || searchable.includes("analyst")) return "chart";
  if (searchable.includes("support")) return "headset";
  if (searchable.includes("design") || searchable.includes("creative")) return "design";
  if (searchable.includes("market") || searchable.includes("content")) return "marketing";
  if (searchable.includes("sales") || searchable.includes("account")) return "sales";
  if (searchable.includes("finance") || searchable.includes("accountant")) return "finance";
  if (searchable.includes("quality") || searchable.includes("test") || searchable.includes("qa")) return "quality";
  if (searchable.includes("operation") || searchable.includes("delivery")) return "operations";
  if (searchable.includes("product")) return "product";
  if (searchable.includes("research")) return "research";
  return "review";
}

export function roleColor(role = {}) {
  return ROLE_COLOR_PATTERN.test(role.color || "") ? role.color : DEFAULT_ROLE_COLOR;
}
