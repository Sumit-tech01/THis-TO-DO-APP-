import { memo } from "react";

const pulse = "animate-pulse rounded-xl bg-slate-200/90 dark:bg-slate-800";

export const SummaryCardsSkeleton = memo(() => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className={`h-24 ${pulse}`} />
    ))}
  </div>
));

export const ChartsSkeleton = memo(() => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className={`h-72 ${pulse}`} />
    ))}
  </div>
));

export const TableSkeleton = memo(() => (
  <div className="panel p-4">
    <div className={`mb-3 h-10 ${pulse}`} />
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className={`mb-2 h-12 ${pulse}`} />
    ))}
  </div>
));
