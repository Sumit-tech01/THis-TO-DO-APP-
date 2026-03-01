import { useEffect, useMemo, useState } from "react";
import { FiBarChart2, FiLock, FiMail, FiUser } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAppStore } from "../../store/useAppStore";
import { useShallow } from "zustand/react/shallow";

const defaultLogin = {
  email: "",
  password: "",
};

const defaultRegister = {
  name: "",
  email: "",
  password: "",
};

const defaultReset = {
  password: "",
  confirmPassword: "",
};

const getResetTokenFromPath = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const [, path, token] = window.location.pathname.split("/");
  if (path === "reset-password" && token) {
    return decodeURIComponent(token);
  }

  return "";
};

const AuthScreen = () => {
  const [mode, setMode] = useState(() => (getResetTokenFromPath() ? "reset" : "login"));
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState(() => getResetTokenFromPath());
  const [resetForm, setResetForm] = useState(defaultReset);
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [registerForm, setRegisterForm] = useState(defaultRegister);

  const { login, register, forgotPassword, resetPassword, loading } = useAppStore(
    useShallow((state) => ({
      login: state.login,
      register: state.register,
      forgotPassword: state.forgotPassword,
      resetPassword: state.resetPassword,
      loading: state.loading,
    }))
  );

  const isBusy = loading.auth;

  useEffect(() => {
    const syncResetToken = () => {
      const token = getResetTokenFromPath();
      if (!token) {
        return;
      }

      setResetToken(token);
      setMode("reset");
    };

    window.addEventListener("popstate", syncResetToken);
    return () => window.removeEventListener("popstate", syncResetToken);
  }, []);

  const switchToLogin = () => {
    setMode("login");
    setForgotEmail("");
    setResetForm(defaultReset);

    if (window.location.pathname.startsWith("/reset-password/")) {
      window.history.replaceState({}, "", "/");
    }
  };

  const title = useMemo(() => {
    if (mode === "register") return "Create your account";
    if (mode === "forgot") return "Forgot password";
    if (mode === "reset") return "Reset your password";
    return "Sign in to dashboard";
  }, [mode]);

  const description = useMemo(() => {
    if (mode === "register") return "Create a secure account for your dashboard.";
    if (mode === "forgot") return "Enter your email to receive a secure password reset link.";
    if (mode === "reset") return "Set a new password for your account.";
    return "Authenticate to access your task management dashboard.";
  }, [mode]);

  const submit = async (event) => {
    event.preventDefault();

    if (mode === "login") {
      await login(loginForm);
      return;
    }

    if (mode === "register") {
      await register(registerForm);
      return;
    }

    if (mode === "forgot") {
      const email = forgotEmail.trim();
      if (!email) {
        toast.error("Email is required.");
        return;
      }

      const done = await forgotPassword(email);
      if (done) {
        setForgotEmail("");
        setMode("login");
      }
      return;
    }

    if (!resetToken) {
      toast.error("Reset token missing.");
      return;
    }

    if (resetForm.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const done = await resetPassword({
      token: resetToken,
      password: resetForm.password,
    });

    if (done) {
      setResetToken("");
      switchToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-sky-100 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto grid min-h-[90vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
        <section className="flex flex-col justify-center bg-gradient-to-br from-emerald-600 to-sky-700 p-8 text-white">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <FiBarChart2 size={24} />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight">
            Ultimate Activity & Task Management Dashboard
          </h1>
          <p className="mt-3 text-sm text-white/90">
            Secure task operations with JWT authentication, analytics, and enterprise-style
            execution workflows.
          </p>

          <div className="mt-8 space-y-3 text-sm">
            <p className="rounded-xl bg-white/10 px-4 py-3">JWT access + refresh auth</p>
            <p className="rounded-xl bg-white/10 px-4 py-3">Task analytics and completion insights</p>
            <p className="rounded-xl bg-white/10 px-4 py-3">Forgot/reset password with secure tokens</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={switchToLogin}
                className={`button-base flex-1 ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  if (window.location.pathname.startsWith("/reset-password/")) {
                    window.history.replaceState({}, "", "/");
                  }
                }}
                className={`button-base flex-1 ${
                  mode === "register"
                    ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Register
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && (
                <label className="relative block">
                  <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="input-base pl-9"
                    placeholder="Full name"
                    required
                  />
                </label>
              )}

              {mode !== "reset" && (
                <label className="relative block">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={
                      mode === "login"
                        ? loginForm.email
                        : mode === "forgot"
                          ? forgotEmail
                          : registerForm.email
                    }
                    onChange={(event) => {
                      const email = event.target.value;
                      if (mode === "login") {
                        setLoginForm((prev) => ({ ...prev, email }));
                      } else if (mode === "forgot") {
                        setForgotEmail(email);
                      } else {
                        setRegisterForm((prev) => ({ ...prev, email }));
                      }
                    }}
                    className="input-base pl-9"
                    placeholder="Email"
                    required
                  />
                </label>
              )}

              {(mode === "login" || mode === "register") && (
                <label className="relative block">
                  <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={mode === "login" ? loginForm.password : registerForm.password}
                    onChange={(event) => {
                      const password = event.target.value;
                      if (mode === "login") {
                        setLoginForm((prev) => ({ ...prev, password }));
                      } else {
                        setRegisterForm((prev) => ({ ...prev, password }));
                      }
                    }}
                    className="input-base pl-9"
                    placeholder="Password"
                    required
                    minLength={8}
                  />
                </label>
              )}

              {mode === "reset" && (
                <>
                  <label className="relative block">
                    <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(event) =>
                        setResetForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                      className="input-base pl-9"
                      placeholder="New password"
                      required
                      minLength={8}
                    />
                  </label>
                  <label className="relative block">
                    <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(event) =>
                        setResetForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      className="input-base pl-9"
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                    />
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="button-base w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy
                  ? "Please wait..."
                  : mode === "login"
                    ? "Login"
                    : mode === "register"
                      ? "Create Account"
                      : mode === "forgot"
                        ? "Send Reset Link"
                        : "Reset Password"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                onClick={() => setMode("forgot")}
              >
                Forgot your password?
              </button>
            )}

            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                onClick={switchToLogin}
              >
                Back to login
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthScreen;
