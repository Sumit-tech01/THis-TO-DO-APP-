import { memo, useMemo } from "react";
import { List } from "react-window";
import { FiArrowDown, FiArrowUp, FiEdit2, FiTrash2 } from "react-icons/fi";
import { STATUS_COLORS, STATUSES, TASK_STATUS } from "../../constants";
import { formatDate } from "../../utils/date";

const headerColumns = [
  { key: "serial", label: "S.No.", sortable: false },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "title", label: "Task Name", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "deferredDate", label: "Deferred Date", sortable: true },
  { key: "remarks", label: "Remarks", sortable: false },
  { key: "actions", label: "Actions", sortable: false },
];

const SortIndicator = ({ isActive, direction }) => {
  if (!isActive) {
    return <span className="text-xs text-slate-400">↕</span>;
  }

  return direction === "asc" ? (
    <FiArrowUp size={12} className="text-emerald-600" />
  ) : (
    <FiArrowDown size={12} className="text-emerald-600" />
  );
};

const Row = memo(({ index, style, tasks, serialStart, onEdit, onDelete, onStatusChange }) => {
  const task = tasks[index];
  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS[TASK_STATUS.NOT_STARTED];

  return (
    <div
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: "70px 140px 1.7fr 110px 220px 140px 1.5fr 120px",
      }}
      className="items-center gap-2 border-b border-slate-200 px-3 text-sm dark:border-slate-800"
    >
      <div className="font-semibold text-slate-600 dark:text-slate-300">{serialStart + index + 1}</div>
      <div>{formatDate(task.dueDate)}</div>
      <div className="truncate font-semibold" title={task.title}>
        {task.title}
      </div>
      <div>{task.priority}</div>
      <div>
        <div className="space-y-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
          >
            {task.status}
          </span>
          <select
            value={task.status}
            onChange={(event) => onStatusChange(task.id, event.target.value)}
            className="input-base max-w-[190px] py-1 text-xs"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>{formatDate(task.deferredDate)}</div>
      <div className="truncate text-slate-600 dark:text-slate-300" title={task.remarks || "-"}>
        {task.remarks || "-"}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="button-base border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={`Edit ${task.title}`}
        >
          <FiEdit2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="button-base border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/45"
          aria-label={`Delete ${task.title}`}
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
});

const TableView = ({
  tasks,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  totalPages,
  total,
  hasMore,
  mode,
  onSort,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const serialStart = (currentPage - 1) * pageSize;

  const listHeight = useMemo(() => Math.min(560, Math.max(tasks.length * 72, 100)), [tasks.length]);

  const rowProps = useMemo(
    () => ({
      tasks,
      serialStart,
      onEdit,
      onDelete,
      onStatusChange,
    }),
    [tasks, serialStart, onEdit, onDelete, onStatusChange]
  );

  return (
    <section className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 140px 1.7fr 110px 220px 140px 1.5fr 120px",
            }}
            className="sticky top-0 z-10 items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            {headerColumns.map((column) => (
              <div key={column.key}>
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="inline-flex items-center gap-1 hover:text-emerald-600"
                  >
                    {column.label}
                    <SortIndicator isActive={sortBy === column.key} direction={sortOrder} />
                  </button>
                ) : (
                  column.label
                )}
              </div>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
              No tasks found for current filters.
            </div>
          ) : (
            <List
              rowComponent={Row}
              rowCount={tasks.length}
              rowHeight={72}
              rowProps={rowProps}
              style={{ height: listHeight }}
              className="bg-white dark:bg-slate-900"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
        {mode === "cursor" ? (
          <p className="text-slate-600 dark:text-slate-300">
            Page {currentPage} {hasMore ? "• more pages available" : "• end of results"}
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-300">
            Page {currentPage} of {totalPages} • {total} tasks
          </p>
        )}

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="input-base w-auto py-1.5"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}/page
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={mode === "cursor" ? !hasMore : currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default memo(TableView);
