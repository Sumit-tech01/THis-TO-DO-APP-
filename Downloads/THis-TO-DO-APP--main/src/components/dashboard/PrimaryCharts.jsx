import { memo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CompletionChart = memo(({ completedCount, totalCount, completionPercent }) => {
  const data = [
    { name: "Completed", value: completedCount, color: "#10b981" },
    { name: "Remaining", value: Math.max(totalCount - completedCount, 0), color: "#e2e8f0" },
  ];

  return (
    <article className="panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Task Completion %</h3>
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{completionPercent}%</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
        </div>
      </div>
    </article>
  );
});

const PriorityChart = memo(({ data }) => (
  <article className="panel p-4">
    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Task by Priority</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </article>
));

const StatusChart = memo(({ data }) => (
  <article className="panel p-4">
    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Task by Status</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 10, left: 20, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={92} />
          <Tooltip />
          <Bar dataKey="count" radius={[0, 10, 10, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </article>
));

const PrimaryCharts = ({ completedCount, totalCount, completionPercent, priorityData, statusData }) => (
  <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
    <CompletionChart
      completedCount={completedCount}
      totalCount={totalCount}
      completionPercent={completionPercent}
    />
    <PriorityChart data={priorityData} />
    <StatusChart data={statusData} />
  </section>
);

export default memo(PrimaryCharts);
