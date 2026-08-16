import { useCallback, useEffect, useRef, useState } from "react";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";
import {
  fetchRecentAlerts,
  markAlertRead as markAlertReadRequest,
  markAllAlertsRead as markAllAlertsReadRequest,
} from "../services/alertApi";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage, isUnauthorized } from "../utils/apiError";

/**
 * Feeds the notification bell.
 *
 * Loads the recent alerts once, then keeps them current over the existing
 * Socket.IO connection rather than polling. Uses the same shared socket as the
 * telemetry hook — no second connection is opened for notifications.
 */
export default function useAlerts() {
  const { user, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      if (mountedRef.current) {
        setAlerts([]);
        setUnreadCount(0);
        setIsLoading(false);
      }
      return;
    }

    try {
      const data = await fetchRecentAlerts();
      if (!mountedRef.current) return;
      setAlerts(data.alerts ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setError("");
    } catch (requestError) {
      if (!mountedRef.current) return;
      if (!isUnauthorized(requestError)) {
        setError(getApiErrorMessage(requestError, "Unable to load notifications."));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setAlerts([]);
    setUnreadCount(0);
    setIsLoading(true);
    setError("");
  }, [user?._id]);

  useEffect(() => {
    mountedRef.current = true;

    const onAlertCreated = (alert) => {
      if (!mountedRef.current || !alert?.id) return;

      setAlerts((current) => {
        const existingIndex = current.findIndex((item) => item.id === alert.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = alert;
          return next;
        }
        return [alert, ...current].slice(0, 8);
      });

      setUnreadCount((count) => (alert.isRead ? count : count + 1));
    };

    const onAlertResolved = ({ id, resolvedAt }) => {
      if (!mountedRef.current || !id) return;
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === id ? { ...alert, isResolved: true, resolvedAt } : alert
        )
      );
    };

    const onConnect = () => load();

    sensorSocket.on("alert:new", onAlertCreated);
    sensorSocket.on("alert:resolved", onAlertResolved);
    sensorSocket.on("connect", onConnect);
    acquireSensorSocket();

    load();

    return () => {
      mountedRef.current = false;
      sensorSocket.off("alert:new", onAlertCreated);
      sensorSocket.off("alert:resolved", onAlertResolved);
      sensorSocket.off("connect", onConnect);
      releaseSensorSocket();
    };
  }, [load, user?._id]);

  const markRead = useCallback(async (id) => {
    // Optimistic: the bell should respond immediately. The server response
    // then supplies the authoritative count.
    setAlerts((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, isRead: true } : alert))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const data = await markAlertReadRequest(id);
      if (mountedRef.current && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Re-sync from the server rather than guessing what the true state is.
      load();
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    setAlerts((current) => current.map((alert) => ({ ...alert, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllAlertsReadRequest();
    } catch {
      load();
    }
  }, [load]);

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    refresh: load,
    markRead,
    markAllRead,
  };
}
