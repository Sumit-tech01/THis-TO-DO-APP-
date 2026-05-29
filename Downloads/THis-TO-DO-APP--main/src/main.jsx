import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./index.css";

try {
  const raw =
    window.localStorage.getItem("ultimate_dashboard_app_store_v3") ||
    window.localStorage.getItem("ultimate_dashboard_app_store_v2");
  const parsed = raw ? JSON.parse(raw) : null;
  const nextTheme = parsed?.state?.ui?.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
} catch {
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
