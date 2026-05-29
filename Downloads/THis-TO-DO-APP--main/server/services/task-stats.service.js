import { aggregateTasks } from "../repositories/task.repository.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  TASK_STATUS,
  TASK_STATUS_ORDER_FOR_CHART,
  TASK_STATUS_SUMMARY_KEYS,
} from "../constants/task-status.js";
import { incrementDashboardStatsMismatch } from "./dashboard-metrics.service.js";
import {
  ALLOWED_PRIORITIES,
  buildEmptyCountMap,
} from "./task-query.service.js";
import { MemoryTtlCache } from "../utils/memory-cache.js";
import { getWorkspaceTaskStats } from "./workspace-task-stats.service.js";
import {
  getTaskStatsSnapshot,
  invalidateTaskStatsSnapshot,
  saveTaskStatsSnapshot,
} from "./task-stats-snapshot.service.js";

const TASK_STATS_TTL_MS = 30_000;
const cache = new MemoryTtlCache(TASK_STATS_TTL_MS);
const shouldUseMemoryCache = env.NODE_ENV !== "production";

const getMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const formatMonthLabel = (date) =>
  date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

const getWeekStartDate = (dateInput) => {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date;
};

const formatWeekLabel = (date) =>
  date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  });

const toCountMap = (rows) =>
  (rows || []).reduce((acc, row) => {
    if (row?._id) {
      acc[row._id] = row.count || 0;
    }
    return acc;
  }, {});

const getCacheKey = ({ userId, workspaceId, query }) =>
  `task-stats:${workspaceId}:${userId}:${JSON.stringify(query || {})}`;

export const invalidateTaskStatsCache = ({ userId, workspaceId }) => {
  logger.info(
    {
      userId,
      workspaceId,
      cacheLayer: shouldUseMemoryCache ? "memory" : "disabled",
    },
    "task-stats-cache-invalidated"
  );
  if (!shouldUseMemoryCache) {
    invalidateTaskStatsSnapshot({ userId, workspaceId });
    return;
  }
  cache.clearByPrefix(`task-stats:${workspaceId}:${userId}:`);
  invalidateTaskStatsSnapshot({ userId, workspaceId });
};

export const getTaskStatsOverview = async ({ userId, workspaceId, filters, query }) => {
  const cacheKey = getCacheKey({ userId, workspaceId, query });
  const cached = shouldUseMemoryCache ? cache.get(cacheKey) : null;

  if (cached) {
    logger.debug(
      {
        userId,
        workspaceId,
      },
      "task-stats-cache-hit"
    );
    return cached;
  }

  const now = new Date();
  const summarySnapshot = getTaskStatsSnapshot({ userId, workspaceId, query });
  const summary =
    summarySnapshot || (await getWorkspaceTaskStats(workspaceId, { userId, filters }));

  if (!summary || typeof summary.total !== "number") {
    const error = new Error("Unable to compute task summary");
    error.statusCode = 500;
    throw error;
  }
  const breakdownSum =
    summary.notStarted +
    summary.inProgress +
    summary.onHold +
    summary.deferred +
    summary.completed;

  if (summary.total > 0 && breakdownSum === 0) {
    const mismatchTotal = incrementDashboardStatsMismatch();
    logger.error(
      {
        userId,
        workspaceId,
        total: summary.total,
        breakdownSum,
        dashboardStatsMismatchTotal: mismatchTotal,
      },
      "dashboard-stats-mismatch-detected"
    );

    const error = new Error("Task stats inconsistency detected");
    error.statusCode = 500;
    throw error;
  }

  if (!summarySnapshot) {
    saveTaskStatsSnapshot({ userId, workspaceId, query, summary });
  }

  const [result = {}] = await aggregateTasks([
    { $match: filters },
    {
      $facet: {
        priorityCounts: [
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
            },
          },
        ],
        overdue: [
          {
            $match: {
              status: { $ne: TASK_STATUS.COMPLETED },
              dueDate: { $type: "date", $lt: now },
            },
          },
          { $count: "count" },
        ],
        completionMetrics: [
          {
            $match: {
              completedAt: { $type: "date" },
              createdAt: { $type: "date" },
            },
          },
          {
            $project: {
              durationHours: {
                $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 3_600_000],
              },
              onTime: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", TASK_STATUS.COMPLETED] },
                      { $ne: ["$dueDate", null] },
                      { $lte: ["$completedAt", "$dueDate"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgCompletionHours: { $avg: "$durationHours" },
              completedCount: { $sum: 1 },
              onTimeCompleted: { $sum: "$onTime" },
            },
          },
        ],
        monthlyCreated: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              created: { $sum: 1 },
            },
          },
        ],
        monthlyCompleted: [
          { $match: { completedAt: { $type: "date" } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$completedAt" },
              },
              completed: { $sum: 1 },
            },
          },
        ],
        weeklyVelocity: [
          { $match: { completedAt: { $type: "date" } } },
          {
            $project: {
              weekStart: {
                $dateTrunc: { date: "$completedAt", unit: "week" },
              },
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
      },
    },
  ]);

  const priorityCounts = {
    ...buildEmptyCountMap(ALLOWED_PRIORITIES),
    ...toCountMap(result.priorityCounts),
  };

  const completionMetrics = result.completionMetrics?.[0] || {
    avgCompletionHours: 0,
    completedCount: 0,
    onTimeCompleted: 0,
  };

  const completionRatio = summary.total ? summary.completed / summary.total : 0;
  const punctualityRatio = summary.completed
    ? completionMetrics.onTimeCompleted / summary.completed
    : 0;
  const productivityScore = Math.round((completionRatio * 60 + punctualityRatio * 40) * 100) / 100;

  const monthlyWindow = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: getMonthKey(date),
      month: formatMonthLabel(date),
      created: 0,
      completed: 0,
    };
  });

  const monthlyCreatedMap = new Map((result.monthlyCreated || []).map((row) => [row._id, row.created]));
  const monthlyCompletedMap = new Map(
    (result.monthlyCompleted || []).map((row) => [row._id, row.completed])
  );

  const monthlyCompletionTrend = monthlyWindow.map((entry) => ({
    month: entry.month,
    created: monthlyCreatedMap.get(entry.key) || 0,
    completed: monthlyCompletedMap.get(entry.key) || 0,
  }));

  const weeklyWindow = Array.from({ length: 8 }).map((_, index) => {
    const weekStart = getWeekStartDate(now);
    weekStart.setDate(weekStart.getDate() - (7 - index) * 7);
    const key = new Date(weekStart).toISOString();
    return {
      key,
      week: formatWeekLabel(weekStart),
      completed: 0,
    };
  });

  const weeklyMap = new Map((result.weeklyVelocity || []).map((row) => [new Date(row._id).toISOString(), row.completed]));

  const velocity = weeklyWindow.map((entry) => ({
    week: entry.week,
    completed: weeklyMap.get(entry.key) || 0,
  }));

  const payload = {
    summary,
    completionPercent: summary.total ? Math.round((summary.completed / summary.total) * 100) : 0,
    priorityData: ALLOWED_PRIORITIES.map((name) => ({
      name,
      count: priorityCounts[name] || 0,
    })),
    statusData: TASK_STATUS_ORDER_FOR_CHART.map((name) => ({
      name,
      count: summary[TASK_STATUS_SUMMARY_KEYS[name]] || 0,
    })),
    analytics: {
      overdueCount: result.overdue?.[0]?.count || 0,
      averageCompletionTimeHours: Math.round(completionMetrics.avgCompletionHours || 0),
      productivityScore,
      monthlyCompletionTrend,
      velocity,
    },
  };

  logger.info(
    {
      userId,
      workspaceId,
      total: payload.summary.total,
      completed: payload.summary.completed,
      cacheLayer: shouldUseMemoryCache ? "memory" : "disabled",
    },
    "task-stats-recomputed"
  );

  if (shouldUseMemoryCache) {
    cache.set(cacheKey, payload, TASK_STATS_TTL_MS);
  }
  return payload;
};
