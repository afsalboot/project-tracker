import mongoose from "mongoose";
import { PRIORITIES } from "@/constants/project";
import { DEPLOYMENT_STATUSES } from "@/constants/task";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, trim: true, default: "To Do" },
    priority: { type: String, enum: PRIORITIES, default: "Medium" },
    dueDate: Date,
    completedDate: Date,
    estimatedMinutes: { type: Number, min: 0, default: 0 },
    actualMinutes: { type: Number, min: 0, default: 0 },
    functionName: { type: String, default: "" },
    workflowName: { type: String, default: "" },
    moduleApiName: { type: String, default: "" },
    fieldApiNames: [{ type: String }],
    webhookEvent: { type: String, default: "" },
    connectionName: { type: String, default: "" },
    environment: { type: String, trim: true, default: "Not Applicable" },
    technicalNotes: { type: String, default: "" },
    blockerReason: { type: String, default: "" },
    testResult: { type: String, default: "" },
    deploymentStatus: { type: String, enum: DEPLOYMENT_STATUSES, default: "Not Started" },
    errorLogs: { type: String, default: "" },
    testPayload: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ projectId: 1, sortOrder: 1, createdAt: 1 });
taskSchema.index({ workspaceId: 1, parentTaskId: 1, createdAt: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Task) {
  mongoose.deleteModel("Task");
}

export default mongoose.models.Task || mongoose.model("Task", taskSchema);
