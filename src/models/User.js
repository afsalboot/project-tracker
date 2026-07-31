import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    emailVerificationRequired: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    role: { type: String, trim: true, maxlength: 64, default: "member" },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    sessionVersion: { type: Number, min: 0, default: 0, select: false },
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
