import mongoose from "mongoose";
import { TASK_PRIORITY_VALUES } from "../constants/task-priority.js";
import { TASK_STATUS, TASK_STATUS_VALUES } from "../constants/task-status.js";

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
      enum: TASK_PRIORITY_VALUES,
      default: "Normal",
      index: true,
    },
    status: {
      type: String,
      enum: TASK_STATUS_VALUES,
      default: TASK_STATUS.NOT_STARTED,
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
