import { memo } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const ThemeToggleComponent = ({ theme, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="button-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    aria-label="Toggle theme"
  >
    {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
    <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
  </button>
);

const ThemeToggle = memo(ThemeToggleComponent);

export default ThemeToggle;
