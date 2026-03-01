import { aggregateTasks } from "../repositories/task.repository.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { MemoryTtlCache } from "../utils/memory-cache.js";

const ANALYTICS_TTL_MS = 30_000;
const analyticsCache = new MemoryTtlCache(ANALYTICS_TTL_MS);
const shouldUseMemoryCache = env.NODE_ENV !== "production";
const analyticsDirtyUntil = new Map();
const ANALYTICS_DIRTY_MS = 45_000;

const getAnalyticsCacheKey = ({ userId, workspaceId, query }) =>
  `analytics:${workspaceId}:${userId}:${JSON.stringify(query || {})}`;

const stdDeviation = (values) => {
  if (!values.length) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const buildWeeklyWindow = (weeks = 10) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  return Array.from({ length: weeks }).map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - (weeks - 1 - index) * 7);
    return {
      key: date.toISOString(),
      label: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    };
  });
};

export const invalidateAnalyticsCache = ({ userId, workspaceId }) => {
  const dirtyKey = `${workspaceId}:${userId}`;
  analyticsDirtyUntil.set(dirtyKey, Date.now() + ANALYTICS_DIRTY_MS);
  logger.info(
    {
      userId,
      workspaceId,
      dirtyForMs: ANALYTICS_DIRTY_MS,
      cacheLayer: shouldUseMemoryCache ? "memory" : "disabled",
    },
    "analytics-cache-invalidated"
  );
  if (!shouldUseMemoryCache) {
    return;
  }
  analyticsCache.clearByPrefix(`analytics:${workspaceId}:${userId}:`);
};

const isAnalyticsDirty = ({ userId, workspaceId }) => {
  const key = `${workspaceId}:${userId}`;
  const until = analyticsDirtyUntil.get(key);
  if (!until) {
    return false;
  }
  if (until <= Date.now()) {
    analyticsDirtyUntil.delete(key);
    return false;
  }
  return true;
};

export const getAnalyticsOverview = async ({ userId, workspaceId, filters, query }) => {
  const cacheKey = getAnalyticsCacheKey({ userId, workspaceId, query });
  const analyticsMarkedDirty = isAnalyticsDirty({ userId, workspaceId });
  const cached = shouldUseMemoryCache && !analyticsMarkedDirty ? analyticsCache.get(cacheKey) : null;
  if (cached && !analyticsMarkedDirty) {
    logger.debug(
      {
        userId,
        workspaceId,
      },
      "analytics-cache-hit"
    );
    return cached;
  }

  const now = new Date();

  const [result = {}] = await aggregateTasks([
    { $match: filters },
    {
      $facet: {
        weeklyVelocity: [
          { $match: { completedAt: { $type: "date" } } },
          {
            $project: {
              weekStart: { $dateTrunc: { date: "$completedAt", unit: "week" } },
            },
          },
          {
            $group: {
              _id: "$weekStart",
              completed: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        averageCompletionByPriority: [
          {
            $match: {
              completedAt: { $type: "date" },
              createdAt: { $type: "date" },
            },
          },
          {
            $project: {
              priority: "$priority",
              durationHours: {
                $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 3_600_000],
              },
            },
          },
          {
            $group: {
              _id: "$priority",
              avgHours: { $avg: "$durationHours" },
            },
          },
        ],
        overdueOpen: [
          {
            $match: {
              status: { $ne: "Completed" },
              dueDate: { $type: "date", $lt: now },
            },
          },
          { $count: "count" },
        ],
        openTotals: [
          { $match: { status: { $ne: "Completed" } } },
          { $count: "count" },
        ],
        inProgressOpen: [
          { $match: { status: "In Progress" } },
          { $count: "count" },
        ],
        agingDistribution: [
          { $match: { status: { $ne: "Completed" } } },
          {
            $project: {
              ageDays: {
                $divide: [{ $subtract: [now, "$createdAt"] }, 86_400_000],
              },
            },
          },
          {
            $group: {
              _id: null,
              days0to7: { $sum: { $cond: [{ $lte: ["$ageDays", 7] }, 1, 0] } },
              days8to14: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $gt: ["$ageDays", 7] }, { $lte: ["$ageDays", 14] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              days15to30: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $gt: ["$ageDays", 14] }, { $lte: ["$ageDays", 30] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              days31Plus: { $sum: { $cond: [{ $gt: ["$ageDays", 30] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);

  const weeklyWindow = buildWeeklyWindow(10);
  const weeklyMap = new Map((result.weeklyVelocity || []).map((row) => [new Date(row._id).toISOString(), row.completed]));

  const weeklyVelocity = weeklyWindow.map((entry) => ({
    week: entry.label,
    completed: weeklyMap.get(entry.key) || 0,
  }));

  const weeklyValues = weeklyVelocity.map((entry) => entry.completed);
  const variation = stdDeviation(weeklyValues);
  const mean = weeklyValues.length
    ? weeklyValues.reduce((sum, value) => sum + value, 0) / weeklyValues.length
    : 0;
  const normalizedVariation = mean > 0 ? Math.min(variation / mean, 1) : 1;
  const completionConsistencyScore = Math.round((1 - normalizedVariation) * 100);

  const averageCompletionTimeByPriority = ["High", "Normal", "Low"].map((priority) => {
    const row = (result.averageCompletionByPriority || []).find((entry) => entry._id === priority);
    return {
      priority,
      averageHours: Math.round(row?.avgHours || 0),
    };
  });

  const openTotal = result.openTotals?.[0]?.count || 0;
  const overdueCount = result.overdueOpen?.[0]?.count || 0;
  const inProgressCount = result.inProgressOpen?.[0]?.count || 0;

  const overdueRiskScore = openTotal
    ? Math.min(Math.round(((overdueCount + inProgressCount * 0.5) / openTotal) * 100), 100)
    : 0;

  const aging = result.agingDistribution?.[0] || {
    days0to7: 0,
    days8to14: 0,
    days15to30: 0,
    days31Plus: 0,
  };

  const payload = {
    weeklyVelocity,
    averageCompletionTimeByPriority,
    overdueRiskScore,
    completionConsistencyScore,
    taskAgingDistribution: [
      { bucket: "0-7 days", count: aging.days0to7 || 0 },
      { bucket: "8-14 days", count: aging.days8to14 || 0 },
      { bucket: "15-30 days", count: aging.days15to30 || 0 },
      { bucket: "31+ days", count: aging.days31Plus || 0 },
    ],
  };

  logger.info(
    {
      userId,
      workspaceId,
      weeklyPoints: payload.weeklyVelocity.length,
      dirtyTriggeredRecompute: analyticsMarkedDirty,
      cacheLayer: shouldUseMemoryCache ? "memory" : "disabled",
    },
    "analytics-recomputed"
  );

  if (shouldUseMemoryCache) {
    analyticsCache.set(cacheKey, payload, ANALYTICS_TTL_MS);
  }
  if (analyticsMarkedDirty) {
    analyticsDirtyUntil.delete(`${workspaceId}:${userId}`);
  }
  return payload;
};
