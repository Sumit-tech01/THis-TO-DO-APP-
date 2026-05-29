import { Router } from "express";
import {
  createTask,
  deleteTask,
  getTasks,
  getTaskStats,
  updateTask,
} from "../controllers/task.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { resolveWorkspace, requireWorkspaceRole } from "../middleware/workspace.middleware.js";

const router = Router();

router.use(authenticate);
router.use(resolveWorkspace);

router.post("/", requireWorkspaceRole(["Owner", "Admin", "Member"]), createTask);
router.get("/stats", getTaskStats);
router.get("/", getTasks);
router.put("/:id", requireWorkspaceRole(["Owner", "Admin", "Member"]), updateTask);
router.patch("/:id", requireWorkspaceRole(["Owner", "Admin", "Member"]), updateTask);
router.delete("/:id", requireWorkspaceRole(["Owner", "Admin"]), deleteTask);

export default router;
