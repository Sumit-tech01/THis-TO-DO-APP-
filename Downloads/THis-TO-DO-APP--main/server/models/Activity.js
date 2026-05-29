import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "USER_LOGGED_IN",
        "USER_LOGGED_OUT",
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_COMPLETED",
        "TASK_DELETED",
      ],
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;

