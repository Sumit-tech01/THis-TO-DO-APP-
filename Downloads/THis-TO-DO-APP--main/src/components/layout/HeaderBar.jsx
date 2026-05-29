import { memo } from "react";
import { FiLogOut } from "react-icons/fi";
import ThemeToggle from "../common/ThemeToggle";
import { VIEW_MODES } from "../../constants";

const HeaderBarComponent = ({
  user,
  theme,
  viewMode,
  onToggleTheme,
  onSetViewMode,
  onLogout,
}) => (
  <header className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
        Ultimate Activity & Task Management Dashboard
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
        Enterprise Task Intelligence
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Logged in as {user?.name} ({user?.email})
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
        {VIEW_MODES.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSetViewMode(view.id)}
            className={`button-base px-3 py-1.5 text-xs ${
              viewMode === view.id
                ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />

      <button
        type="button"
        onClick={onLogout}
        className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <FiLogOut size={15} /> Logout
      </button>
    </div>
  </header>
);

const HeaderBar = memo(HeaderBarComponent);

export default HeaderBar;
