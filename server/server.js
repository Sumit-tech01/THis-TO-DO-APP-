import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeSocketServer, initSocketServer } from "./realtime/socket.js";

let httpServer = null;

const startServer = async () => {
  await connectDB(env.MONGODB_URI);

  const app = createApp();
  httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server running");
  });
};

const shutdown = async (signal) => {
  logger.info({ signal }, "Graceful shutdown started");

  try {
    await closeSocketServer();
  } catch (error) {
    logger.error({ err: error }, "Failed to close socket server");
  }

  if (httpServer) {
    await new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
  }

  try {
    await mongoose.connection.close(false);
  } catch (error) {
    logger.error({ err: error }, "Failed to close MongoDB connection");
  }

  logger.info("Shutdown complete");
  process.exit(0);
};

startServer().catch((error) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});
