import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    action: { type: String, required: true },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ userId: 1, projectId: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Activity) {
  mongoose.deleteModel("Activity");
}

export default mongoose.models.Activity || mongoose.model("Activity", activitySchema);
