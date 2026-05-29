import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { TASK_STATUS } from "../constants/task-status.js";
import { getWorkspaceTaskStats, normalizeStatusRows } from "../services/workspace-task-stats.service.js";

const createTask = ({ workspaceId, userId, status }) => ({
  workspaceId,
  userId,
  status,
});

const matchesObjectId = (left, right) => String(left) === String(right);

const makeAggregateFn = (tasks) => async (pipeline) => {
  const match = pipeline?.[0]?.$match || {};
  const filtered = tasks.filter((task) => {
    if (match.workspaceId && !matchesObjectId(task.workspaceId, match.workspaceId)) {
      return false;
    }
    if (match.userId && !matchesObjectId(task.userId, match.userId)) {
      return false;
    }
    if (match.status && task.status !== match.status) {
      return false;
    }
    return true;
  });

  const grouped = filtered.reduce((acc, task) => {
    acc.set(task.status, (acc.get(task.status) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(grouped.entries()).map(([status, count]) => ({ _id: status, count }));
};

test("stats reflect exact status counts when tasks exist", async () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const tasks = [
    createTask({ workspaceId, userId, status: TASK_STATUS.NOT_STARTED }),
    createTask({ workspaceId, userId, status: TASK_STATUS.IN_PROGRESS }),
    createTask({ workspaceId, userId, status: TASK_STATUS.ON_HOLD }),
    createTask({ workspaceId, userId, status: TASK_STATUS.DEFERRED }),
    createTask({ workspaceId, userId, status: TASK_STATUS.COMPLETED }),
  ];

  const summary = await getWorkspaceTaskStats(workspaceId.toString(), {
    userId: userId.toString(),
    aggregateFn: makeAggregateFn(tasks),
  });

  assert.equal(summary.total, 5);
  assert.equal(summary.notStarted, 1);
  assert.equal(summary.inProgress, 1);
  assert.equal(summary.onHold, 1);
  assert.equal(summary.deferred, 1);
  assert.equal(summary.completed, 1);
});

test("workspace isolation excludes tasks from other workspaces", async () => {
  const workspaceA = new mongoose.Types.ObjectId();
  const workspaceB = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const tasks = [
    createTask({ workspaceId: workspaceA, userId, status: TASK_STATUS.COMPLETED }),
    createTask({ workspaceId: workspaceB, userId, status: TASK_STATUS.COMPLETED }),
  ];

  const summary = await getWorkspaceTaskStats(workspaceA.toString(), {
    userId: userId.toString(),
    aggregateFn: makeAggregateFn(tasks),
  });

  assert.equal(summary.total, 1);
  assert.equal(summary.completed, 1);
});

test("stats update after status changes", async () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const tasks = [
    createTask({ workspaceId, userId, status: TASK_STATUS.IN_PROGRESS }),
  ];
  const aggregateFn = makeAggregateFn(tasks);

  const before = await getWorkspaceTaskStats(workspaceId.toString(), {
    userId: userId.toString(),
    aggregateFn,
  });
  assert.equal(before.inProgress, 1);
  assert.equal(before.completed, 0);

  tasks[0].status = TASK_STATUS.COMPLETED;

  const after = await getWorkspaceTaskStats(workspaceId.toString(), {
    userId: userId.toString(),
    aggregateFn,
  });
  assert.equal(after.inProgress, 0);
  assert.equal(after.completed, 1);
});

test("invalid workspace ids throw", async () => {
  await assert.rejects(
    () => getWorkspaceTaskStats("not-an-object-id", { aggregateFn: async () => [] }),
    /Invalid ObjectId/
  );
});

test("partial aggregation result fills missing statuses with zero", () => {
  const summary = normalizeStatusRows([
    { _id: TASK_STATUS.COMPLETED, count: 3 },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.completed, 3);
  assert.equal(summary.notStarted, 0);
  assert.equal(summary.inProgress, 0);
  assert.equal(summary.onHold, 0);
  assert.equal(summary.deferred, 0);
});
