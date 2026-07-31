import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    context: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feedbackSchema.index({ status: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Feedback) {
  mongoose.deleteModel("Feedback");
}

export default mongoose.models.Feedback ||
  mongoose.model("Feedback", feedbackSchema);
