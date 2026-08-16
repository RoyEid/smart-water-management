import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";
import { fetchLatestUltrasonicReading } from "../services/sensorApi";
import { fetchDevice, fetchDevices } from "../services/deviceApi";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage, isUnauthorized } from "../utils/apiError";

const ONLINE_WINDOW_MS = 10_000;

// Bounded so a dashboard left open overnight cannot grow without limit. At one
// reading every 2 s this is the last two minutes, which is what the recent
// history chart shows.
const MAX_HISTORY_POINTS = 60;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isTankObj(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    isFiniteNumber(obj.distanceCm) &&
    isFiniteNumber(obj.percentage) &&
    isFiniteNumber(obj.waterHeightCm) &&
    typeof obj.tankStatus === "string"
  );
}

/**
 * Accepts either field name the backend may send, and either a Date or an ISO
 * string, so a naming or type difference can never make a live device look
 * offline. Returns NaN when there is genuinely no usable timestamp.
 */
function readingTime(value) {
  const raw = value?.receivedAt ?? value?.timestamp;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Date.parse(raw);
  return NaN;
}

function isReading(value) {
  if (!value || typeof value.deviceId !== "string") return false;
  if (!Number.isFinite(readingTime(value))) return false;

  if (value.upperTank || value.lowerTank) {
    return (
      (!value.upperTank || isTankObj(value.upperTank)) &&
      (!value.lowerTank || isTankObj(value.lowerTank))
    );
  }

  return (
    isFiniteNumber(value.percentage) &&
    isFiniteNumber(value.waterHeightCm) &&
    typeof value.tankStatus === "string"
  );
}

/**
 * Normalises the payload without inventing anything.
 *
 * A tank the device did not report stays null — it is not filled with zeros,
 * because a zeroed tank renders as a real "0.0% / Empty" reading and would be
 * indistinguishable from a genuinely empty tank.
 */
function normalizeReading(value) {
  if (!value) return null;

  const singleTankFallback = isFiniteNumber(value.percentage)
    ? {
        distanceCm: value.distanceCm,
        percentage: value.percentage,
        waterHeightCm: value.waterHeightCm,
        tankStatus: value.tankStatus || "Normal",
      }
    : null;

  const upperTank = isTankObj(value.upperTank) ? value.upperTank : singleTankFallback;
  const lowerTank = isTankObj(value.lowerTank) ? value.lowerTank : singleTankFallback;

  const pumpStatus = value.pumpStatus ?? null;

  return {
    ...value,
    upperTank,
    lowerTank,
    pumpStatus,
    // `?? null` rather than `?? false`: "the device did not say" and "the
    // device said no" are different answers and the UI distinguishes them.
    pumpRunning: value.pumpRunning ?? (pumpStatus ? pumpStatus === "ON" : null),
    systemEnabled: value.systemEnabled ?? null,
    pumpMode: value.pumpMode ?? null,
    waterFlowDetected:
      typeof value.waterFlowDetected === "boolean"
        ? value.waterFlowDetected
        : value.waterFlowDetected === "true" || value.waterFlowDetected === 1
        ? true
        : value.waterFlowDetected === "false" || value.waterFlowDetected === 0
        ? false
        : null,
    // Normalised to a number once, so every consumer compares like with like.
    receivedAtMs: readingTime(value),
  };
}

/**
 * Owns the live telemetry stream for the whole dashboard.
 *
 * Scoped strictly to the currently authenticated user's assigned device(s).
 */
export default function useTankData() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [reading, setReading] = useState(null);
  const [readings, setReadings] = useState([]);
  const [device, setDevice] = useState(null);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(sensorSocket.connected);
  const [clock, setClock] = useState(() => Date.now());
  const [reloadToken, setReloadToken] = useState(0);

  // Keeps the newest-timestamp guard across renders without re-running the
  // subscription effect, which would drop and re-add listeners.
  const newestRef = useRef(0);
  const currentDeviceRef = useRef(null);

  const refetchDevice = useCallback(async (targetDeviceId) => {
    try {
      const target = targetDeviceId || currentDeviceRef.current?.deviceId || reading?.deviceId;
      if (!target) return;
      const res = await fetchDevice(target);
      if (res?.device) {
        setDevice(res.device);
        currentDeviceRef.current = res.device;
      }
    } catch {
      // Ignore device fetch errors silently if device isn't registered yet
    }
  }, [reading]);

  const retry = useCallback(() => {
    setError("");
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  // When user identity changes, reset all state to prevent any stale leaks
  useEffect(() => {
    setReading(null);
    setReadings([]);
    setDevice(null);
    currentDeviceRef.current = null;
    newestRef.current = 0;
    setIsLoading(true);
    setError("");
  }, [user?._id]);

  useEffect(() => {
    let mounted = true;

    const applyReading = (next) => {
      if (!isReading(next)) return false;

      // Normal users must never receive or apply readings from another user's device
      if (!isAdmin && currentDeviceRef.current && next.deviceId !== currentDeviceRef.current.deviceId) {
        return false;
      }
      if (!isAdmin && !currentDeviceRef.current) {
        return false;
      }

      const timestamp = readingTime(next);
      if (timestamp < newestRef.current) return true;
      newestRef.current = timestamp;

      const normalized = normalizeReading(next);

      setReading(normalized);
      setReadings((current) => [...current, normalized].slice(-MAX_HISTORY_POINTS));
      setError("");
      setIsLoading(false);
      setClock(Date.now());
      return true;
    };

    const loadLatest = async () => {
      if (!isAuthenticated) {
        if (mounted) {
          setReading(null);
          setReadings([]);
          setDevice(null);
          currentDeviceRef.current = null;
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetchDevices();
        const deviceList = res?.devices || (Array.isArray(res) ? res : []);

        if (!mounted) return;

        if (deviceList.length === 0) {
          setDevice(null);
          currentDeviceRef.current = null;
          setReading(null);
          setReadings([]);
          setIsLoading(false);
          return;
        }

        const activeDevice = deviceList[0];
        setDevice(activeDevice);
        currentDeviceRef.current = activeDevice;

        const latest = await fetchLatestUltrasonicReading(activeDevice.deviceId);

        if (!mounted) return;

        if (!latest) {
          setReading(null);
          setIsLoading(false);
          return;
        }

        if (!applyReading(latest)) {
          setIsLoading(false);
        }
      } catch (requestError) {
        if (!mounted) return;

        if (isUnauthorized(requestError)) {
          setUnauthorized(true);
        } else {
          setError(
            getApiErrorMessage(
              requestError,
              "Unable to load sensor data from the backend."
            )
          );
        }
        setIsLoading(false);
      }
    };

    const onConnect = () => {
      if (!mounted) return;
      setSocketConnected(true);
      setError("");
      loadLatest();
    };

    const onDisconnect = () => {
      if (!mounted) return;
      setSocketConnected(false);
    };

    const onConnectError = () => {
      if (!mounted) return;
      setSocketConnected(false);
    };

    sensorSocket.on("ultrasonic:update", applyReading);
    sensorSocket.on("connect", onConnect);
    sensorSocket.on("disconnect", onDisconnect);
    sensorSocket.on("connect_error", onConnectError);
    acquireSensorSocket();
    loadLatest();

    const interval = window.setInterval(() => setClock(Date.now()), 1_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      sensorSocket.off("ultrasonic:update", applyReading);
      sensorSocket.off("connect", onConnect);
      sensorSocket.off("disconnect", onDisconnect);
      sensorSocket.off("connect_error", onConnectError);
      releaseSensorSocket();
    };
  }, [reloadToken, user?._id, isAuthenticated, isAdmin]);

  // Online purely as a function of how old the newest reading is. Nothing here
  // depends on component lifetime, so a remount cannot flip a live device
  // offline, and a genuinely silent device still goes offline after 10 s.
  const isOnline = useMemo(() => {
    const timestamp = reading?.receivedAtMs;
    return Number.isFinite(timestamp) && clock - timestamp < ONLINE_WINDOW_MS;
  }, [clock, reading?.receivedAtMs]);

  // The last good reading is kept on screen when the device goes quiet, but
  // flagged so it is presented as history rather than as the current state.
  const isStale = Boolean(reading) && !isOnline;

  return {
    reading,
    readings,
    device,
    tanks: device?.tanks ?? null,
    refetchDevice,
    setDevice,
    isOnline,
    isStale,
    isLoading,
    error,
    unauthorized,
    socketConnected,
    lastUpdatedAt: reading?.receivedAt ?? null,
    retry,
  };
}
