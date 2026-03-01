import { apiRequest } from "./client";

export const authApi = {
  register: (data, options = {}) =>
    apiRequest({ path: "/auth/register", method: "POST", body: data, ...options }),
  login: (data, options = {}) =>
    apiRequest({ path: "/auth/login", method: "POST", body: data, ...options }),
  refresh: (options = {}) => apiRequest({ path: "/auth/refresh", method: "POST", ...options }),
  me: (token, options = {}) => apiRequest({ path: "/auth/me", token, ...options }),
  logout: (token, options = {}) =>
    apiRequest({ path: "/auth/logout", method: "POST", token, ...options }),
  logoutAll: (token, options = {}) =>
    apiRequest({ path: "/auth/logout-all", method: "POST", token, ...options }),
  sessions: (token, options = {}) => apiRequest({ path: "/auth/sessions", token, ...options }),
  revokeSession: (token, sessionId, options = {}) =>
    apiRequest({
      path: `/auth/sessions/${sessionId}`,
      method: "DELETE",
      token,
      ...options,
    }),
  forgotPassword: (data) =>
    apiRequest({ path: "/auth/forgot-password", method: "POST", body: data }),
  resetPassword: (data) =>
    apiRequest({ path: "/auth/reset-password", method: "POST", body: data }),
};

export const taskApi = {
  list: (token, query, options = {}) => apiRequest({ path: "/tasks", token, query, ...options }),
  stats: (token, query, options = {}) =>
    apiRequest({ path: "/tasks/stats", token, query, ...options }),
  create: (token, data, options = {}) =>
    apiRequest({ path: "/tasks", method: "POST", token, body: data, ...options }),
  update: (token, taskId, data, options = {}) =>
    apiRequest({
      path: `/tasks/${taskId}`,
      method: "PUT",
      token,
      body: data,
      ...options,
    }),
  remove: (token, taskId, options = {}) =>
    apiRequest({
      path: `/tasks/${taskId}`,
      method: "DELETE",
      token,
      ...options,
    }),
};

export const analyticsApi = {
  overview: (token, query, options = {}) =>
    apiRequest({
      path: "/analytics/overview",
      token,
      query,
      ...options,
    }),
};
