import { useEffect, useState } from "react";
import sensorSocket from "../services/socket";
import {
  fetchDeviceControlState,
  updateDeviceControlState,
} from "../services/deviceControlApi";

export default function useDeviceControl() {
  const [controlState, setControlState] = useState({
    systemEnabled: true,
    pumpMode: "AUTO",
    manualPumpState: "OFF",
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const applyState = (data) => {
    if (!data) return;
    const ctrl = data.control || data;
    setControlState({
      systemEnabled: ctrl.systemEnabled ?? ctrl.enabled ?? true,
      pumpMode: ctrl.pumpMode || "AUTO",
      manualPumpState: ctrl.manualPumpState || "OFF",
    });
    setError("");
  };

  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      try {
        const data = await fetchDeviceControlState();
        if (mounted) {
          applyState(data);
        }
      } catch {
        if (mounted) {
          setError("Unable to load device control state.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleSocketConnectError = (err) => {
      console.error("[SOCKET] Connection error", err.message);
    };

    const handleControlUpdate = (newControlState) => {
      if (!mounted) return;
      applyState(newControlState);
    };

    sensorSocket.on("connect_error", handleSocketConnectError);
    sensorSocket.on("control:update", handleControlUpdate);
    sensorSocket.on("device-control-changed", handleControlUpdate);

    loadState();

    return () => {
      mounted = false;
      sensorSocket.off("connect_error", handleSocketConnectError);
      sensorSocket.off("control:update", handleControlUpdate);
      sensorSocket.off("device-control-changed", handleControlUpdate);
    };
  }, []);

  const sendUpdate = async (updates) => {
    setUpdating(true);
    setError("");
    try {
      const updated = await updateDeviceControlState(updates);
      if (updated) {
        applyState(updated);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update device control.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleSystemEnabled = (enabled) => {
    if (enabled) {
      return sendUpdate({ systemEnabled: true });
    } else {
      return sendUpdate({ systemEnabled: false, manualPumpState: "OFF" });
    }
  };

  const setPumpMode = (mode) => sendUpdate({ pumpMode: mode });

  const setManualPumpState = (state) =>
    sendUpdate({ pumpMode: "MANUAL", manualPumpState: state });

  return {
    controlState,
    loading,
    updating,
    error,
    toggleSystemEnabled,
    setPumpMode,
    setManualPumpState,
  };
}
