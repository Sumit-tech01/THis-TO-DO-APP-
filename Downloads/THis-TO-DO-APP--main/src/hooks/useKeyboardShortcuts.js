import { useEffect } from "react";

export const useKeyboardShortcuts = ({ onAddTask, onFocusSearch, onToggleTheme }) => {
  useEffect(() => {
    const handler = (event) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onAddTask();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        onToggleTheme();
        return;
      }

      if (!isInputFocused && event.key === "a") {
        onAddTask();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAddTask, onFocusSearch, onToggleTheme]);
};
