import { useEffect, useMemo, useState } from "react";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";
import { fetchLatestUltrasonicReading } from "../services/sensorApi";

const ONLINE_WINDOW_MS = 10_000;

function isReading(value) {
  return value && typeof value.deviceId === "string" &&
    ["distanceCm", "percentage", "waterHeightCm"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key])
    ) &&
    typeof value.tankStatus === "string" &&
    typeof value.pumpStatus === "string" &&
    !Number.isNaN(Date.parse(value.receivedAt));
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
      setReading(next);
      setReadings((current) => [...current, next].slice(-12));
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
