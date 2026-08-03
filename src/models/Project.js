import mongoose from "mongoose";
import { PRIORITIES } from "@/constants/project";

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    assignedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    clientName: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    projectPlatform: { type: String, trim: true, default: "General Project" },
    zohoProduct: { type: String, trim: true, default: "" },
    zohoProducts: [{ type: String, trim: true }],
    moduleName: { type: String, default: "" },
    projectTypes: [{ type: String, trim: true }],
    environment: { type: String, trim: true, default: "Not Applicable" },
    stage: { type: String, trim: true, default: "Not Started" },
    priority: { type: String, enum: PRIORITIES, default: "Medium" },
    startDate: Date,
    dueDate: Date,
    completedDate: Date,
    progress: { type: Number, min: 0, max: 100, default: 0 },
    zohoUrl: { type: String, default: "" },
    repositoryUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

projectSchema.index({ userId: 1, slug: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1, isArchived: 1, updatedAt: -1 });
projectSchema.index({ userId: 1, isArchived: 1, updatedAt: -1 });
projectSchema.index({ userId: 1, stage: 1, dueDate: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Project) {
  mongoose.deleteModel("Project");
}

export default mongoose.models.Project || mongoose.model("Project", projectSchema);
