import mongoose from "mongoose";
import { DEFAULT_WORKSPACE_ROLES } from "@/constants/permissions";
import { ROLE_ICON_KEYS } from "@/constants/roles";

const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    icon: { type: String, enum: ROLE_ICON_KEYS, default: "review" },
    color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#047857" },
    permissions: [{ type: String, trim: true }],
    isSystem: { type: Boolean, default: false },
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["personal", "organization", "team"],
      default: "personal",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    roles: {
      type: [roleSchema],
      default: () => DEFAULT_WORKSPACE_ROLES.map((role) => ({ ...role })),
    },
    highlightedRoleKeys: {
      type: [String],
      default: () => ["owner", "admin"],
    },
    allocationRoleKeys: {
      type: [String],
      default: () => ["owner", "admin"],
    },
    customization: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    sidebarTheme: {
      type: String,
      enum: ["forest", "midnight", "ocean", "plum", "graphite"],
      default: "forest",
    },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Workspace) {
  mongoose.deleteModel("Workspace");
}

export default mongoose.models.Workspace ||
  mongoose.model("Workspace", workspaceSchema);
