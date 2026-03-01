import { memo, useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import { PRIORITIES, STATUSES, TASK_STATUS } from "../../constants";

const emptyTask = {
  title: "",
  description: "",
  dueDate: "",
  priority: "Normal",
  status: TASK_STATUS.NOT_STARTED,
  deferredDate: "",
  remarks: "",
};

const TaskFormModal = ({ isOpen, initialTask, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(emptyTask);
  const [error, setError] = useState("");

  const title = useMemo(() => (initialTask ? "Update Task" : "Create Task"), [initialTask]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialTask) {
      setFormData({
        title: initialTask.title || "",
        description: initialTask.description || "",
        dueDate: initialTask.dueDate?.slice(0, 10) || "",
        priority: initialTask.priority || "Normal",
        status: initialTask.status || TASK_STATUS.NOT_STARTED,
        deferredDate: initialTask.deferredDate?.slice(0, 10) || "",
        remarks: initialTask.remarks || "",
      });
    } else {
      setFormData(emptyTask);
    }

    setError("");
  }, [isOpen, initialTask]);

  if (!isOpen) {
    return null;
  }

  const setValue = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "status" && value !== TASK_STATUS.DEFERRED ? { deferredDate: "" } : {}),
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!formData.dueDate) {
      setError("Due date is required.");
      return;
    }

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      remarks: formData.remarks.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4">
      <div className="panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FiX size={18} />
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/25 dark:text-red-200">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setValue("title", event.target.value)}
              className="input-base"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(event) => setValue("description", event.target.value)}
              className="input-base resize-none"
              placeholder="Task description"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(event) => setValue("dueDate", event.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Priority</label>
              <select
                value={formData.priority}
                onChange={(event) => setValue("priority", event.target.value)}
                className="input-base"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Status</label>
              <select
                value={formData.status}
                onChange={(event) => setValue("status", event.target.value)}
                className="input-base"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Deferred Date</label>
            <input
              type="date"
              value={formData.deferredDate}
              disabled={formData.status !== TASK_STATUS.DEFERRED}
              onChange={(event) => setValue("deferredDate", event.target.value)}
              className="input-base disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Remarks</label>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={(event) => setValue("remarks", event.target.value)}
              className="input-base resize-none"
              placeholder="Optional remarks"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button type="submit" className="button-base bg-emerald-600 text-white hover:bg-emerald-700">
              {initialTask ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default memo(TaskFormModal);
