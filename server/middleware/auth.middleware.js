import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";

const ACCESS_TOKEN_ALGORITHM = "HS256";
const resolveTokenVersion = (userLike) =>
  Number.isInteger(userLike?.tokenVersion) ? userLike.tokenVersion : 0;

export const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next({ statusCode: 401, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    });

    if (!decoded?.id || !decoded?.role || decoded?.tokenVersion === undefined) {
      return next({ statusCode: 401, message: "Invalid access token payload" });
    }

    const user = await User.findById(decoded.id).select("role tokenVersion");

    if (!user) {
      return next({ statusCode: 401, message: "Authentication required" });
    }

    if (user.role !== decoded.role || resolveTokenVersion(user) !== decoded.tokenVersion) {
      return next({ statusCode: 401, message: "Session is no longer valid" });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: resolveTokenVersion(user),
    };

    return next();
  } catch {
    return next({ statusCode: 401, message: "Invalid or expired access token" });
  }
};
