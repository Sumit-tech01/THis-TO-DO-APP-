import Activity from "../models/Activity.js";
import { emitToUser, emitToWorkspace } from "../realtime/socket.js";

const toPublicActivity = (activityDoc) => ({
  id: activityDoc._id.toString(),
  type: activityDoc.type,
  metadata: activityDoc.metadata || {},
  workspaceId: activityDoc.workspaceId.toString(),
  userId: activityDoc.userId.toString(),
  createdAt: activityDoc.createdAt,
});

export const recordActivity = async ({ workspaceId, userId, type, metadata = {} }) => {
  if (!workspaceId || !userId || !type) {
    return null;
  }

  const activity = await Activity.create({
    workspaceId,
    userId,
    type,
    metadata,
  });

  const payload = toPublicActivity(activity);
  emitToUser(userId.toString(), "ACTIVITY_CREATED", payload);
  emitToWorkspace(workspaceId.toString(), "ACTIVITY_CREATED", payload);

  return payload;
};

