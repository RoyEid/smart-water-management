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

function isReading(value) {
  if (!value || typeof value.deviceId !== "string") return false;
  if (Number.isNaN(Date.parse(value.receivedAt))) return false;

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

  return {
    ...value,
    upperTank,
    lowerTank,
    pumpStatus: value.pumpStatus || "OFF",
    systemEnabled: value.systemEnabled ?? true,
    pumpMode: value.pumpMode || "AUTO",
  };
}

export default function useTankData() {
  const [reading, setReading] = useState(null);
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    let mounted = true;
    let newest = 0;

    const applyReading = (next) => {
      const timestamp = Date.parse(next?.receivedAt);
      if (!isReading(next) || timestamp < newest) return;
      newest = timestamp;
      const normalized = normalizeReading(next);
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

  const isOnline = useMemo(() => {
    const timestamp = Date.parse(reading?.receivedAt);
    return Number.isFinite(timestamp) && clock - timestamp < ONLINE_WINDOW_MS;
  }, [clock, reading?.receivedAt]);

  return { reading, readings, isOnline, error, unauthorized };
}
