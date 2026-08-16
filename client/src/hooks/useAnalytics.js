import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAnalyticsOverview } from "../services/deviceApi";
import { useAuth } from "../context/AuthContext";

export default function useAnalytics(initialRange = "24h") {
  const { user, isAuthenticated } = useAuth();
  const [range, setRange] = useState(initialRange);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    setAnalytics(null);
    setError(null);
    setLoading(true);
  }, [user?._id]);

  const loadData = useCallback(async (targetRange) => {
    if (!isAuthenticated) {
      if (mountedRef.current) {
        setAnalytics(null);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAnalyticsOverview({ range: targetRange });
      if (mountedRef.current) {
        setAnalytics(data?.analytics ?? null);
        setLastRefreshedAt(new Date());
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load analytics telemetry."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function execute() {
      try {
        const data = await fetchAnalyticsOverview({ range });
        if (!cancelled && mountedRef.current) {
          setAnalytics(data?.analytics ?? null);
          setLastRefreshedAt(new Date());
          setError(null);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load analytics telemetry."
          );
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void execute();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [range]);

  const changeRange = (newRange) => {
    if (newRange !== range) {
      setLoading(true);
      setRange(newRange);
    }
  };

  const refresh = () => {
    void loadData(range);
  };

  return {
    range,
    setRange: changeRange,
    analytics,
    loading,
    error,
    lastRefreshedAt,
    refresh,
  };
}
