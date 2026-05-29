import { memo, useMemo } from "react";
import dayjs from "dayjs";

const ActivityFeed = ({ logs }) => {
  const visibleActivity = useMemo(
    () =>
      logs.filter((entry) => {
        const type = entry.type || entry.action;
        return type === "USER_LOGGED_IN" || type === "USER_LOGGED_OUT";
      }),
    [logs]
  );

  return (
    <section className="panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Recent Activity
      </h3>
      {visibleActivity.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity yet.</p>
      ) : (
        <div className="space-y-3">
          {visibleActivity.map((log) => (
            <article key={log.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                {log.type || log.action}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {log.user?.name || "User"} • {dayjs(log.createdAt).format("MMM DD, YYYY HH:mm")}
              </p>
              {log.meta && Object.keys(log.meta).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-2 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {JSON.stringify(log.meta, null, 2)}
                </pre>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default memo(ActivityFeed);
