export const PRIORITIES = ["High", "Normal", "Low"];

export const STATUSES = [
  "Not Started",
  "On Hold",
  "In Progress",
  "Deferred",
  "Completed",
];

export const STATUS_ORDER_FOR_CHART = [
  "Completed",
  "Deferred",
  "In Progress",
  "On Hold",
  "Not Started",
];

export const VIEW_MODES = [
  { id: "table", label: "Table" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendar" },
];

export const STATUS_COLORS = {
  "Not Started": {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-200",
    chart: "#64748b",
  },
  "On Hold": {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-200",
    chart: "#f59e0b",
  },
  "In Progress": {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-700 dark:text-sky-200",
    chart: "#0284c7",
  },
  Deferred: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-700 dark:text-orange-200",
    chart: "#f97316",
  },
  Completed: {
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
