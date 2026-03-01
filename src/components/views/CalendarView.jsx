import { memo, useMemo, useState } from "react";
import dayjs from "dayjs";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarView = ({ tasks, onSelectDate }) => {
  const [cursor, setCursor] = useState(dayjs().startOf("month"));

  const calendarData = useMemo(() => {
    const start = cursor.startOf("month").startOf("week");
    const end = cursor.endOf("month").endOf("week");
    const cells = [];

    let current = start;
    while (current.isBefore(end) || current.isSame(end, "day")) {
      cells.push(current);
      current = current.add(1, "day");
    }

    return cells;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map();

    tasks.forEach((task) => {
      const key = dayjs(task.dueDate).format("YYYY-MM-DD");
      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    });

    return map;
  }, [tasks]);

  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Calendar View: {cursor.format("MMMM YYYY")}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCursor((prev) => prev.subtract(1, "month"))}
            className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCursor((prev) => prev.add(1, "month"))}
            className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {dayHeaders.map((day) => (
          <div key={day} className="rounded-lg bg-slate-100 py-2 dark:bg-slate-800">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {calendarData.map((date) => {
          const key = date.format("YYYY-MM-DD");
          const dayTasks = tasksByDate.get(key) || [];
          const isCurrentMonth = date.month() === cursor.month();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`min-h-[120px] rounded-xl border p-2 text-left transition ${
                isCurrentMonth
                  ? "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                  : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500"
              }`}
            >
              <p className="text-xs font-semibold">{date.format("DD")}</p>
              <div className="mt-2 space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <p
                    key={task.id}
                    className="truncate rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                    title={task.title}
                  >
                    {task.title}
                  </p>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default memo(CalendarView);
