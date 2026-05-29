import { logger } from "../config/logger.js";
import { emitToUser, emitToWorkspace } from "../realtime/socket.js";
import {
  createTaskRecord,
  deleteTaskByIdForUser,
  findTaskByIdForUser,
  listTasksWithCursor,
  listTasksWithOffset,
  updateTaskByIdForUser,
} from "../repositories/task.repository.js";
import { invalidateAnalyticsCache } from "../services/analytics.service.js";
import { recordActivity } from "../services/activity.service.js";
import { TASK_PRIORITY } from "../constants/task-priority.js";
import { TASK_STATUS } from "../constants/task-status.js";
import {
  ALLOWED_PRIORITIES,
  ALLOWED_STATUSES,
  buildTaskFilters,
  parseDate,
  parsePositiveInt,
  resolveCursorQuery,
  sanitizeSort,
} from "../services/task-query.service.js";
import { getTaskStatsOverview, invalidateTaskStatsCache } from "../services/task-stats.service.js";
import { getWorkspaceTaskStats } from "../services/workspace-task-stats.service.js";

const sanitizeTaskPayload = (task) => {
  if (!task) {
    return null;
  }
  const raw = task.toObject ? task.toObject() : task;
  return {
    ...raw,
    id: raw._id?.toString?.() || raw.id,
  };
};

const captureMutationStats = async ({ userId, workspaceId }) => {
  return getWorkspaceTaskStats(workspaceId, { userId });
};

const invalidateTaskRelatedCaches = ({ userId, workspaceId }) => {
  invalidateTaskStatsCache({ userId, workspaceId });
  invalidateAnalyticsCache({ userId, workspaceId });
};

const emitTaskEvent = ({ userId, workspaceId, eventName, task, metadata }) => {
  const payload = {
    task: sanitizeTaskPayload(task),
    metadata: metadata || {},
    emittedAt: new Date().toISOString(),
  };

  emitToUser(userId, eventName, payload);
  emitToWorkspace(workspaceId, eventName, payload);
};

const buildMutableTaskUpdates = (body) => {
  const allowedFields = [
    "title",
    "description",
    "priority",
    "status",
    "dueDate",
    "deferredDate",
    "remarks",
  ];
  const updates = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  });

  return updates;
};

export const createTask = async (req, res, next) => {
  try {
    const beforeStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    const { title, description, priority, status, dueDate, deferredDate, remarks } = req.body;

    if (!title) {
      return next({ statusCode: 400, message: "title is required" });
    }

    const resolvedPriority =
      priority && ALLOWED_PRIORITIES.includes(priority) ? priority : TASK_PRIORITY.NORMAL;
    const resolvedStatus =
      status && ALLOWED_STATUSES.includes(status) ? status : TASK_STATUS.NOT_STARTED;
    const parsedDueDate = parseDate(dueDate);
    const parsedDeferredDate = parseDate(deferredDate);

    if (dueDate && !parsedDueDate) {
      return next({ statusCode: 400, message: "dueDate must be a valid date" });
    }

    if (deferredDate && !parsedDeferredDate) {
      return next({ statusCode: 400, message: "deferredDate must be a valid date" });
    }

    const task = await createTaskRecord({
      workspaceId: req.workspace.id,
      userId: req.user.id,
      title,
      description: description || "",
      priority: resolvedPriority,
      status: resolvedStatus,
      dueDate: parsedDueDate,
      deferredDate: resolvedStatus === TASK_STATUS.DEFERRED ? parsedDeferredDate : null,
      remarks: remarks || "",
      completedAt: resolvedStatus === TASK_STATUS.COMPLETED ? new Date() : null,
    });

    invalidateTaskRelatedCaches({ userId: req.user.id, workspaceId: req.workspace.id });
    emitTaskEvent({
      userId: req.user.id,
      workspaceId: req.workspace.id,
      eventName: "TASK_CREATED",
      task,
    });

    await recordActivity({
      workspaceId: req.workspace.id,
      userId: req.user.id,
      type: "TASK_CREATED",
      metadata: { taskId: task._id.toString(), title: task.title },
    });

    const afterStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    logger.info(
      {
        userId: req.user.id,
        workspaceId: req.workspace.id,
        taskId: task._id.toString(),
        beforeStats,
        afterStats,
      },
      "task-mutation-stats-delta"
    );

    return res.status(201).json({
      message: "Task created",
      task,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const filters = buildTaskFilters({
      query: req.query,
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });

    const useOffsetPagination = req.query.page !== undefined;

    if (!useOffsetPagination) {
      const { cursor, limit } = resolveCursorQuery({
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      const { tasks, hasMore, nextCursor } = await listTasksWithCursor({
        filters,
        cursor,
        limit,
      });

      return res.status(200).json({
        data: tasks,
        pagination: {
          mode: "cursor",
          limit,
          hasMore,
          nextCursor,
        },
      });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = resolveCursorQuery({ limit: req.query.limit }).limit;
    const skip = (page - 1) * limit;
    const { sortBy, sortOrder } = sanitizeSort(req.query);

    const sort = {
      [sortBy]: sortOrder,
      createdAt: -1,
    };

    const { tasks, total } = await listTasksWithOffset({
      filters,
      sort,
      skip,
      limit,
    });

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.status(200).json({
      data: tasks,
      pagination: {
        mode: "offset",
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getTaskStats = async (req, res, next) => {
  try {
    const filters = buildTaskFilters({
      query: req.query,
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });

    const data = await getTaskStatsOverview({
      userId: req.user.id,
      workspaceId: req.workspace.id,
      filters,
      query: req.query,
    });

    logger.debug(
      {
        userId: req.user.id,
        workspaceId: req.workspace.id,
        total: data?.summary?.total ?? 0,
        completed: data?.summary?.completed ?? 0,
      },
      "task-stats-response"
    );

    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const beforeStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    const { id } = req.params;
    const updates = buildMutableTaskUpdates(req.body);

    if (Object.keys(updates).length === 0) {
      return next({ statusCode: 400, message: "No valid task fields provided for update" });
    }

    if (updates.priority && !ALLOWED_PRIORITIES.includes(updates.priority)) {
      return next({ statusCode: 400, message: "priority is invalid" });
    }

    if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
      return next({ statusCode: 400, message: "status is invalid" });
    }

    if (updates.dueDate !== undefined) {
      const parsedDueDate = parseDate(updates.dueDate);
      if (updates.dueDate && !parsedDueDate) {
        return next({ statusCode: 400, message: "dueDate must be a valid date" });
      }
      updates.dueDate = parsedDueDate;
    }

    if (updates.deferredDate !== undefined) {
      const parsedDeferredDate = parseDate(updates.deferredDate);
      if (updates.deferredDate && !parsedDeferredDate) {
        return next({ statusCode: 400, message: "deferredDate must be a valid date" });
      }
      updates.deferredDate = parsedDeferredDate;
    }

    const existingTask = await findTaskByIdForUser({
      id,
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });

    if (!existingTask) {
      return next({ statusCode: 404, message: "Task not found" });
    }

    const previousStatus = existingTask.status;
    const nextStatus = updates.status || previousStatus;

    if (nextStatus === TASK_STATUS.COMPLETED) {
      updates.completedAt = new Date();
      updates.deferredDate = null;
    } else {
      updates.completedAt = null;
    }

    if (nextStatus !== TASK_STATUS.DEFERRED) {
      updates.deferredDate = null;
    }

    const task = await updateTaskByIdForUser({
      id,
      userId: req.user.id,
      workspaceId: req.workspace.id,
      updates,
    });

    if (!task) {
      return next({ statusCode: 404, message: "Task not found" });
    }

    invalidateTaskRelatedCaches({ userId: req.user.id, workspaceId: req.workspace.id });
    emitTaskEvent({
      userId: req.user.id,
      workspaceId: req.workspace.id,
      eventName: "TASK_UPDATED",
      task,
      metadata: {
        previousStatus,
        nextStatus: task.status,
      },
    });

    if (previousStatus !== TASK_STATUS.COMPLETED && task.status === TASK_STATUS.COMPLETED) {
      emitTaskEvent({
        userId: req.user.id,
        workspaceId: req.workspace.id,
        eventName: "TASK_COMPLETED",
        task,
      });
      await recordActivity({
        workspaceId: req.workspace.id,
        userId: req.user.id,
        type: "TASK_COMPLETED",
        metadata: { taskId: task._id.toString(), title: task.title },
      });
    } else {
      await recordActivity({
        workspaceId: req.workspace.id,
        userId: req.user.id,
        type: "TASK_UPDATED",
        metadata: { taskId: task._id.toString(), title: task.title },
      });
    }

    const afterStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    logger.info(
      {
        userId: req.user.id,
        workspaceId: req.workspace.id,
        taskId: task._id.toString(),
        beforeStats,
        afterStats,
        previousStatus,
        nextStatus: task.status,
      },
      "task-mutation-stats-delta"
    );

    return res.status(200).json({
      message: "Task updated",
      task,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const beforeStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    const { id } = req.params;

    const task = await deleteTaskByIdForUser({
      id,
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });

    if (!task) {
      return next({ statusCode: 404, message: "Task not found" });
    }

    invalidateTaskRelatedCaches({ userId: req.user.id, workspaceId: req.workspace.id });
    emitTaskEvent({
      userId: req.user.id,
      workspaceId: req.workspace.id,
      eventName: "TASK_DELETED",
      task,
    });

    await recordActivity({
      workspaceId: req.workspace.id,
      userId: req.user.id,
      type: "TASK_DELETED",
      metadata: { taskId: task._id.toString(), title: task.title },
    });

    const afterStats = await captureMutationStats({
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });
    logger.info(
      {
        userId: req.user.id,
        workspaceId: req.workspace.id,
        taskId: task._id.toString(),
        beforeStats,
        afterStats,
      },
      "task-mutation-stats-delta"
    );

    return res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    return next(error);
  }
};
