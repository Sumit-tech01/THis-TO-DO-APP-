import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { sanitizeQuery } from "./middleware/query-sanitize.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

export const createApp = () => {
  const app = express();

  app.locals.logger = logger;
  app.disable("x-powered-by");
  app.set("trust proxy", Number(env.TRUST_PROXY) || 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          imgSrc: ["'none'"],
          objectSrc: ["'none'"],
          connectSrc: ["'self'"],
        },
      },
      frameguard: { action: "deny" },
      hsts:
        env.NODE_ENV === "production"
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
      referrerPolicy: { policy: "no-referrer" },
    })
  );

  const allowedOrigin = env.FRONTEND_URL;

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === allowedOrigin) {
          return callback(null, true);
        }
        return callback({ statusCode: 403, message: "CORS origin denied" });
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests, please try again later." },
    })
  );

  app.use(requestId);
  app.use((req, res, next) => {
    const startedAt = Date.now();

    req.log = {
      info: (meta, message) => logger.info({ requestId: req.id, ...(meta || {}) }, message || "request-info"),
      warn: (meta, message) => logger.warn({ requestId: req.id, ...(meta || {}) }, message || "request-warn"),
      error: (meta, message) => logger.error({ requestId: req.id, ...(meta || {}) }, message || "request-error"),
    };

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const logMeta = {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      };

      if (res.statusCode >= 500) {
        logger.error(logMeta, "request-completed");
      } else if (res.statusCode >= 400) {
        logger.warn(logMeta, "request-completed");
      } else {
        logger.info(logMeta, "request-completed");
      }
    });

    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(sanitizeQuery);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", async (_req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ status: "not-ready", reason: "database-disconnected" });
    }

    try {
      await mongoose.connection.db.admin().command({ ping: 1 });
      return res.status(200).json({ status: "ready" });
    } catch {
      return res.status(503).json({ status: "not-ready", reason: "database-ping-failed" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
