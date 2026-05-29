import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import User from "../models/User.js";
import { hydrateWorkspaceForUser } from "../services/workspace.service.js";

let io = null;
let socketLibrary = null;

const ACCESS_TOKEN_ALGORITHM = "HS256";

const getAccessToken = (socket) => {
  const fromAuth = socket.handshake?.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.trim()) {
    return fromAuth.trim();
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
};

const resolveTokenVersion = (userLike) =>
  Number.isInteger(userLike?.tokenVersion) ? userLike.tokenVersion : 0;

const normalizeOrigins = (originsCsv) =>
  String(originsCsv || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const initSocketServer = (httpServer) => {
  if (io) {
    return io;
  }

  if (!socketLibrary) {
    try {
      socketLibrary = new Function("m", "return import(m)")("socket.io");
    } catch {
      socketLibrary = Promise.resolve(null);
    }
  }

  io = {
    to: () => ({
      emit: () => {},
    }),
    close: async () => {},
  };

  socketLibrary
    .then((module) => {
      const SocketServer = module?.Server;
      if (!SocketServer) {
        logger.warn("socket-io package unavailable; realtime events are disabled");
        return;
      }

      const allowedOrigins = normalizeOrigins(env.CORS_ORIGIN);
      const serverInstance = new SocketServer(httpServer, {
        cors: {
          origin: allowedOrigins,
          credentials: true,
        },
      });

      serverInstance.use(async (socket, next) => {
        try {
          const token = getAccessToken(socket);
          if (!token) {
            return next(new Error("Authentication required"));
          }

          const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
            algorithms: [ACCESS_TOKEN_ALGORITHM],
          });

          if (!payload?.id || !payload?.role || payload.tokenVersion === undefined) {
            return next(new Error("Invalid token payload"));
          }

          const user = await User.findById(payload.id).select("role tokenVersion defaultWorkspaceId");
          if (!user) {
            return next(new Error("User not found"));
          }

          const tokenVersion = resolveTokenVersion(user);
          if (user.role !== payload.role || tokenVersion !== payload.tokenVersion) {
            return next(new Error("Session is no longer valid"));
          }

          const workspace = await hydrateWorkspaceForUser(
            user._id.toString(),
            socket.handshake?.auth?.workspaceId
          );

          socket.data.auth = {
            userId: user._id.toString(),
            role: user.role,
            tokenVersion,
            workspaceId: workspace?.id || null,
          };

          return next();
        } catch {
          return next(new Error("Invalid or expired access token"));
        }
      });

      serverInstance.on("connection", (socket) => {
        const auth = socket.data.auth || {};
        if (auth.userId) {
          socket.join(`user:${auth.userId}`);
        }
        if (auth.workspaceId) {
          socket.join(`workspace:${auth.workspaceId}`);
        }
      });

      io = serverInstance;
      logger.info("Realtime socket layer initialized");
    })
    .catch((error) => {
      logger.warn({ err: error }, "Failed to initialize realtime socket layer");
    });

  return io;
};

export const getSocketServer = () => io;

export const closeSocketServer = async () => {
  if (!io) {
    return;
  }

  await io.close();
  io = null;
};

export const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) {
    return;
  }
  io.to(`user:${userId}`).emit(eventName, payload);
};

export const emitToWorkspace = (workspaceId, eventName, payload) => {
  if (!io || !workspaceId) {
    return;
  }
  io.to(`workspace:${workspaceId}`).emit(eventName, payload);
};

/* Legacy static implementation retained here for clarity of behavior:
   the dynamic initialization above ensures startup remains resilient when
   optional dependencies are unavailable in restricted environments. */
/*
  const allowedOrigins = normalizeOrigins(env.CORS_ORIGIN);
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = getAccessToken(socket);
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        algorithms: [ACCESS_TOKEN_ALGORITHM],
      });

      if (!payload?.id || !payload?.role || payload.tokenVersion === undefined) {
        return next(new Error("Invalid token payload"));
      }

      const user = await User.findById(payload.id).select("role tokenVersion defaultWorkspaceId");
      if (!user) {
        return next(new Error("User not found"));
      }

      const tokenVersion = resolveTokenVersion(user);
      if (user.role !== payload.role || tokenVersion !== payload.tokenVersion) {
        return next(new Error("Session is no longer valid"));
      }

      const workspace = await hydrateWorkspaceForUser(
        user._id.toString(),
        socket.handshake?.auth?.workspaceId
      );

      socket.data.auth = {
        userId: user._id.toString(),
        role: user.role,
        tokenVersion,
        workspaceId: workspace?.id || null,
      };

      return next();
    } catch {
      return next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth || {};
    if (auth.userId) {
      socket.join(`user:${auth.userId}`);
    }
    if (auth.workspaceId) {
      socket.join(`workspace:${auth.workspaceId}`);
    }
  });

  return io;
};
*/
