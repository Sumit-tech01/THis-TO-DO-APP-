export const TASK_STATUS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  DEFERRED: "Deferred",
  COMPLETED: "Completed",
};

export const TASK_STATUS_VALUES = Object.freeze(Object.values(TASK_STATUS));

export const TASK_STATUS_ORDER_FOR_CHART = Object.freeze([
  TASK_STATUS.COMPLETED,
  TASK_STATUS.DEFERRED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.ON_HOLD,
  TASK_STATUS.NOT_STARTED,
]);

export const TASK_STATUS_SUMMARY_KEYS = Object.freeze({
  [TASK_STATUS.NOT_STARTED]: "notStarted",
  [TASK_STATUS.IN_PROGRESS]: "inProgress",
  [TASK_STATUS.ON_HOLD]: "onHold",
  [TASK_STATUS.DEFERRED]: "deferred",
  [TASK_STATUS.COMPLETED]: "completed",
});
