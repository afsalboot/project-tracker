import { z } from "zod";
import {
  PRIORITIES,
} from "@/constants/project";
import { DEPLOYMENT_STATUSES } from "@/constants/task";
import { WORKSPACE_PERMISSIONS } from "@/constants/permissions";
import { DEFAULT_ROLE_COLOR, ROLE_COLOR_PATTERN, ROLE_ICON_KEYS } from "@/constants/roles";

const optionalText = (max = 10000) =>
  z.string().trim().max(max).optional().or(z.literal(""));
const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const strongPasswordSchema = z.string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const usernameSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(30, "Use no more than 30 characters")
  .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, hyphens, or underscores");

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(80, "Use no more than 80 characters"),
  username: usernameSchema.or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: strongPasswordSchema,
}).refine((value) => value.currentPassword !== value.newPassword, {
  path: ["newPassword"],
  message: "Choose a password different from your current password",
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: strongPasswordSchema,
  workspaceName: z.string().trim().min(2).max(120).optional(),
  workspaceType: z.enum(["personal", "organization", "team"]).default("personal"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(128),
});

export const feedbackSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(80, "Use no more than 80 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  context: z.string().trim().max(120, "Use no more than 120 characters").optional().default(""),
  message: z.string().trim().min(10, "Enter at least 10 characters").max(1200, "Use no more than 1200 characters"),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  website: z.string().max(200).optional().default(""),
});

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(80, "Use no more than 80 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: strongPasswordSchema,
  role: z.string().trim().min(1, "Select a saved role").max(64),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(120, "Use no more than 120 characters"),
  type: z.enum(["personal", "organization", "team"], { message: "Select a workspace mode" }),
});

const allowedPermissions = WORKSPACE_PERMISSIONS.map((permission) => permission.key);
export const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Use no more than 60 characters"),
  icon: z.enum(ROLE_ICON_KEYS, { message: "Choose a valid role icon" }).default("review"),
  color: z.string().regex(ROLE_COLOR_PATTERN, "Choose a valid role color").default(DEFAULT_ROLE_COLOR),
  permissions: z.array(z.enum(allowedPermissions)).default([]),
});

export const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password").max(128),
}).refine((value) => value.currentPassword !== value.newPassword, {
  path: ["newPassword"],
  message: "Choose a password different from your current password",
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "New passwords do not match",
});

export function getFieldErrors(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  return {
    data: null,
    errors: Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] || "form"), issue.message])),
  };
}

export const projectSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    clientName: optionalText(120),
    description: optionalText(),
    projectPlatform: z.string().trim().min(1).max(80),
    zohoProduct: optionalText(80),
    zohoProducts: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    moduleName: optionalText(120),
    projectTypes: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    assignedUserIds: z.array(z.string()).max(100).default([]),
    environment: z.string().trim().min(1).max(80),
    stage: z.string().trim().min(1).max(80),
    priority: z.enum(PRIORITIES).default("Medium"),
    startDate: optionalDate,
    dueDate: optionalDate,
    zohoUrl: z.union([z.url(), z.literal("")]).optional(),
    repositoryUrl: z.union([z.url(), z.literal("")]).optional(),
    notes: optionalText(20000),
    template: z.string().trim().max(80).optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.dueDate ||
      new Date(data.dueDate) >= new Date(data.startDate),
    { path: ["dueDate"], message: "Due date must be after the start date" },
  );

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(240),
  description: optionalText(),
  projectId: z.string().optional(),
  status: z.string().trim().min(1).max(80),
  priority: z.enum(PRIORITIES).default("Medium"),
  dueDate: optionalDate,
  estimatedMinutes: z.coerce.number().int().min(0).max(100000).default(0),
  actualMinutes: z.coerce.number().int().min(0).max(100000).default(0),
  functionName: optionalText(240),
  workflowName: optionalText(240),
  moduleApiName: optionalText(240),
  fieldApiNames: z.array(z.string().trim().min(1).max(240)).default([]),
  webhookEvent: optionalText(240),
  connectionName: optionalText(240),
  environment: z.string().trim().min(1).max(80),
  technicalNotes: optionalText(30000),
  blockerReason: optionalText(10000),
  testResult: optionalText(20000),
  deploymentStatus: z.enum(DEPLOYMENT_STATUSES).default("Not Started"),
  errorLogs: optionalText(50000),
  testPayload: optionalText(50000),
});

export const subtaskSchema = z.object({
  title: z.string().trim().min(2).max(240),
  description: optionalText(),
  status: z.string().trim().min(1).max(80),
  priority: z.enum(PRIORITIES).default("Medium"),
  dueDate: optionalDate,
});

export const taskCommentSchema = z.object({
  body: z.string().trim().min(1, "Enter a comment").max(5000),
});

export const statusSchema = z.object({ status: z.string().trim().min(1).max(80) });
export const stageSchema = z.object({ stage: z.string().trim().min(1).max(80) });
