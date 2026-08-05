import { defaultRoleIcon } from "@/constants/roles";

export const PERMISSION_GROUPS = [
  {
    key: "visibility",
    label: "Module Access",
    description: "Control which application modules this role can open.",
  },
  {
    key: "records",
    label: "Record Permissions",
    description: "Control actions for projects, tasks, and users.",
  },
  {
    key: "workspace",
    label: "Administration",
    description: "Control workspace configuration and role administration.",
  },
  {
    key: "settings_tabs",
    label: "Settings Tab Visibility",
    description: "Choose which settings sections this role can open. Profile is always visible.",
  },
];

export const WORKSPACE_PERMISSIONS = [
  { key: "dashboard.view", group: "visibility", label: "Dashboard", description: "Open the dashboard and workspace summaries." },
  { key: "completed.view", group: "visibility", label: "Completed Work", description: "Open completed project and task views." },
  { key: "projects.view", group: "records", section: "Project", label: "View", description: "View project lists, details, activity, and archived projects." },
  { key: "projects.view_others", group: "records", section: "Project", label: "View Others' Projects", description: "View projects the user did not create and is not assigned to." },
  { key: "projects.create", group: "records", section: "Project", label: "Create New Project", description: "Create projects and assign workspace users during project creation." },
  { key: "projects.edit", group: "records", section: "Project", label: "Edit", description: "Edit project details, stages, and completion state." },
  { key: "projects.assign", group: "records", section: "Project", label: "Change Assigned Users", description: "Change user assignments on existing projects in Organization or Team mode." },
  { key: "projects.archive", group: "records", section: "Project", label: "Archive and Restore", description: "Archive and restore projects." },
  { key: "projects.delete", group: "records", section: "Project", label: "Delete", description: "Permanently delete eligible projects and their tasks." },

  { key: "tasks.view", group: "records", section: "Task", label: "View", description: "View My Tasks, project tasks, and the task board." },
  { key: "tasks.view_others", group: "records", section: "Task", label: "View Others' Tasks", description: "View tasks created by other people inside accessible projects." },
  { key: "tasks.create", group: "records", section: "Task", label: "Create", description: "Add tasks to projects." },
  { key: "tasks.comment", group: "records", section: "Task", label: "Comment", description: "Add, edit, and delete the user's own comments on visible tasks." },
  { key: "tasks.edit", group: "records", section: "Task", label: "Edit", description: "Edit task details and update task status." },
  { key: "tasks.delete", group: "records", section: "Task", label: "Delete", description: "Permanently delete tasks." },

  { key: "members.view", group: "records", section: "User", label: "View", description: "View the workspace user directory and assigned roles." },
  { key: "members.create", group: "records", section: "User", label: "Add", description: "Add users to Organization or Team workspaces." },
  { key: "members.manage", group: "records", section: "User", label: "Manage", description: "Assign roles and remove workspace users." },

  { key: "workspace.manage", group: "workspace", label: "Workspace Settings", description: "Change the workspace name and Personal, Organization, or Team mode." },
  { key: "team.display.manage", group: "workspace", label: "Team and Dashboard Display", description: "Choose standard roles shown separately in Team and roles included in Dashboard project allocation." },
  { key: "roles.manage", group: "workspace", label: "Roles and Permissions", description: "Create roles and change or delete saved permission policies." },

  { key: "settings.workspace", group: "settings_tabs", label: "Workspace", description: "Show the Workspace settings tab. Workspace Settings permission still controls changes." },
  { key: "settings.project_customization", group: "settings_tabs", label: "Project & Task Setup", description: "Show project and task customization settings." },
  { key: "settings.appearance", group: "settings_tabs", label: "Appearance", description: "Show workspace appearance settings." },
  { key: "settings.users", group: "settings_tabs", label: "Users", description: "Show user and access settings. User record permissions still control available actions." },
  { key: "settings.display", group: "settings_tabs", label: "Team & Dashboard", description: "Show Team and Dashboard display settings." },
  { key: "settings.roles", group: "settings_tabs", label: "Roles & Permissions", description: "Show saved roles and permission details. Roles and Permissions administration still controls changes." },
];

const ALL_PERMISSIONS = WORKSPACE_PERMISSIONS.map((permission) => permission.key);
const MEMBER_PERMISSIONS = [
  "dashboard.view",
  "projects.view",
  "tasks.view",
  "completed.view",
  "projects.create",
  "tasks.create",
  "tasks.comment",
  "projects.edit",
  "projects.archive",
  "projects.delete",
  "tasks.edit",
  "tasks.delete",
];

export const DEFAULT_WORKSPACE_ROLES = [
  { key: "owner", name: "Owner", icon: "crown", color: "#b45309", permissions: ALL_PERMISSIONS, isSystem: true },
  { key: "admin", name: "Admin", icon: "shield", color: "#7c3aed", permissions: ALL_PERMISSIONS, isSystem: true },
  { key: "member", name: "Member", icon: "users", color: "#047857", permissions: MEMBER_PERMISSIONS, isSystem: true },
];

export const LEGACY_PERMISSION_EXPANSIONS = {
  "workspace.manage": ["workspace.manage", "roles.manage"],
  "members.manage": ["members.view", "members.create", "members.manage"],
  "projects.manage": [
    "projects.view",
    "projects.view_others",
    "projects.create",
    "projects.edit",
    "projects.assign",
    "projects.archive",
    "projects.delete",
  ],
  "tasks.manage": ["tasks.view", "tasks.view_others", "tasks.create", "tasks.comment", "tasks.edit", "tasks.delete"],
};

export function expandLegacyRolePermissions(roles = []) {
  let changed = false;
  const expanded = roles.map((role) => {
    const permissions = new Set(role.permissions || []);
    let roleChanged = false;
    for (const [legacy, replacements] of Object.entries(LEGACY_PERMISSION_EXPANSIONS)) {
      if (!permissions.has(legacy)) continue;
      permissions.delete(legacy);
      replacements.forEach((permission) => permissions.add(permission));
      roleChanged = true;
    }
    for (const permission of [...permissions]) {
      if (!ALL_PERMISSIONS.includes(permission)) {
        permissions.delete(permission);
        roleChanged = true;
      }
    }
    if (roleChanged) {
      permissions.add("dashboard.view");
      permissions.add("completed.view");
      changed = true;
    }
    if (role.key === "owner" || role.key === "admin") {
      for (const permission of ALL_PERMISSIONS) {
        if (!permissions.has(permission)) changed = true;
        permissions.add(permission);
      }
    }
    const icon = defaultRoleIcon(role);
    if (role.icon !== icon) changed = true;
    const color = role.color || (role.key === "owner" ? "#b45309" : role.key === "admin" ? "#7c3aed" : "#047857");
    if (role.color !== color) changed = true;
    return {
      key: role.key,
      name: role.name,
      icon,
      color,
      permissions: [...permissions],
      isSystem: Boolean(role.isSystem),
    };
  });
  return { roles: expanded, changed };
}
