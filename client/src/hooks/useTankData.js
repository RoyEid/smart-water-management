import { useEffect, useMemo, useState } from "react";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";
import { fetchLatestUltrasonicReading } from "../services/sensorApi";

const ONLINE_WINDOW_MS = 10_000;

function isTankObj(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.distanceCm === "number" &&
    Number.isFinite(obj.distanceCm) &&
    typeof obj.percentage === "number" &&
    Number.isFinite(obj.percentage) &&
    typeof obj.waterHeightCm === "number" &&
    Number.isFinite(obj.waterHeightCm) &&
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
    typeof value.distanceCm === "number" &&
    Number.isFinite(value.distanceCm) &&
    typeof value.percentage === "number" &&
    Number.isFinite(value.percentage) &&
    typeof value.waterHeightCm === "number" &&
    Number.isFinite(value.waterHeightCm) &&
    typeof value.tankStatus === "string"
  );
}

function normalizeReading(value) {
  if (!value) return null;
  const upperTank = value.upperTank || {
    distanceCm: value.distanceCm ?? 0,
    percentage: value.percentage ?? 0,
    waterHeightCm: value.waterHeightCm ?? 0,
    tankStatus: value.tankStatus || "Normal",
  };
  const lowerTank = value.lowerTank || {
    distanceCm: value.distanceCm ?? 0,
    percentage: value.percentage ?? 0,
    waterHeightCm: value.waterHeightCm ?? 0,
    tankStatus: value.tankStatus || "Normal",
  };

  const pumpStatus = value.pumpStatus || "OFF";

  return {
    ...value,
    upperTank,
    lowerTank,
    pumpStatus,
    pumpRunning: value.pumpRunning ?? pumpStatus === "ON",
    systemEnabled: value.systemEnabled ?? true,
    pumpMode: value.pumpMode || "AUTO",
    // Normalized to a number once, so every consumer compares like with like.
    receivedAtMs: readingTime(value),
  };
}

export default function useTankData() {
  const [reading, setReading] = useState(null);
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    let newest = 0;

    const applyReading = (next) => {
      if (!isReading(next)) return;

      const timestamp = readingTime(next);
      if (timestamp < newest) return;
      newest = timestamp;
      const normalized = normalizeReading(next);

      // TEMP DEBUG: confirms each live payload's flow fields reach React fresh
      // (no caching/memoization). Remove once the flow pipeline is verified.
      console.debug(
        "[FLOW] payload flowRateLMin=", normalized.flowRateLMin,
        "totalTransferredLitres=", normalized.totalTransferredLitres,
        "at", normalized.receivedAt
      );

      setReading(normalized);
      setReadings((current) => [...current, normalized].slice(-20));
      setError("");
      setClock(Date.now());
    };

    const loadLatest = async () => {
      try {
        const latest = await fetchLatestUltrasonicReading();
        if (mounted && latest) applyReading(latest);
      } catch (requestError) {
        if (mounted && requestError.response?.status === 401) {
          setUnauthorized(true);
        } else if (mounted) {
          setError("Unable to load sensor data from the backend.");
        }
      }
    };
    const onConnect = () => { if (mounted) { setError(""); loadLatest(); } };
    const onDisconnect = () => mounted && setError("Live connection lost. Reconnecting automatically...");
    const onConnectError = () => mounted && setError("Unable to connect to live updates.");

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
  }, []);

  // Online purely as a function of how old the newest reading is. Nothing here
  // depends on component lifetime, so a remount cannot flip a live device
  // offline, and a genuinely silent device still goes offline after 10 s.
  const isOnline = useMemo(() => {
    const timestamp = reading?.receivedAtMs;
    return Number.isFinite(timestamp) && clock - timestamp < ONLINE_WINDOW_MS;
  }, [clock, reading?.receivedAtMs]);

  return { reading, readings, isOnline, error, unauthorized };
}
