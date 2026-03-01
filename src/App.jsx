import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import AuthScreen from "./components/auth/AuthScreen";
import ConfirmModal from "./components/common/ConfirmModal";
import { ChartsSkeleton, SummaryCardsSkeleton, TableSkeleton } from "./components/common/Skeletons";
import SummaryCards from "./components/dashboard/SummaryCards";
import TaskFilters from "./components/filters/TaskFilters";
import HeaderBar from "./components/layout/HeaderBar";
import Sidebar from "./components/layout/Sidebar";
import ActivityFeed from "./components/metrics/ActivityFeed";
import TaskFormModal from "./components/modals/TaskFormModal";
import { PRIORITY_COLORS, STATUS_COLORS } from "./constants";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useRealtimeSocket } from "./hooks/useRealtimeSocket";
import {
  selectAnalyticsOverview,
  selectDashboardAnalytics,
  useAppStore,
} from "./store/useAppStore";

const PrimaryCharts = lazy(() => import("./components/dashboard/PrimaryCharts"));
const AdvancedAnalytics = lazy(() => import("./components/metrics/AdvancedAnalytics"));
const CalendarView = lazy(() => import("./components/views/CalendarView"));
const KanbanView = lazy(() => import("./components/views/KanbanView"));
const TableView = lazy(() => import("./components/views/TableView"));

const App = () => {
  const {
    session,
    ui,
    filters,
    tasks,
    activity,
    taskPagination,
    loading,
    modals,
    hydrateTheme,
    bootstrapSession,
    toggleTheme,
    toggleSidebar,
    setViewMode,
    setFilter,
    setPagination,
    setSorting,
    resetFilters,
    openTaskModal,
    closeTaskModal,
    openDeleteModal,
    closeDeleteModal,
    logout,
    fetchTasks,
    fetchDashboardStats,
    fetchAnalyticsOverview,
    saveTask,
    deleteTask,
    updateTaskStatus,
    exportCsv,
    importCsv,
  } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      ui: state.ui,
      filters: state.filters,
      tasks: state.tasks,
      activity: state.activity,
      taskPagination: state.taskPagination,
      loading: state.loading,
      modals: state.modals,
      hydrateTheme: state.hydrateTheme,
      bootstrapSession: state.bootstrapSession,
      toggleTheme: state.toggleTheme,
      toggleSidebar: state.toggleSidebar,
      setViewMode: state.setViewMode,
      setFilter: state.setFilter,
      setPagination: state.setPagination,
      setSorting: state.setSorting,
      resetFilters: state.resetFilters,
      openTaskModal: state.openTaskModal,
      closeTaskModal: state.closeTaskModal,
      openDeleteModal: state.openDeleteModal,
      closeDeleteModal: state.closeDeleteModal,
      logout: state.logout,
      fetchTasks: state.fetchTasks,
      fetchDashboardStats: state.fetchDashboardStats,
      fetchAnalyticsOverview: state.fetchAnalyticsOverview,
      saveTask: state.saveTask,
      deleteTask: state.deleteTask,
      updateTaskStatus: state.updateTaskStatus,
      exportCsv: state.exportCsv,
      importCsv: state.importCsv,
    }))
  );

  const dashboardStats = useAppStore(selectDashboardAnalytics);
  const analyticsOverview = useAppStore(selectAnalyticsOverview);

  const searchInputRef = useRef(null);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const isAuthenticated = Boolean(session.token && session.user);

  useRealtimeSocket({
    token: session.token,
    workspaceId: session.user?.defaultWorkspaceId,
  });

  useEffect(() => {
    hydrateTheme();
    bootstrapSession();
  }, [bootstrapSession, hydrateTheme]);

  useEffect(() => {
    setFilter("search", debouncedSearch);
  }, [debouncedSearch, setFilter]);

  useEffect(() => {
    if (!session.token) {
      return;
    }

    fetchTasks();
  }, [
    session.token,
    filters.priority,
    filters.status,
    filters.month,
    filters.dueDate,
    filters.search,
    filters.sortBy,
    filters.sortOrder,
    taskPagination.page,
    taskPagination.limit,
    fetchTasks,
  ]);

  useEffect(() => {
    if (!session.token) {
      return;
    }

    fetchDashboardStats();
  }, [session.token, fetchDashboardStats]);

  useEffect(() => {
    if (!session.token) {
      return;
    }

    fetchAnalyticsOverview();
  }, [session.token, fetchAnalyticsOverview]);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleOpenTaskModal = useCallback(() => openTaskModal(null), [openTaskModal]);

  useKeyboardShortcuts({
    onAddTask: handleOpenTaskModal,
    onFocusSearch: focusSearch,
    onToggleTheme: toggleTheme,
  });

  const filteredTasks = useMemo(() => tasks, [tasks]);

  const summary = dashboardStats.summary;
  const completionPercent = dashboardStats.completionPercent;
  const priorityData = useMemo(
    () =>
      (dashboardStats.priorityData || []).map((item) => ({
        ...item,
        fill: PRIORITY_COLORS[item.name] || "#94a3b8",
      })),
    [dashboardStats.priorityData]
  );
  const statusData = useMemo(
    () =>
      (dashboardStats.statusData || []).map((item) => ({
        ...item,
        fill: STATUS_COLORS[item.name]?.chart || "#94a3b8",
      })),
    [dashboardStats.statusData]
  );

  const handleSort = useCallback((key) => setSorting(key), [setSorting]);
  const handleSearchChange = useCallback((value) => setSearchInput(value), []);
  const handleFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);
  const handlePageChange = useCallback((page) => setPagination({ page }), [setPagination]);
  const handlePageSizeChange = useCallback((limit) => setPagination({ limit }), [setPagination]);

  const renderCurrentView = useMemo(() => {
    if (ui.viewMode === "kanban") {
      return <KanbanView tasks={filteredTasks} onStatusChange={updateTaskStatus} />;
    }

    if (ui.viewMode === "calendar") {
      return (
        <CalendarView
          tasks={filteredTasks}
          onSelectDate={(date) => {
            setFilter("dueDate", date);
          }}
        />
      );
    }

    return (
      <TableView
        tasks={filteredTasks}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        currentPage={taskPagination.page}
        pageSize={taskPagination.limit}
        totalPages={taskPagination.totalPages}
        total={taskPagination.total}
        hasMore={taskPagination.hasMore}
        mode={taskPagination.mode}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={openTaskModal}
        onDelete={openDeleteModal}
        onStatusChange={updateTaskStatus}
      />
    );
  }, [
    ui.viewMode,
    filteredTasks,
    updateTaskStatus,
    setFilter,
    filters.sortBy,
    filters.sortOrder,
    taskPagination.page,
    taskPagination.limit,
    taskPagination.totalPages,
    taskPagination.total,
    taskPagination.hasMore,
    taskPagination.mode,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    openTaskModal,
    openDeleteModal,
  ]);

  if (!isAuthenticated && !loading.bootstrap) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-right" />
      </>
    );
  }

  if (loading.bootstrap && !isAuthenticated) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center text-slate-600 dark:text-slate-300">
          Restoring session...
        </div>
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen p-3 md:p-4">
        <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-4 lg:flex-row">
          <Sidebar
            collapsed={ui.sidebarCollapsed}
            onToggle={toggleSidebar}
            selectedDate={filters.dueDate}
            onDateSelect={(date) => setFilter("dueDate", date)}
          />

          <main className="flex-1 space-y-4">
            <HeaderBar
              user={session.user}
              theme={ui.theme}
              viewMode={ui.viewMode}
              onToggleTheme={toggleTheme}
              onSetViewMode={setViewMode}
              onLogout={logout}
            />

            {loading.tasks ? <SummaryCardsSkeleton /> : <SummaryCards summary={summary} />}

            {loading.tasks ? (
              <ChartsSkeleton />
            ) : (
              <Suspense fallback={<ChartsSkeleton />}>
                <PrimaryCharts
                  completedCount={summary.completed}
                  totalCount={summary.total}
                  completionPercent={completionPercent}
                  priorityData={priorityData}
                  statusData={statusData}
                />
              </Suspense>
            )}

            <Suspense fallback={<ChartsSkeleton />}>
              <AdvancedAnalytics analytics={analyticsOverview} />
            </Suspense>

            <TaskFilters
              filters={filters}
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onOpenTaskModal={handleOpenTaskModal}
              onClearFilters={resetFilters}
              onExport={exportCsv}
              onImport={importCsv}
              searchInputRef={searchInputRef}
            />

            {loading.tasks ? (
              <TableSkeleton />
            ) : (
              <Suspense fallback={<TableSkeleton />}>{renderCurrentView}</Suspense>
            )}

            <ActivityFeed logs={activity} />
          </main>
        </div>
      </div>

      <TaskFormModal
        isOpen={modals.taskOpen}
        initialTask={modals.taskEditing}
        onClose={closeTaskModal}
        onSubmit={saveTask}
      />

      <ConfirmModal
        isOpen={modals.deleteOpen}
        title="Delete Task"
        description={`Delete "${modals.deleteTarget?.title || "this task"}" permanently?`}
        onCancel={closeDeleteModal}
        onConfirm={deleteTask}
      />

      <Toaster position="top-right" />
    </>
  );
};

export default App;
