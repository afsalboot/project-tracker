import mongoose from "mongoose";

const loginVerificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["signup"],
      required: true,
    },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, min: 0, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

loginVerificationSchema.index({ userId: 1, purpose: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.LoginVerification) {
  mongoose.deleteModel("LoginVerification");
}

export default mongoose.models.LoginVerification ||
  mongoose.model("LoginVerification", loginVerificationSchema);
