import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._-]+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, trim: true, maxlength: 64, default: "member" },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    sessionVersion: { type: Number, min: 0, default: 0, select: false },
    notificationReadAt: { type: Date, default: null },
    notificationClearedAt: { type: Date, default: null },
    dismissedNotificationIds: [{ type: String, trim: true, maxlength: 200 }],
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, value) {
        delete value.password;
        delete value.sessionVersion;
        return value;
      },
    },
    toObject: {
      transform(_document, value) {
        delete value.password;
        delete value.sessionVersion;
        return value;
      },
    },
  },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  mongoose.deleteModel("User");
}

export default mongoose.models.User || mongoose.model("User", userSchema);
