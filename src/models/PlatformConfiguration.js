import mongoose from "mongoose";

const platformConfigurationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "platform",
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.PlatformConfiguration) {
  mongoose.deleteModel("PlatformConfiguration");
}

export default mongoose.models.PlatformConfiguration ||
  mongoose.model("PlatformConfiguration", platformConfigurationSchema);
