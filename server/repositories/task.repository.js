import Task from "../models/Task.js";

const buildTaskOwnershipQuery = ({ id, userId, workspaceId }) => ({
  _id: id,
  userId,
  $or: [{ workspaceId }, { workspaceId: { $exists: false } }, { workspaceId: null }],
});

export const createTaskRecord = (payload) => Task.create(payload);

export const listTasksWithOffset = async ({ filters, sort, skip, limit }) => {
  const [tasks, total] = await Promise.all([
    Task.find(filters).sort(sort).skip(skip).limit(limit),
    Task.countDocuments(filters),
  ]);

  return { tasks, total };
};

export const listTasksWithCursor = async ({ filters, cursor, limit }) => {
  const query = { ...filters };
  if (cursor) {
    query._id = { $lt: cursor };
  }

  const docs = await Task.find(query).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = docs.length > limit;
  const tasks = hasMore ? docs.slice(0, limit) : docs;

  return {
    tasks,
    hasMore,
    nextCursor: hasMore ? tasks[tasks.length - 1]._id.toString() : null,
  };
};

export const findTaskByIdForUser = ({ id, userId, workspaceId }) =>
  Task.findOne(buildTaskOwnershipQuery({ id, userId, workspaceId }));

export const updateTaskByIdForUser = ({ id, userId, workspaceId, updates }) =>
  Task.findOneAndUpdate(buildTaskOwnershipQuery({ id, userId, workspaceId }), updates, {
    new: true,
    runValidators: true,
  });

export const deleteTaskByIdForUser = ({ id, userId, workspaceId }) =>
  Task.findOneAndDelete(buildTaskOwnershipQuery({ id, userId, workspaceId }));

export const aggregateTasks = (pipeline) => Task.aggregate(pipeline);
