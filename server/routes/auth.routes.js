import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPassword,
  login,
  listSessions,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  revokeSession,
  resetPassword,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const authLimiterConfig = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
};

const registerLimiter = rateLimit({
  ...authLimiterConfig,
  max: 5,
  message: {
    message: "Too many registration attempts. Please try again in 15 minutes.",
  },
});

const loginLimiter = rateLimit({
  ...authLimiterConfig,
  max: 5,
  message: {
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const refreshLimiter = rateLimit({
  ...authLimiterConfig,
  max: 10,
  message: {
    message: "Too many token refresh attempts. Please try again in 15 minutes.",
  },
});

const forgotPasswordLimiter = rateLimit({
  ...authLimiterConfig,
  max: 5,
  message: {
    message: "Too many password reset requests. Please try again in 15 minutes.",
  },
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/sessions", authenticate, listSessions);
router.delete("/sessions/:sessionId", authenticate, revokeSession);

export default router;
