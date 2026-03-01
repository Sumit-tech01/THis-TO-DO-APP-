const API_BASE_URL = String(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

let getAccessToken = () => null;
let setAccessToken = () => {};
let handleAuthFailure = () => {};
let refreshPromise = null;

export const configureApiAuth = ({ getToken, onTokenRefresh, onAuthFailure }) => {
  if (typeof getToken === "function") {
    getAccessToken = getToken;
  }
  if (typeof onTokenRefresh === "function") {
    setAccessToken = onTokenRefresh;
  }
  if (typeof onAuthFailure === "function") {
    handleAuthFailure = onAuthFailure;
  }
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildUrl = (path, query = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const shouldAttemptRefresh = (path) =>
  !path.startsWith("/auth/refresh") &&
  !path.startsWith("/auth/login") &&
  !path.startsWith("/auth/register");

const buildRequestOptions = ({ method, token, body, formData, signal }) => {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestOptions = {
    method,
    headers,
    credentials: "include",
    signal,
  };

  if (formData) {
    requestOptions.body = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(body);
  }

  return requestOptions;
};

const rawRequest = async ({ path, method, token, query, body, formData, signal }) => {
  const response = await fetch(
    buildUrl(path, query),
    buildRequestOptions({
      method,
      token,
      body,
      formData,
      signal,
    })
  );

  const payload = await parseJsonSafely(response);
  return { response, payload };
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { response, payload } = await rawRequest({
        path: "/auth/refresh",
        method: "POST",
      });

      if (!response.ok) {
        const refreshError = new Error(payload?.message || "Failed to refresh access token");
        refreshError.status = response.status;
        throw refreshError;
      }

      const accessToken = payload?.tokens?.accessToken || null;
      if (!accessToken) {
        throw new Error("Invalid refresh response");
      }

      setAccessToken(accessToken);
      return accessToken;
    })()
      .catch((error) => {
        handleAuthFailure();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const apiRequest = async ({
  path,
  method = "GET",
  token,
  query,
  body,
  formData,
  signal,
  retryOn401 = true,
}) => {
  const resolvedToken = token ?? getAccessToken();

  let response;
  let payload;

  try {
    ({ response, payload } = await rawRequest({
      path,
      method,
      token: resolvedToken,
      query,
      body,
      formData,
      signal,
    }));
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    const networkError = new Error(
      `Failed to reach API (${API_BASE_URL}). Ensure backend is running and CORS allows this origin.`
    );
    networkError.status = 0;
    throw networkError;
  }

  if (
    response.status === 401 &&
    retryOn401 &&
    shouldAttemptRefresh(path) &&
    !signal?.aborted
  ) {
    try {
      const nextToken = await refreshAccessToken();
      return apiRequest({
        path,
        method,
        token: nextToken,
        query,
        body,
        formData,
        signal,
        retryOn401: false,
      });
    } catch {
      // Fall through and return the original 401 error payload.
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `API request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
