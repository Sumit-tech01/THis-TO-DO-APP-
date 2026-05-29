import { memo, useCallback, useMemo } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { STATUSES, STATUS_COLORS } from "../../constants";
import { formatDate } from "../../utils/date";

const DraggableCard = memo(({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow ${
        isDragging ? "opacity-60" : "opacity-100"
      } dark:border-slate-700 dark:bg-slate-900`}
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {formatDate(task.dueDate)}</p>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Priority: {task.priority}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        Assignee: {task.assignedUser?.name || "Unassigned"}
      </p>
    </article>
  );
});

const DropColumn = memo(({ status, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const statusStyle = STATUS_COLORS[status];

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3 transition dark:border-slate-700 dark:bg-slate-800/40 ${
        isOver ? "ring-2 ring-emerald-400" : ""
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
          {status}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-300">{tasks.length}</span>
      </header>

      <div className="space-y-2">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
});

const KanbanView = ({ tasks, onStatusChange }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(
    () =>
      STATUSES.reduce((acc, status) => {
        acc[status] = tasks.filter((task) => task.status === status);
        return acc;
      }, {}),
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const taskId = event.active?.id;
      const newStatus = event.over?.id;

      if (!taskId || !newStatus || !STATUSES.includes(newStatus)) {
        return;
      }

      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === newStatus) {
        return;
      }

      onStatusChange(taskId, newStatus);
    },
    [tasks, onStatusChange]
  );

  return (
    <section className="panel p-4">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          {STATUSES.map((status) => (
            <DropColumn key={status} status={status} tasks={grouped[status] || []} />
          ))}
        </div>
      </DndContext>
    </section>
  );
};

export default memo(KanbanView);
