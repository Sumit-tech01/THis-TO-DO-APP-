import { aggregateTasks } from "../repositories/task.repository.js";
import { TASK_STATUS_SUMMARY_KEYS } from "../constants/task-status.js";
import { toObjectId } from "../utils/object-id.js";

const getEmptySummary = () => ({
  total: 0,
  notStarted: 0,
  inProgress: 0,
  onHold: 0,
  deferred: 0,
  completed: 0,
});

export const normalizeStatusRows = (rows) => {
  const summary = getEmptySummary();
  const rowList = Array.isArray(rows) ? rows : [];

  for (const row of rowList) {
    const status = row?._id;
    const count = Number(row?.count) || 0;
    summary.total += count;
    const key = TASK_STATUS_SUMMARY_KEYS[status];
    if (!key) {
      continue;
    }
    summary[key] = count;
  }

  return summary;
};

export const getWorkspaceTaskStats = async (
  workspaceId,
  { userId, filters = {}, aggregateFn = aggregateTasks } = {}
) => {
  const workspaceObjectId = toObjectId(workspaceId);
  const match = {
    ...filters,
    workspaceId: workspaceObjectId,
  };

  if (userId) {
    match.userId = toObjectId(userId);
  }

  const rows = await aggregateFn([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = normalizeStatusRows(rows);

  return summary;
};
