import { z } from "zod";
import {
  ENVIRONMENTS,
  PRIORITIES,
  PROJECT_STAGES,
  ZOHO_PRODUCTS,
} from "@/constants/project";
import { DEPLOYMENT_STATUSES, TASK_STATUSES } from "@/constants/task";

const optionalText = (max = 10000) =>
  z.string().trim().max(max).optional().or(z.literal(""));
const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const strongPasswordSchema = z.string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

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

export const loginCodeSchema = z.object({
  challengeId: z.uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code"),
});

export const resendLoginCodeSchema = z.object({
  challengeId: z.uuid(),
});

export const projectSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    clientName: optionalText(120),
    description: optionalText(),
    zohoProduct: z.enum(ZOHO_PRODUCTS),
    moduleName: optionalText(120),
    projectTypes: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    assignedUserIds: z.array(z.string()).max(100).default([]),
    environment: z.enum(ENVIRONMENTS).default("Not Applicable"),
    stage: z.enum(PROJECT_STAGES).default("Not Started"),
    priority: z.enum(PRIORITIES).default("Medium"),
    startDate: optionalDate,
    dueDate: optionalDate,
    zohoUrl: z.union([z.url(), z.literal("")]).optional(),
    repositoryUrl: z.union([z.url(), z.literal("")]).optional(),
    notes: optionalText(20000),
    template: z.enum(["", "workflow", "webhook", "blueprint"]).optional(),
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
  status: z.enum(TASK_STATUSES).default("To Do"),
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
  environment: z.enum(ENVIRONMENTS).default("Not Applicable"),
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
  status: z.enum(TASK_STATUSES).default("To Do"),
  priority: z.enum(PRIORITIES).default("Medium"),
  dueDate: optionalDate,
});

export const taskCommentSchema = z.object({
  body: z.string().trim().min(1, "Enter a comment").max(5000),
});

export const statusSchema = z.object({ status: z.enum(TASK_STATUSES) });
export const stageSchema = z.object({ stage: z.enum(PROJECT_STAGES) });
