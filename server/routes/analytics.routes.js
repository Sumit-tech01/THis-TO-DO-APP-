import { Router } from "express";
import { overview } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { resolveWorkspace } from "../middleware/workspace.middleware.js";

const router = Router();

router.use(authenticate);
router.use(resolveWorkspace);

router.get("/overview", overview);

export default router;

