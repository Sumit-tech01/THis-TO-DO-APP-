import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    priority: {
      type: String,
      enum: ["High", "Normal", "Low"],
      default: "Normal",
      index: true,
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "On Hold", "Deferred", "Completed"],
      default: "Not Started",
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    deferredDate: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ workspaceId: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
