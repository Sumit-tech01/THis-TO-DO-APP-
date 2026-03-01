import { useEffect, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

const resolveSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) {
    return explicit;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
  return apiBase.replace(/\/api\/?$/, "");
};

export const useRealtimeSocket = ({ token, workspaceId }) => {
  const applyRealtimeTaskEvent = useAppStore((state) => state.applyRealtimeTaskEvent);
  const applyRealtimeActivity = useAppStore((state) => state.applyRealtimeActivity);
  const scheduleRealtimeRefresh = useAppStore((state) => state.scheduleRealtimeRefresh);

  const socketUrl = useMemo(() => resolveSocketUrl(), []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let isDisposed = false;
    let socket = null;

    const onTaskCreated = (payload) => {
      applyRealtimeTaskEvent("TASK_CREATED", payload);
      scheduleRealtimeRefresh();
    };
    const onTaskUpdated = (payload) => {
      applyRealtimeTaskEvent("TASK_UPDATED", payload);
      scheduleRealtimeRefresh();
    };
    const onTaskCompleted = (payload) => {
      applyRealtimeTaskEvent("TASK_COMPLETED", payload);
      scheduleRealtimeRefresh();
    };
    const onTaskDeleted = (payload) => {
      applyRealtimeTaskEvent("TASK_DELETED", payload);
      scheduleRealtimeRefresh();
    };
    const onActivityCreated = (payload) => {
      applyRealtimeActivity(payload);
    };

    const attachHandlers = (instance) => {
      instance.on("TASK_CREATED", onTaskCreated);
      instance.on("TASK_UPDATED", onTaskUpdated);
      instance.on("TASK_COMPLETED", onTaskCompleted);
      instance.on("TASK_DELETED", onTaskDeleted);
      instance.on("ACTIVITY_CREATED", onActivityCreated);
    };

    const detachHandlers = (instance) => {
      instance.off("TASK_CREATED", onTaskCreated);
      instance.off("TASK_UPDATED", onTaskUpdated);
      instance.off("TASK_COMPLETED", onTaskCompleted);
      instance.off("TASK_DELETED", onTaskDeleted);
      instance.off("ACTIVITY_CREATED", onActivityCreated);
    };

    new Function("m", "return import(m)")("socket.io-client")
      .then((mod) => {
        if (isDisposed || !mod?.io) {
          return;
        }

        socket = mod.io(socketUrl, {
          transports: ["websocket"],
          withCredentials: true,
          auth: {
            token,
            workspaceId,
          },
        });
        attachHandlers(socket);
      })
      .catch(() => {
        // Realtime is optional in restricted environments.
      });

    return () => {
      isDisposed = true;
      if (socket) {
        detachHandlers(socket);
        socket.disconnect();
      }
    };
  }, [
    token,
    workspaceId,
    socketUrl,
    applyRealtimeTaskEvent,
    applyRealtimeActivity,
    scheduleRealtimeRefresh,
  ]);
};
