import { useCallback, useEffect, useRef, useState } from "react";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";
import {
  fetchDeviceControlState,
  updateDeviceControlState,
} from "../services/deviceControlApi";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * Owns the pump control state and the commands that change it.
 *
 * The control state is unknown until the first fetch resolves — the initial
 * values are null rather than the optimistic "enabled / AUTO / OFF" they used
 * to be, so the UI shows "waiting" instead of asserting a mode it has not
 * confirmed with the backend.
 */
export default function useDeviceControl() {
  const [controlState, setControlState] = useState({
    systemEnabled: undefined,
    pumpMode: null,
    manualPumpState: null,
    allowPumpOnMoteur: false,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [lastCommand, setLastCommand] = useState(null);

  const mountedRef = useRef(true);
  // Guards against a double-click issuing two relay commands. `updating` alone
  // is not enough: state updates are async, so two handlers firing in the same
  // tick would both observe updating === false.
  const inFlightRef = useRef(false);

  const applyState = useCallback((data) => {
    if (!data) return;
    const control = data.control ?? data;

    setControlState({
      systemEnabled: control.systemEnabled ?? undefined,
      pumpMode: control.pumpMode ?? null,
      manualPumpState: control.manualPumpState ?? null,
      allowPumpOnMoteur: Boolean(control.allowPumpOnMoteur),
      updatedAt: control.updatedAt ?? null,
    });
    setError("");
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchDeviceControlState();
      if (mountedRef.current) applyState(data);
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          getApiErrorMessage(requestError, "Unable to load device control state.")
        );
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    mountedRef.current = true;

    const handleControlUpdate = (newControlState) => {
      if (!mountedRef.current) return;
      // Another browser (or the same user in a second tab) changed the state;
      // this client follows rather than holding a stale view.
      applyState(newControlState);
    };

    // A reconnect may have missed a control change, so the state is re-fetched
    // rather than assumed still current.
    const handleConnect = () => load();

    sensorSocket.on("control:update", handleControlUpdate);
    sensorSocket.on("device-control-changed", handleControlUpdate);
    sensorSocket.on("connect", handleConnect);
    acquireSensorSocket();

    // react-hooks/set-state-in-effect cannot see that `load` only writes state
    // after its await resolves, so it reports a synchronous setState that does
    // not occur. The initial control state has to be fetched alongside the
    // socket subscription that keeps it current.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    return () => {
      mountedRef.current = false;
      sensorSocket.off("control:update", handleControlUpdate);
      sensorSocket.off("device-control-changed", handleControlUpdate);
      sensorSocket.off("connect", handleConnect);
      releaseSensorSocket();
    };
  }, [applyState, load]);

  const sendUpdate = useCallback(
    async (updates, commandLabel) => {
      if (inFlightRef.current) {
        return { ok: false, duplicate: true };
      }

      inFlightRef.current = true;
      setUpdating(true);
      setError("");

      try {
        const updated = await updateDeviceControlState(updates);
        if (mountedRef.current) {
          applyState(updated);
          setLastCommand({
            label: commandLabel,
            ok: true,
            at: new Date().toISOString(),
          });
        }
        return { ok: true };
      } catch (requestError) {
        const message = getApiErrorMessage(
          requestError,
          "Failed to send the command to the device."
        );
        if (mountedRef.current) {
          setError(message);
          setLastCommand({
            label: commandLabel,
            ok: false,
            message,
            at: new Date().toISOString(),
          });
        }
        return { ok: false, message };
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) setUpdating(false);
      }
    },
    [applyState]
  );

  const toggleSystemEnabled = useCallback(
    (enabled) =>
      // Disabling sends manualPumpState:OFF explicitly rather than relying on
      // the backend's safety rule alone, so the intent is unambiguous both in
      // the request and in the resulting audit entry.
      sendUpdate(
        enabled
          ? { systemEnabled: true }
          : { systemEnabled: false, manualPumpState: "OFF" },
        enabled ? "systemEnabled" : "systemDisabled"
      ),
    [sendUpdate]
  );

  const setPumpMode = useCallback(
    (mode) =>
      sendUpdate({ pumpMode: mode }, mode === "AUTO" ? "modeAuto" : "modeManual"),
    [sendUpdate]
  );

  const setManualPumpState = useCallback(
    (state) =>
      sendUpdate(
        { pumpMode: "MANUAL", manualPumpState: state },
        state === "ON" ? "manualOn" : "manualOff"
      ),
    [sendUpdate]
  );

  const setAllowPumpOnMoteur = useCallback(
    (allowed) =>
      sendUpdate(
        { allowPumpOnMoteur: Boolean(allowed) },
        allowed ? "allowPumpOnMoteur" : "disallowPumpOnMoteur"
      ),
    [sendUpdate]
  );

  return {
    controlState,
    loading,
    updating,
    error,
    lastCommand,
    reload: load,
    toggleSystemEnabled,
    setPumpMode,
    setManualPumpState,
    setAllowPumpOnMoteur,
  };
}
