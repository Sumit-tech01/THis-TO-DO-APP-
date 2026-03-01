import { hydrateWorkspaceForUser } from "../services/workspace.service.js";

const normalizeWorkspaceId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

export const resolveWorkspace = async (req, _res, next) => {
  try {
    const requestedWorkspaceId =
      normalizeWorkspaceId(req.headers["x-workspace-id"]) ||
      normalizeWorkspaceId(req.query.workspaceId);

    const workspace = await hydrateWorkspaceForUser(req.user.id, requestedWorkspaceId);

    if (!workspace) {
      return next({ statusCode: 403, message: "Workspace access denied" });
    }

    req.workspace = workspace;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireWorkspaceRole = (allowedRoles) => (req, _res, next) => {
  const currentRole = req.workspace?.role;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return next({ statusCode: 403, message: "Insufficient workspace permissions" });
  }

  return next();
};

