export const PRIORITIES = ["High", "Normal", "Low"];

export const TASK_STATUS = {
  NOT_STARTED: "Not Started",
  ON_HOLD: "On Hold",
  IN_PROGRESS: "In Progress",
  DEFERRED: "Deferred",
  COMPLETED: "Completed",
};

export const STATUSES = [
  TASK_STATUS.NOT_STARTED,
  TASK_STATUS.ON_HOLD,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.DEFERRED,
  TASK_STATUS.COMPLETED,
];

export const STATUS_ORDER_FOR_CHART = [
  TASK_STATUS.COMPLETED,
  TASK_STATUS.DEFERRED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.ON_HOLD,
  TASK_STATUS.NOT_STARTED,
];

export const VIEW_MODES = [
  { id: "table", label: "Table" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendar" },
];

export const STATUS_COLORS = {
  [TASK_STATUS.NOT_STARTED]: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-200",
    chart: "#64748b",
  },
  [TASK_STATUS.ON_HOLD]: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-200",
    chart: "#f59e0b",
  },
  [TASK_STATUS.IN_PROGRESS]: {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-700 dark:text-sky-200",
    chart: "#0284c7",
  },
  [TASK_STATUS.DEFERRED]: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-700 dark:text-orange-200",
    chart: "#f97316",
  },
  [TASK_STATUS.COMPLETED]: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-200",
    chart: "#10b981",
  },
};

export const PRIORITY_COLORS = {
  High: "#ef4444",
  Normal: "#3b82f6",
  Low: "#10b981",
};

export const DEFAULT_PAGE_SIZE = 25;
