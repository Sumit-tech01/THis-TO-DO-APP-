import { memo, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiHelpCircle,
  FiLifeBuoy,
  FiLayers,
  FiPieChart,
  FiTable,
} from "react-icons/fi";

const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendar = (cursorDate) => {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const SidebarComponent = ({
  collapsed,
  onToggle,
  selectedDate,
  onDateSelect,
}) => {
  const contentClass = collapsed ? "lg:hidden" : "";
  const [cursorDate, setCursorDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const calendarCells = useMemo(() => buildCalendar(cursorDate), [cursorDate]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(cursorDate),
    [cursorDate]
  );

  return (
    <aside
      className={`panel w-full transition-all duration-300 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] ${
        collapsed ? "lg:w-24" : "lg:w-80"
      }`}
    >
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className={`min-w-0 ${contentClass}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enterprise Workspace
            </p>
            <h2 className="truncate text-lg font-bold">Activity Command Center</h2>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="button-base h-10 w-10 border border-slate-300 bg-slate-50 p-0 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <FiChevronRight size={17} /> : <FiChevronLeft size={17} />}
          </button>
        </div>

        <section className={`space-y-2 ${contentClass}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Navigation
          </h3>
          <div className="space-y-2">
            <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <FiTable size={14} /> Task Table
            </p>
            <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <FiLayers size={14} /> Kanban Board
            </p>
            <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <FiPieChart size={14} /> Analytics
            </p>
          </div>
        </section>

        <section className={`space-y-2 ${contentClass}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Calendar
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setCursorDate(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
                className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FiChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCursorDate(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
                className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-center text-xs font-semibold">{monthLabel}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {dayHeaders.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells.map((date, index) => {
                if (!date) {
                  return <span key={`empty-${index}`} className="h-6" />;
                }

                const dateKey = toISODate(date);
                const selected = selectedDate === dateKey;
                const today = dateKey === toISODate(new Date());

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onDateSelect(selected ? "" : dateKey)}
                    className={`h-6 rounded-md text-[10px] transition ${
                      selected
                        ? "bg-emerald-500 text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    } ${today && !selected ? "ring-1 ring-emerald-400" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`mt-auto space-y-3 ${contentClass}`}>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FiHelpCircle size={15} /> Help Section
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Press `Ctrl + K` for search, `Ctrl + N` for new task.
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-900/25 dark:text-emerald-100">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FiLifeBuoy size={14} /> Contact Support
            </p>
            <p className="mt-1 text-xs">enterprise-support@activityhub.com</p>
            <p className="text-xs">+1 (800) 555-0128</p>
          </div>
        </section>
      </div>
    </aside>
  );
};

const Sidebar = memo(SidebarComponent);

export default Sidebar;
