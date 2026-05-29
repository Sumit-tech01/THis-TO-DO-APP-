import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PRIORITY_COLORS = {
  High: "#ef4444",
  Normal: "#3b82f6",
  Low: "#10b981",
};

const MetricCard = ({ label, value, helper }) => (
  <article className="panel p-4">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
  </article>
);

const AdvancedAnalytics = ({ analytics }) => {
  const velocityTotal = useMemo(
    () =>
      (analytics?.weeklyVelocity || []).reduce(
        (sum, row) => sum + (Number.isFinite(row.completed) ? row.completed : 0),
        0
      ),
    [analytics?.weeklyVelocity]
  );

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overdue Risk Score"
          value={`${analytics.overdueRiskScore || 0}%`}
          helper="Weighted risk based on overdue and in-progress open tasks"
        />
        <MetricCard
          label="Consistency Score"
          value={`${analytics.completionConsistencyScore || 0}%`}
          helper="Lower weekly completion variance yields a higher score"
        />
        <MetricCard
          label="10-Week Velocity"
          value={velocityTotal}
          helper="Completed tasks in the last 10 weeks"
        />
        <MetricCard
          label="Avg Completion (Normal)"
          value={`${
            analytics.averageCompletionTimeByPriority?.find((row) => row.priority === "Normal")
              ?.averageHours || 0
          }h`}
          helper="Average hours for normal-priority tasks"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Weekly Completion Velocity
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeklyVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Average Completion Time By Priority
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.averageCompletionTimeByPriority || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="priority" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="averageHours" radius={[8, 8, 0, 0]}>
                  {(analytics.averageCompletionTimeByPriority || []).map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={PRIORITY_COLORS[entry.priority] || "#64748b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Task Aging Distribution
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.taskAgingDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
};

export default memo(AdvancedAnalytics);

