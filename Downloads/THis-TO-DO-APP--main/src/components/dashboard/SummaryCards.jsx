import { memo } from "react";
import {
  FiCheckCircle,
  FiCircle,
  FiClipboard,
  FiClock,
  FiPauseCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const cards = [
  { key: "total", title: "Total Tasks", icon: FiClipboard, bg: "from-slate-700 to-slate-800" },
  {
    key: "notStarted",
    title: "Not Started",
    icon: FiCircle,
    bg: "from-slate-500 to-slate-600",
  },
  { key: "onHold", title: "On Hold", icon: FiPauseCircle, bg: "from-amber-500 to-amber-600" },
  {
    key: "inProgress",
    title: "In Progress",
    icon: FiRefreshCw,
    bg: "from-sky-500 to-sky-600",
  },
  { key: "deferred", title: "Deferred", icon: FiClock, bg: "from-orange-500 to-orange-600" },
  {
    key: "completed",
    title: "Completed",
    icon: FiCheckCircle,
    bg: "from-emerald-500 to-emerald-600",
  },
];

const SummaryCard = memo(({ title, icon: Icon, value, bg }) => {
  const animated = useAnimatedNumber(value, 550);

  return (
    <article
      className={`rounded-2xl bg-gradient-to-br ${bg} p-4 text-white shadow-card transition-transform duration-200 hover:-translate-y-1`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{title}</p>
        <Icon size={18} />
      </div>
      <p className="text-3xl font-extrabold leading-none">{animated}</p>
    </article>
  );
});

const SummaryCards = ({ summary }) => (
  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    {cards.map((card) => (
      <SummaryCard
        key={card.key}
        title={card.title}
        icon={card.icon}
        value={summary[card.key] ?? 0}
        bg={card.bg}
      />
    ))}
  </section>
);

export default memo(SummaryCards);
