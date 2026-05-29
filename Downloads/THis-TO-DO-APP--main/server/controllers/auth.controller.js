import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { emitToUser } from "../realtime/socket.js";
import { recordActivity } from "../services/activity.service.js";
import { ensureUserDefaultWorkspace, hydrateWorkspaceForUser } from "../services/workspace.service.js";
import { sendEmail } from "../utils/email.js";

const ACCESS_TOKEN_ALGORITHM = "HS256";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const REFRESH_TOKEN_COOKIE_PATH = "/api/auth/refresh";
const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const LOGIN_LOCK_MS = env.LOGIN_LOCK_MINUTES * 60 * 1000;

const parseDurationToMs = (value, fallbackMs) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d+)([smhd])$/i);

  if (match) {
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const unitToMs = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * unitToMs[unit];
  }

  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10) * 1000;
  }

  return fallbackMs;
};

const REFRESH_TOKEN_TTL_MS = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  defaultWorkspaceId: user.defaultWorkspaceId || null,
  tokenVersion: resolveTokenVersion(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const isStrongPassword = (password) => STRONG_PASSWORD_REGEX.test(password);
const resolveTokenVersion = (userLike) =>
  Number.isInteger(userLike?.tokenVersion) ? userLike.tokenVersion : 0;

const resolveDeviceName = (req) => {
  const explicitDeviceName = req.headers["x-device-name"];
  if (typeof explicitDeviceName === "string" && explicitDeviceName.trim()) {
    return explicitDeviceName.trim().slice(0, 120);
  }

  const ua = String(req.headers["user-agent"] || "").trim();
  if (!ua) {
    return "Unknown device";
  }

  return ua.slice(0, 120);
};

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: REFRESH_TOKEN_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_MS,
});

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
};

const getCookieValue = (cookieHeader, cookieName) => {
  if (!cookieHeader) {
    return null;
  }

  const parts = String(cookieHeader)
    .split(";")
    .map((part) => part.trim());
  const matched = parts.find((part) => part.startsWith(`${cookieName}=`));

  if (!matched) {
    return null;
  }

  const rawValue = matched.slice(cookieName.length + 1);
  return decodeURIComponent(rawValue);
};

const getRefreshTokenFromRequest = (req) =>
  getCookieValue(req.headers.cookie, REFRESH_TOKEN_COOKIE_NAME) ||
  req.body?.refreshToken ||
  null;

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: resolveTokenVersion(user) },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: ACCESS_TOKEN_ALGORITHM,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }
  );

const signRefreshToken = (user, { jti, familyId }) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: resolveTokenVersion(user),
      jti,
      familyId,
    },
    env.JWT_REFRESH_SECRET,
    {
      algorithm: ACCESS_TOKEN_ALGORITHM,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );

const isRefreshPayloadValid = (payload) =>
  payload &&
  typeof payload === "object" &&
  typeof payload.id === "string" &&
  typeof payload.role === "string" &&
  payload.tokenVersion !== undefined &&
  typeof payload.jti === "string" &&
  typeof payload.familyId === "string";

const revokeTokenFamily = async (userId, familyId, reason) => {
  if (!userId || !familyId) {
    return;
  }

  await RefreshToken.updateMany(
    { userId, familyId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );
};

const revokeAllUserRefreshTokens = async (userId, reason) => {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );
};

const issueRefreshToken = async (user, req, familyId) => {
  const tokenFamilyId = familyId || crypto.randomUUID();
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, { jti, familyId: tokenFamilyId });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    familyId: tokenFamilyId,
    jti,
    hashedToken: tokenHash,
    expiresAt,
    ipAddress: req.ip || null,
    userAgent: req.headers["user-agent"] || null,
    deviceName: resolveDeviceName(req),
  });

  return {
    token: refreshToken,
    jti,
    familyId: tokenFamilyId,
  };
};

const lockMessage = `Account temporarily locked due to failed login attempts. Try again in ${env.LOGIN_LOCK_MINUTES} minutes.`;

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next({ statusCode: 400, message: "name, email and password are required" });
    }

    if (!isStrongPassword(password)) {
      return next({
        statusCode: 400,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return next({ statusCode: 409, message: "Email already registered" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "Member",
    });
    await ensureUserDefaultWorkspace(user);

    const refreshToken = await issueRefreshToken(user, req);
    setRefreshTokenCookie(res, refreshToken.token);

    return res.status(201).json({
      message: "Registration successful",
      user: sanitizeUser(user),
      tokens: {
        accessToken: signAccessToken(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next({ statusCode: 400, message: "email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +failedLoginAttempts +lockUntil +tokenVersion"
    );

    if (!user) {
      return next({ statusCode: 401, message: "Invalid email or password" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return next({ statusCode: 423, message: lockMessage });
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;

      if (failedAttempts >= env.MAX_LOGIN_ATTEMPTS) {
        user.failedLoginAttempts = 0;
        user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MS);
        await user.save();
        return next({ statusCode: 423, message: lockMessage });
      }

      user.failedLoginAttempts = failedAttempts;
      await user.save();
      return next({ statusCode: 401, message: "Invalid email or password" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.tokenVersion = resolveTokenVersion(user);
    await ensureUserDefaultWorkspace(user);
    await user.save();

    const refreshToken = await issueRefreshToken(user, req);
    setRefreshTokenCookie(res, refreshToken.token);
    emitToUser(user._id.toString(), "USER_LOGGED_IN", {
      userId: user._id.toString(),
      emittedAt: new Date().toISOString(),
    });

    const workspace = await hydrateWorkspaceForUser(user._id.toString());
    if (workspace?.id) {
      await recordActivity({
        workspaceId: workspace.id,
        userId: user._id.toString(),
        type: "USER_LOGGED_IN",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: sanitizeUser(user),
      tokens: {
        accessToken: signAccessToken(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("name email role tokenVersion defaultWorkspaceId createdAt updatedAt");

    if (!user) {
      return next({ statusCode: 401, message: "Authentication required" });
    }

    await ensureUserDefaultWorkspace(user);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const incomingRefreshToken = getRefreshTokenFromRequest(req);

    if (!incomingRefreshToken) {
      return next({ statusCode: 401, message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET, {
        algorithms: [ACCESS_TOKEN_ALGORITHM],
      });
    } catch {
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Invalid or expired refresh token" });
    }

    if (!isRefreshPayloadValid(decoded)) {
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Invalid refresh token payload" });
    }

    const user = await User.findById(decoded.id).select("+tokenVersion role");
    if (!user) {
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Refresh token is invalid" });
    }

    const userTokenVersion = resolveTokenVersion(user);

    if (userTokenVersion !== decoded.tokenVersion || user.role !== decoded.role) {
      await revokeTokenFamily(user._id, decoded.familyId, "token-version-mismatch");
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Session is no longer valid" });
    }

    const storedToken = await RefreshToken.findOne({
      userId: user._id,
      jti: decoded.jti,
    }).select("+hashedToken");

    if (!storedToken) {
      await revokeTokenFamily(user._id, decoded.familyId, "refresh-reuse-detected");
      user.tokenVersion = userTokenVersion + 1;
      await user.save();
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Session invalidated. Please login again." });
    }

    const hashedIncomingToken = hashToken(incomingRefreshToken);
    const tokenExpired = storedToken.expiresAt <= new Date();

    if (storedToken.revokedAt || storedToken.hashedToken !== hashedIncomingToken) {
      await revokeTokenFamily(user._id, decoded.familyId, "refresh-reuse-detected");
      user.tokenVersion = userTokenVersion + 1;
      await user.save();
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Session invalidated. Please login again." });
    }

    if (tokenExpired) {
      storedToken.revokedAt = new Date();
      storedToken.revokedReason = "expired";
      await storedToken.save();
      clearRefreshTokenCookie(res);
      return next({ statusCode: 401, message: "Refresh token expired. Please login again." });
    }

    const rotatedToken = await issueRefreshToken(user, req, decoded.familyId);

    storedToken.revokedAt = new Date();
    storedToken.revokedReason = "rotated";
    storedToken.replacedByToken = rotatedToken.jti;
    await storedToken.save();

    setRefreshTokenCookie(res, rotatedToken.token);

    return res.status(200).json({
      message: "Token refreshed",
      tokens: {
        accessToken: signAccessToken(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next({ statusCode: 400, message: "email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetBaseUrl = env.FRONTEND_URL.replace(/\/$/, "");
    const resetUrl = `${resetBaseUrl}/reset-password/${resetToken}`;
    const subject = "Reset Your Password";

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px;background:linear-gradient(135deg,#059669,#0369a1);color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(env.APP_NAME)}</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:.95;">Security Notification</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 10px;">
                <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Reset Your Password</h2>
                <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#334155;">
                  We received a request to reset your account password. Click the button below to continue.
                </p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#b91c1c;">
                  This link expires in 15 minutes.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
                  <tr>
                    <td style="border-radius:10px;background:#059669;">
                      <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px;font-size:13px;color:#475569;">
                  If the button does not work, copy and paste this link:
                </p>
                <p style="margin:0 0 18px;font-size:12px;line-height:1.6;word-break:break-all;color:#0369a1;">
                  ${escapeHtml(resetUrl)}
                </p>
                <p style="margin:0;font-size:12px;color:#64748b;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 22px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                ${escapeHtml(env.APP_NAME)} · Automated message, please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    try {
      await sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (emailError) {
      logger.error({ err: emailError, userId: user._id.toString() }, "Forgot-password email delivery failed");
    }

    return res.status(200).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next({ statusCode: 400, message: "token and password are required" });
    }

    if (!isStrongPassword(password)) {
      return next({
        statusCode: 400,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires +refreshTokenHash +tokenVersion");

    if (!user) {
      return next({ statusCode: 400, message: "Invalid or expired token." });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.tokenVersion = resolveTokenVersion(user) + 1;
    await user.save();

    await revokeAllUserRefreshTokens(user._id, "password-reset");
    clearRefreshTokenCookie(res);

    return res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    const workspace = await hydrateWorkspaceForUser(req.user.id);

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
          algorithms: [ACCESS_TOKEN_ALGORITHM],
        });

        if (isRefreshPayloadValid(decoded) && decoded.id === req.user.id) {
          await RefreshToken.updateOne(
            { userId: req.user.id, jti: decoded.jti, revokedAt: null },
            {
              $set: {
                revokedAt: new Date(),
                revokedReason: "logout",
              },
            }
          );
        }
      } catch {
        // Ignore invalid refresh token on logout.
      }
    }

    clearRefreshTokenCookie(res);

    emitToUser(req.user.id, "USER_LOGGED_OUT", {
      userId: req.user.id,
      emittedAt: new Date().toISOString(),
    });
    if (workspace?.id) {
      await recordActivity({
        workspaceId: workspace.id,
        userId: req.user.id,
        type: "USER_LOGGED_OUT",
      });
    }

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return next(error);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 },
      $set: {
        refreshTokenHash: null,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    await revokeAllUserRefreshTokens(req.user.id, "logout-all");
    clearRefreshTokenCookie(res);

    const workspace = await hydrateWorkspaceForUser(req.user.id);
    emitToUser(req.user.id, "USER_LOGGED_OUT", {
      userId: req.user.id,
      emittedAt: new Date().toISOString(),
      reason: "logout-all",
    });
    if (workspace?.id) {
      await recordActivity({
        workspaceId: workspace.id,
        userId: req.user.id,
        type: "USER_LOGGED_OUT",
        metadata: { reason: "logout-all" },
      });
    }

    return res.status(200).json({ message: "Logged out from all devices" });
  } catch (error) {
    return next(error);
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const sessions = await RefreshToken.find({
      userId: req.user.id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("jti createdAt expiresAt ipAddress userAgent deviceName familyId");

    return res.status(200).json({
      data: sessions.map((session) => ({
        id: session._id.toString(),
        jti: session.jti,
        familyId: session.familyId,
        ipAddress: session.ipAddress || null,
        userAgent: session.userAgent || null,
        deviceName: session.deviceName || null,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await RefreshToken.findOneAndUpdate(
      {
        _id: sessionId,
        userId: req.user.id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: "manual-revoke",
        },
      },
      { new: true }
    );

    if (!session) {
      return next({ statusCode: 404, message: "Session not found" });
    }

    return res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    return next(error);
  }
};
