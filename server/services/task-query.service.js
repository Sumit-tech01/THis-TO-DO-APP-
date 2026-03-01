import mongoose from "mongoose";

export const ALLOWED_PRIORITIES = ["High", "Normal", "Low"];
export const ALLOWED_STATUSES = ["Not Started", "In Progress", "On Hold", "Deferred", "Completed"];
export const ALLOWED_SORT_FIELDS = [
  "dueDate",
  "title",
  "priority",
  "status",
  "deferredDate",
  "createdAt",
  "updatedAt",
];
export const STATUS_ORDER_FOR_CHART = ["Completed", "Deferred", "In Progress", "On Hold", "Not Started"];

export const MAX_TASK_LIMIT = 100;

export const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const resolveListLimit = (queryLimit) =>
  Math.min(parsePositiveInt(queryLimit, 25), MAX_TASK_LIMIT);

export const sanitizeSort = ({ sortBy, sortOrder }) => {
  const resolvedSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "dueDate";
  const resolvedSortOrder = sortOrder === "desc" ? -1 : 1;
  return {
    sortBy: resolvedSortBy,
    sortOrder: resolvedSortOrder,
  };
};

export const buildTaskFilters = ({ query, userId, workspaceId }) => {
  const filters = {
    userId,
    $and: [
      {
        $or: [
          { workspaceId },
          { workspaceId: { $exists: false } },
          { workspaceId: null },
        ],
      },
    ],
  };
  const { status, priority, month, dueDate, search } = query;

  if (status && status !== "All" && ALLOWED_STATUSES.includes(status)) {
    filters.status = status;
  }

  if (priority && priority !== "All" && ALLOWED_PRIORITIES.includes(priority)) {
    filters.priority = priority;
  }

  if (month) {
    const [yearRaw, monthRaw] = String(month).split("-");
    const year = Number.parseInt(yearRaw || "", 10);
    const monthNumber = Number.parseInt(monthRaw || "", 10);

    if (
      Number.isInteger(year) &&
      Number.isInteger(monthNumber) &&
      monthNumber >= 1 &&
      monthNumber <= 12
    ) {
      const start = new Date(year, monthNumber - 1, 1);
      const end = new Date(year, monthNumber, 1);
      filters.dueDate = { $gte: start, $lt: end };
    }
  }

  if (dueDate) {
    const parsedDueDate = parseDate(dueDate);
    if (parsedDueDate) {
      const start = new Date(parsedDueDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filters.dueDate = { $gte: start, $lt: end };
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(String(search)), "i");
    filters.$and.push({
      $or: [{ title: regex }, { description: regex }, { remarks: regex }, { status: regex }],
    });
  }

  return filters;
};

export const resolveCursorQuery = ({ cursor, limit }) => {
  const parsedLimit = resolveListLimit(limit);
  const validCursor = cursor && mongoose.Types.ObjectId.isValid(cursor) ? cursor : null;

  return {
    cursor: validCursor,
    limit: parsedLimit,
  };
};

export const buildEmptyCountMap = (keys) =>
  keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
