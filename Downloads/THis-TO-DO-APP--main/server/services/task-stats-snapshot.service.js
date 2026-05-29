import { MemoryTtlCache } from "../utils/memory-cache.js";

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const snapshotCache = new MemoryTtlCache(SNAPSHOT_TTL_MS);

const getSnapshotKey = ({ userId, workspaceId, query }) =>
  `task-stats-snapshot:${workspaceId}:${userId}:${JSON.stringify(query || {})}`;

export const getTaskStatsSnapshot = ({ userId, workspaceId, query }) =>
  snapshotCache.get(getSnapshotKey({ userId, workspaceId, query })) || null;

export const saveTaskStatsSnapshot = ({ userId, workspaceId, query, summary }) => {
  snapshotCache.set(getSnapshotKey({ userId, workspaceId, query }), summary, SNAPSHOT_TTL_MS);
};

export const invalidateTaskStatsSnapshot = ({ userId, workspaceId }) => {
  snapshotCache.clearByPrefix(`task-stats-snapshot:${workspaceId}:${userId}:`);
};
