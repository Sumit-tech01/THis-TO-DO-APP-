import mongoose from "mongoose";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";

const buildPersonalWorkspaceName = (userName) =>
  `${String(userName || "My").trim() || "My"} Workspace`;

export const ensureUserDefaultWorkspace = async (user) => {
  if (!user) {
    return null;
  }

  if (user.defaultWorkspaceId && mongoose.Types.ObjectId.isValid(user.defaultWorkspaceId)) {
    const workspace = await Workspace.findOne({
      _id: user.defaultWorkspaceId,
      "members.userId": user._id,
    });

    if (workspace) {
      return workspace;
    }
  }

  const fallbackWorkspace = await Workspace.findOne({
    "members.userId": user._id,
  }).sort({ createdAt: 1 });

  if (fallbackWorkspace) {
    if (!user.defaultWorkspaceId || !fallbackWorkspace._id.equals(user.defaultWorkspaceId)) {
      user.defaultWorkspaceId = fallbackWorkspace._id;
      await user.save();
    }
    return fallbackWorkspace;
  }

  const workspace = await Workspace.create({
    name: buildPersonalWorkspaceName(user.name),
    ownerId: user._id,
    members: [{ userId: user._id, role: "Owner" }],
  });

  user.defaultWorkspaceId = workspace._id;
  await user.save();

  return workspace;
};

export const resolveWorkspaceContext = async ({ userId, fallbackWorkspaceId, requestedWorkspaceId }) => {
  const candidateWorkspaceId = requestedWorkspaceId || fallbackWorkspaceId || null;

  if (!candidateWorkspaceId || !mongoose.Types.ObjectId.isValid(candidateWorkspaceId)) {
    return null;
  }

  const workspace = await Workspace.findOne({
    _id: candidateWorkspaceId,
    "members.userId": userId,
  }).select("name ownerId members");

  if (!workspace) {
    return null;
  }

  const member = workspace.members.find((entry) => entry.userId.toString() === userId.toString());
  const role = member?.role || (workspace.ownerId.toString() === userId.toString() ? "Owner" : "Member");

  return {
    id: workspace._id.toString(),
    role,
    name: workspace.name,
  };
};

export const hydrateWorkspaceForUser = async (userId, requestedWorkspaceId) => {
  const user = await User.findById(userId).select("name defaultWorkspaceId");
  if (!user) {
    return null;
  }

  await ensureUserDefaultWorkspace(user);

  return resolveWorkspaceContext({
    userId: user._id.toString(),
    fallbackWorkspaceId: user.defaultWorkspaceId?.toString() || null,
    requestedWorkspaceId,
  });
};

