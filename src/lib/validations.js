import { z } from "zod";
import {
  PRIORITIES,
} from "@/constants/project";
import { DEPLOYMENT_STATUSES } from "@/constants/task";

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
  name: z.string().trim().min(2).max(80),
  username: usernameSchema.or(z.literal("")),
  email: z.string().trim().toLowerCase().email(),
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
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required").max(128),
});

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
