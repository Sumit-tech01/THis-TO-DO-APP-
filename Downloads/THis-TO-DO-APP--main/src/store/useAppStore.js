import dayjs from "dayjs";
import toast from "react-hot-toast";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { analyticsApi, authApi, taskApi } from "../api";
import { configureApiAuth } from "../api/client";
import { DEFAULT_PAGE_SIZE, TASK_STATUS } from "../constants";

const STORAGE_KEY = "ultimate_dashboard_app_store_v4";

let tasksAbortController = null;
let statsAbortController = null;
let analyticsAbortController = null;
let realtimeRefreshTimer = null;
let mutationRefreshPromise = null;
let suppressRealtimeRefreshUntil = 0;

const isValidStatsPayload = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const summary = value.summary;
  if (!summary || typeof summary !== "object") {
    return false;
  }

  const requiredSummaryKeys = [
    "total",
    "notStarted",
    "onHold",
    "inProgress",
    "deferred",
    "completed",
  ];

  return requiredSummaryKeys.every((key) => Number.isFinite(summary[key]));
};

const applyTheme = (theme) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  const root = document.documentElement;
  root.setAttribute("data-theme", nextTheme);
  root.classList.toggle("dark", nextTheme === "dark");
};

const getInitialFilters = () => ({
  priority: "All",
  status: "All",
  month: "",
  dueDate: "",
  search: "",
  sortBy: "dueDate",
  sortOrder: "asc",
});

const getDefaultAnalyticsOverview = () => ({
  weeklyVelocity: [],
  averageCompletionTimeByPriority: [
    { priority: "High", averageHours: 0 },
    { priority: "Normal", averageHours: 0 },
    { priority: "Low", averageHours: 0 },
  ],
  overdueRiskScore: 0,
  completionConsistencyScore: 0,
  taskAgingDistribution: [
    { bucket: "0-7 days", count: 0 },
    { bucket: "8-14 days", count: 0 },
    { bucket: "15-30 days", count: 0 },
    { bucket: "31+ days", count: 0 },
  ],
});

const getInitialTaskPagination = () => ({
  mode: "cursor",
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  cursor: null,
  nextCursor: null,
  hasMore: false,
  cursorHistory: [],
});

const normalizeTask = (task) => ({
  ...task,
  id: task.id || task._id,
});

const toApiTaskPayload = (task) => ({
  title: task.title,
  description: task.description || "",
  priority: task.priority,
  status: task.status,
  dueDate: task.dueDate || null,
  deferredDate: task.status === TASK_STATUS.DEFERRED ? task.deferredDate || null : null,
  remarks: task.remarks || "",
});

const parseCsvRow = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const abortIfRunning = (controllerRef) => {
  if (controllerRef && !controllerRef.signal.aborted) {
    controllerRef.abort();
  }
};

const toLocalActivity = (entry, user) => ({
  id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: entry.type || entry.action || "UNKNOWN",
  action: entry.type || entry.action || "UNKNOWN",
  meta: entry.metadata || entry.meta || {},
  createdAt: entry.createdAt || new Date().toISOString(),
  user: entry.user || user || null,
});

export const useAppStore = create(
  persist(
    (set, get) => ({
      session: {
        token: null,
        user: null,
      },
      ui: {
        theme: "light",
        sidebarCollapsed: false,
        viewMode: "table",
      },
      filters: getInitialFilters(),
      tasks: [],
      dashboardStats: null,
      statsError: null,
      analyticsOverview: getDefaultAnalyticsOverview(),
      taskPagination: getInitialTaskPagination(),
      activity: [],
      loading: {
        bootstrap: false,
        auth: false,
        tasks: false,
        stats: false,
        analytics: false,
      },
      modals: {
        taskOpen: false,
        taskEditing: null,
        deleteOpen: false,
        deleteTarget: null,
      },

      hydrateTheme: () => {
        applyTheme(get().ui.theme);
      },

      setTheme: (theme) =>
        set((state) => {
          const nextTheme = theme === "dark" ? "dark" : "light";
          if (state.ui.theme === nextTheme) {
            return state;
          }
          applyTheme(nextTheme);
          return { ui: { ...state.ui, theme: nextTheme } };
        }),

      toggleTheme: () => {
        const next = get().ui.theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },

      toggleSidebar: () =>
        set((state) => ({ ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed } })),

      setViewMode: (viewMode) =>
        set((state) =>
          state.ui.viewMode === viewMode ? state : { ui: { ...state.ui, viewMode } }
        ),

      setFilter: (key, value) =>
        set((state) => {
          const unchanged = state.filters[key] === value;
          if (unchanged && state.taskPagination.page === 1) {
            return state;
          }

          return {
            filters: { ...state.filters, [key]: value },
            taskPagination: {
              ...state.taskPagination,
              page: 1,
              cursor: null,
              nextCursor: null,
              hasMore: false,
              cursorHistory: [],
            },
          };
        }),

      resetFilters: () =>
        set((state) => ({
          filters: getInitialFilters(),
          taskPagination: {
            ...state.taskPagination,
            page: 1,
            cursor: null,
            nextCursor: null,
            hasMore: false,
            cursorHistory: [],
          },
        })),

      setPagination: ({ page, limit }) =>
        set((state) => {
          const current = state.taskPagination;
          const nextLimit = limit || current.limit;

          if (limit && nextLimit !== current.limit) {
            return {
              taskPagination: {
                ...current,
                limit: nextLimit,
                page: 1,
                cursor: null,
                nextCursor: null,
                hasMore: false,
                cursorHistory: [],
              },
            };
          }

          if (!page || page === current.page) {
            return state;
          }

          if (current.mode === "cursor") {
            if (page === current.page + 1 && current.hasMore && current.nextCursor) {
              return {
                taskPagination: {
                  ...current,
                  page,
                  cursorHistory: [...current.cursorHistory, current.cursor],
                  cursor: current.nextCursor,
                  nextCursor: null,
                  hasMore: false,
                },
              };
            }

            if (page === current.page - 1 && current.page > 1) {
              const history = [...current.cursorHistory];
              const previousCursor = history.pop() || null;
              return {
                taskPagination: {
                  ...current,
                  page,
                  cursorHistory: history,
                  cursor: previousCursor,
                  nextCursor: null,
                  hasMore: false,
                },
              };
            }

            return state;
          }

          return {
            taskPagination: { ...current, page },
          };
        }),

      setSorting: (sortBy) =>
        set((state) => {
          const isSame = state.filters.sortBy === sortBy;
          return {
            filters: {
              ...state.filters,
              sortBy,
              sortOrder: isSame ? (state.filters.sortOrder === "asc" ? "desc" : "asc") : "asc",
            },
            taskPagination: {
              ...state.taskPagination,
              page: 1,
              cursor: null,
              nextCursor: null,
              hasMore: false,
              cursorHistory: [],
            },
          };
        }),

      openTaskModal: (task = null) =>
        set((state) => ({
          modals: { ...state.modals, taskOpen: true, taskEditing: task },
        })),

      closeTaskModal: () =>
        set((state) => ({
          modals: { ...state.modals, taskOpen: false, taskEditing: null },
        })),

      openDeleteModal: (task) =>
        set((state) => ({
          modals: { ...state.modals, deleteOpen: true, deleteTarget: task },
        })),

      closeDeleteModal: () =>
        set((state) => ({
          modals: { ...state.modals, deleteOpen: false, deleteTarget: null },
        })),

      addActivity: (action, meta = {}) =>
        set((state) => {
          const log = toLocalActivity(
            {
              action,
              meta,
            },
            state.session.user
          );
          return { activity: [log, ...state.activity].slice(0, 60) };
        }),

      applyRealtimeActivity: (activityPayload) =>
        set((state) => {
          const activity = toLocalActivity(activityPayload, state.session.user);
          if (state.activity.some((entry) => entry.id === activity.id)) {
            return state;
          }
          return {
            activity: [activity, ...state.activity].slice(0, 60),
          };
        }),

      applyRealtimeTaskEvent: (eventName, payload) =>
        set((state) => {
          const task = payload?.task ? normalizeTask(payload.task) : null;
          const currentTasks = state.tasks;

          if (eventName === "TASK_DELETED" && task?.id) {
            return { tasks: currentTasks.filter((entry) => entry.id !== task.id) };
          }

          if (!task?.id) {
            return state;
          }

          const index = currentTasks.findIndex((entry) => entry.id === task.id);
          if (index >= 0) {
            const nextTasks = [...currentTasks];
            nextTasks[index] = { ...nextTasks[index], ...task };
            return { tasks: nextTasks };
          }

          if (eventName === "TASK_CREATED") {
            return {
              tasks: [task, ...currentTasks].slice(0, state.taskPagination.limit),
            };
          }

          return state;
        }),

      scheduleRealtimeRefresh: () => {
        if (Date.now() < suppressRealtimeRefreshUntil) {
          return;
        }

        if (realtimeRefreshTimer) {
          clearTimeout(realtimeRefreshTimer);
        }

        realtimeRefreshTimer = setTimeout(() => {
          get().fetchDashboardStats();
          get().fetchAnalyticsOverview();
        }, 350);
      },

      refreshAfterTaskMutation: async () => {
        if (mutationRefreshPromise) {
          return mutationRefreshPromise;
        }

        suppressRealtimeRefreshUntil = Date.now() + 1500;

        mutationRefreshPromise = Promise.all([
          get().fetchTasks(),
          get().fetchDashboardStats(),
          get().fetchAnalyticsOverview(),
        ]).finally(() => {
          mutationRefreshPromise = null;
        });

        return mutationRefreshPromise;
      },

      bootstrapSession: async () => {
        const { token } = get().session;

        set((state) => ({ loading: { ...state.loading, bootstrap: true } }));

        const loadSession = async (accessToken) => {
          const response = await authApi.me(accessToken);
          set((state) => ({
            session: {
              ...state.session,
              token: accessToken,
              user: response.user,
            },
          }));
        };

        try {
          if (token) {
            await loadSession(token);
          } else {
            const refreshResponse = await authApi.refresh();
            const nextAccessToken = refreshResponse.tokens?.accessToken || null;

            if (!nextAccessToken) {
              throw new Error("Invalid refresh response");
            }

            set((state) => ({
              session: {
                ...state.session,
                token: nextAccessToken,
              },
            }));

            await loadSession(nextAccessToken);
          }
        } catch {
          get().logout(false);
        } finally {
          set((state) => ({ loading: { ...state.loading, bootstrap: false } }));
        }
      },

      register: async (payload) => {
        set((state) => ({ loading: { ...state.loading, auth: true } }));

        try {
          const response = await authApi.register(payload);
          const accessToken = response.tokens?.accessToken || null;

          if (!accessToken) {
            throw new Error("Invalid authentication response.");
          }

          set((state) => ({
            session: {
              ...state.session,
              token: accessToken,
              user: response.user,
            },
          }));

          get().addActivity("USER_REGISTERED");
          toast.success("Registration successful.");
          return true;
        } catch (error) {
          toast.error(error.message || "Registration failed.");
          return false;
        } finally {
          set((state) => ({ loading: { ...state.loading, auth: false } }));
        }
      },

      login: async (payload) => {
        set((state) => ({ loading: { ...state.loading, auth: true } }));

        try {
          const response = await authApi.login(payload);
          const accessToken = response.tokens?.accessToken || null;

          if (!accessToken) {
            throw new Error("Invalid authentication response.");
          }

          set((state) => ({
            session: {
              ...state.session,
              token: accessToken,
              user: response.user,
            },
          }));

          get().addActivity("USER_LOGGED_IN");
          toast.success("Welcome back.");
          return true;
        } catch (error) {
          toast.error(error.message || "Login failed.");
          return false;
        } finally {
          set((state) => ({ loading: { ...state.loading, auth: false } }));
        }
      },

      forgotPassword: async (email) => {
        set((state) => ({ loading: { ...state.loading, auth: true } }));

        try {
          const response = await authApi.forgotPassword({ email });
          toast.success(response.message || "If the account exists, reset instructions were sent.");
          return true;
        } catch (error) {
          toast.error(error.message || "Failed to process password reset request.");
          return false;
        } finally {
          set((state) => ({ loading: { ...state.loading, auth: false } }));
        }
      },

      resetPassword: async ({ token, password }) => {
        set((state) => ({ loading: { ...state.loading, auth: true } }));

        try {
          const response = await authApi.resetPassword({ token, password });
          toast.success(response.message || "Password reset successful.");
          return true;
        } catch (error) {
          toast.error(error.message || "Failed to reset password.");
          return false;
        } finally {
          set((state) => ({ loading: { ...state.loading, auth: false } }));
        }
      },

      setAccessToken: (token) =>
        set((state) => ({
          session: {
            ...state.session,
            token,
          },
        })),

      handleAuthFailure: () => {
        get().logout(false);
      },

      logout: (notify = true) => {
        const token = get().session.token;

        if (token) {
          authApi.logout(token).catch(() => {
            // Best effort.
          });
        }

        abortIfRunning(tasksAbortController);
        abortIfRunning(statsAbortController);
        abortIfRunning(analyticsAbortController);

        set((state) => ({
          session: {
            token: null,
            user: null,
          },
          tasks: [],
          dashboardStats: null,
          statsError: null,
          analyticsOverview: getDefaultAnalyticsOverview(),
          taskPagination: {
            ...getInitialTaskPagination(),
            limit: state.taskPagination.limit,
          },
          activity: [],
          filters: getInitialFilters(),
        }));

        if (notify) {
          toast.success("Logged out.");
        }
      },

      fetchTasks: async () => {
        const token = get().session.token;
        const workspaceId = get().session.user?.defaultWorkspaceId;
        if (!token) {
          return;
        }

        abortIfRunning(tasksAbortController);
        tasksAbortController = new AbortController();

        const { filters, taskPagination } = get();
        set((state) => ({ loading: { ...state.loading, tasks: true } }));

        try {
          const query = {
            limit: taskPagination.limit,
            workspaceId,
            status: filters.status,
            priority: filters.priority,
            month: filters.month,
            dueDate: filters.dueDate,
            search: filters.search,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          };

          if (taskPagination.mode === "cursor") {
            query.cursor = taskPagination.cursor;
          } else {
            query.page = taskPagination.page;
          }

          const response = await taskApi.list(token, query, {
            signal: tasksAbortController.signal,
          });

          const tasks = Array.isArray(response.data) ? response.data.map(normalizeTask) : [];
          const pagination = response.pagination || {};

          set((state) => {
            if ((pagination.mode || state.taskPagination.mode) === "cursor") {
              const page = state.taskPagination.page;
              const hasMore = Boolean(pagination.hasMore);
              return {
                tasks,
                taskPagination: {
                  ...state.taskPagination,
                  mode: "cursor",
                  limit: pagination.limit || state.taskPagination.limit,
                  hasMore,
                  nextCursor: pagination.nextCursor || null,
                  totalPages: hasMore ? page + 1 : page,
                },
              };
            }

            return {
              tasks,
              taskPagination: {
                ...state.taskPagination,
                mode: "offset",
                page: pagination.page || state.taskPagination.page,
                limit: pagination.limit || state.taskPagination.limit,
                total: pagination.total || 0,
                totalPages: pagination.totalPages || 1,
              },
            };
          });
        } catch (error) {
          if (error.name === "AbortError") {
            return;
          }
          toast.error(error.message || "Failed to fetch tasks.");
        } finally {
          set((state) => ({ loading: { ...state.loading, tasks: false } }));
        }
      },

      fetchDashboardStats: async () => {
        const token = get().session.token;
        const workspaceId = get().session.user?.defaultWorkspaceId;
        if (!token) {
          return;
        }

        abortIfRunning(statsAbortController);
        statsAbortController = new AbortController();
        set((state) => ({ loading: { ...state.loading, stats: true } }));

        try {
          const response = await taskApi.stats(
            token,
            { workspaceId },
            { signal: statsAbortController.signal }
          );
          const dashboardStats = response.data;
          if (!isValidStatsPayload(dashboardStats)) {
            throw new Error("Invalid dashboard stats response");
          }
          if (import.meta.env.DEV) {
            console.debug("[dashboard-stats]", dashboardStats);
          }
          set({ dashboardStats, statsError: null });
        } catch (error) {
          if (error.name === "AbortError") {
            return;
          }
          set({ statsError: error.message || "Failed to fetch dashboard stats." });
          toast.error(error.message || "Failed to fetch dashboard stats.");
        } finally {
          set((state) => ({ loading: { ...state.loading, stats: false } }));
        }
      },

      fetchAnalyticsOverview: async () => {
        const token = get().session.token;
        const workspaceId = get().session.user?.defaultWorkspaceId;
        if (!token) {
          return;
        }

        abortIfRunning(analyticsAbortController);
        analyticsAbortController = new AbortController();
        set((state) => ({ loading: { ...state.loading, analytics: true } }));

        try {
          const response = await analyticsApi.overview(
            token,
            { workspaceId },
            { signal: analyticsAbortController.signal }
          );
          set({
            analyticsOverview: response.data || getDefaultAnalyticsOverview(),
          });
        } catch (error) {
          if (error.name === "AbortError") {
            return;
          }
          toast.error(error.message || "Failed to fetch analytics overview.");
        } finally {
          set((state) => ({ loading: { ...state.loading, analytics: false } }));
        }
      },

      saveTask: async (taskInput) => {
        const token = get().session.token;
        const editing = get().modals.taskEditing;

        if (!token) {
          return false;
        }

        try {
          if (editing?.id) {
            await taskApi.update(token, editing.id, toApiTaskPayload(taskInput));
            get().addActivity("TASK_UPDATED", { taskId: editing.id, title: taskInput.title });
            toast.success("Task updated.");
          } else {
            const response = await taskApi.create(token, toApiTaskPayload(taskInput));
            get().addActivity("TASK_CREATED", {
              taskId: response.task?._id || response.task?.id,
              title: taskInput.title,
            });
            toast.success("Task created.");
          }

          get().closeTaskModal();
          await get().refreshAfterTaskMutation();
          return true;
        } catch (error) {
          toast.error(error.message || "Failed to save task.");
          return false;
        }
      },

      deleteTask: async () => {
        const token = get().session.token;
        const target = get().modals.deleteTarget;

        if (!token || !target?.id) {
          return;
        }

        try {
          await taskApi.remove(token, target.id);
          get().closeDeleteModal();
          get().addActivity("TASK_DELETED", { taskId: target.id, title: target.title });
          toast.success("Task deleted.");
          await get().refreshAfterTaskMutation();
        } catch (error) {
          toast.error(error.message || "Failed to delete task.");
        }
      },

      updateTaskStatus: async (taskId, status) => {
        const token = get().session.token;
        if (!token) {
          return;
        }

        const previousTasks = get().tasks;
        const previousTask = previousTasks.find((task) => task.id === taskId);
        if (!previousTask || previousTask.status === status) {
          return;
        }

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completedAt:
                    status === TASK_STATUS.COMPLETED ? new Date().toISOString() : null,
                  deferredDate:
                    status === TASK_STATUS.DEFERRED ? dayjs().format("YYYY-MM-DD") : null,
                }
              : task
          ),
        }));

        try {
          const response = await taskApi.update(token, taskId, {
            status,
            deferredDate: status === TASK_STATUS.DEFERRED ? dayjs().format("YYYY-MM-DD") : null,
          });

          if (response?.task) {
            const updatedTask = normalizeTask(response.task);
            set((state) => ({
              tasks: state.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
            }));
          }

          get().addActivity("TASK_STATUS_UPDATED", { taskId, status });
          toast.success("Status updated.");
          await get().refreshAfterTaskMutation();
        } catch (error) {
          set({ tasks: previousTasks });
          toast.error(error.message || "Failed to update status.");
        }
      },

      exportCsv: () => {
        const tasks = get().tasks;
        if (!tasks.length) {
          toast.error("No tasks to export.");
          return;
        }

        const headers = [
          "id",
          "title",
          "description",
          "priority",
          "status",
          "dueDate",
          "deferredDate",
          "remarks",
          "createdAt",
        ];

        const escapeCell = (value) => {
          const raw = (value ?? "").toString();
          if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
            return `"${raw.replaceAll('"', '""')}"`;
          }
          return raw;
        };

        const rows = tasks.map((task) =>
          headers
            .map((key) => {
              if (key === "id") {
                return escapeCell(task.id || task._id);
              }
              return escapeCell(task[key]);
            })
            .join(",")
        );

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tasks-${dayjs().format("YYYY-MM-DD")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("CSV exported.");
      },

      importCsv: async (file) => {
        const token = get().session.token;
        if (!token) {
          return;
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(Boolean);

        if (lines.length < 2) {
          toast.error("CSV has no task rows.");
          return;
        }

        const [headerLine, ...rows] = lines;
        const headers = parseCsvRow(headerLine);
        const indexMap = Object.fromEntries(headers.map((header, index) => [header, index]));

        const readCell = (cells, key) => {
          const index = indexMap[key];
          return index !== undefined ? cells[index] || "" : "";
        };

        let createdCount = 0;

        for (const row of rows) {
          const cells = parseCsvRow(row);
          const title = readCell(cells, "title") || readCell(cells, "taskName");
          const dueDate = readCell(cells, "dueDate");

          if (!title || !dueDate) {
            continue;
          }

          try {
            await taskApi.create(token, {
              title,
              description: readCell(cells, "description"),
              priority: readCell(cells, "priority") || "Normal",
              status: readCell(cells, "status") || TASK_STATUS.NOT_STARTED,
              dueDate,
              deferredDate: readCell(cells, "deferredDate") || null,
              remarks: readCell(cells, "remarks"),
            });
            createdCount += 1;
          } catch {
            // Ignore invalid rows.
          }
        }

        await get().refreshAfterTaskMutation();
        get().addActivity("TASKS_IMPORTED", { count: createdCount });
        toast.success(`${createdCount} tasks imported.`);
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: state.ui,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {};

        return {
          ...currentState,
          ...persisted,
          ui: {
            ...currentState.ui,
            ...(persisted.ui || {}),
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.ui?.theme) {
          applyTheme(state.ui.theme);
        }
      },
    }
  )
);

configureApiAuth({
  getToken: () => useAppStore.getState().session.token,
  onTokenRefresh: (token) => {
    useAppStore.setState((state) => ({
      session: {
        ...state.session,
        token,
      },
    }));
  },
  onAuthFailure: () => {
    useAppStore.getState().handleAuthFailure();
  },
});

export const selectDashboardAnalytics = (state) => state.dashboardStats;
export const selectAnalyticsOverview = (state) => state.analyticsOverview;
