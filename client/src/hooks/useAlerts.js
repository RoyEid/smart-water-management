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
import { getApiErrorMessage, isUnauthorized } from "../utils/apiError";

/**
 * Feeds the notification bell.
 *
 * Loads the recent alerts once, then keeps them current over the existing
 * Socket.IO connection rather than polling. Uses the same shared socket as the
 * telemetry hook — no second connection is opened for notifications.
 */
export default function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchRecentAlerts();
      if (!mountedRef.current) return;
      setAlerts(data.alerts ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setError("");
    } catch (requestError) {
      if (!mountedRef.current) return;
      // A signed-out visitor is handled by the route guard; the bell just stays
      // quiet rather than showing an error over the whole header.
      if (!isUnauthorized(requestError)) {
        setError(getApiErrorMessage(requestError, "Unable to load notifications."));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const onAlertCreated = (alert) => {
      if (!mountedRef.current || !alert?.id) return;

      setAlerts((current) => {
        // The backend deduplicates conditions, but a reconnect can replay an
        // alert the list already holds. Matching on id keeps the list unique.
        const existingIndex = current.findIndex((item) => item.id === alert.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = alert;
          return next;
        }
        return [alert, ...current].slice(0, 8);
      });

      // Only a genuinely new unread alert moves the badge.
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

    // A reconnect may have missed events entirely, so the list is re-fetched
    // rather than assumed to still be accurate.
    const onConnect = () => load();

    sensorSocket.on("alert:new", onAlertCreated);
    sensorSocket.on("alert:resolved", onAlertResolved);
    sensorSocket.on("connect", onConnect);
    acquireSensorSocket();
    // react-hooks/set-state-in-effect cannot see that `load` only writes state
    // after its await resolves, so it reports a synchronous setState that does
    // not occur. Fetching the initial list alongside the socket subscription is
    // the correct place for this call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    return () => {
      mountedRef.current = false;
      sensorSocket.off("alert:new", onAlertCreated);
      sensorSocket.off("alert:resolved", onAlertResolved);
      sensorSocket.off("connect", onConnect);
      releaseSensorSocket();
    };
  }, [load]);

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
