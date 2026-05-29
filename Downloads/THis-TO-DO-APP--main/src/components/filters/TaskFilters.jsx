import { memo, useRef } from "react";
import {
  FiDownload,
  FiFilter,
  FiPlus,
  FiSearch,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { PRIORITIES, STATUSES } from "../../constants";

const TaskFilters = ({
  filters,
  searchValue,
  onSearchChange,
  onFilterChange,
  onOpenTaskModal,
  onClearFilters,
  onExport,
  onImport,
  searchInputRef,
}) => {
  const fileInputRef = useRef(null);

  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <FiFilter size={16} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filter Tasks</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="relative xl:col-span-2">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="input-base pl-9"
            placeholder="Search task, remarks, status..."
          />
        </label>

        <select
          value={filters.priority}
          onChange={(event) => onFilterChange("priority", event.target.value)}
          className="input-base"
        >
          <option value="All">All Priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => onFilterChange("status", event.target.value)}
          className="input-base"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={(event) => onFilterChange("month", event.target.value)}
          className="input-base"
          aria-label="Selected Month"
        />

        <input
          type="date"
          value={filters.dueDate}
          onChange={(event) => onFilterChange("dueDate", event.target.value)}
          className="input-base"
          aria-label="Date picker"
        />

        <button
          type="button"
          onClick={onOpenTaskModal}
          className="button-base bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <FiPlus size={16} /> Add / Update
        </button>

        <button
          type="button"
          onClick={onExport}
          className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FiDownload size={16} /> Export CSV
        </button>

        <button
          type="button"
          onClick={triggerImport}
          className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FiUpload size={16} /> Import CSV
        </button>

        <button
          type="button"
          onClick={onClearFilters}
          className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FiX size={16} /> Clear
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImport(file);
            }
          }}
        />
      </div>
    </section>
  );
};

export default memo(TaskFilters);
