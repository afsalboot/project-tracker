import mongoose from "mongoose";

const taskCommentSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mentionedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskCommentSchema.index({ workspaceId: 1, taskId: 1, createdAt: 1 });
taskCommentSchema.index({ workspaceId: 1, projectId: 1 });
taskCommentSchema.index({ workspaceId: 1, mentionedUserIds: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.TaskComment) {
  mongoose.deleteModel("TaskComment");
}

export default mongoose.models.TaskComment ||
  mongoose.model("TaskComment", taskCommentSchema);
