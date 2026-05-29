import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["Owner", "Admin", "Member", "Viewer"],
      default: "Member",
    },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [workspaceMemberSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Workspace must have at least one member.",
      },
    },
  },
  { timestamps: true }
);

workspaceSchema.index({ ownerId: 1, createdAt: -1 });
workspaceSchema.index({ "members.userId": 1, createdAt: -1 });

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;

