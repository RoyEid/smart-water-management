import { createContext, useContext } from "react";

/**
 * Shares the one live telemetry subscription created by DashboardLayout.
 *
 * Kept in a plain .js module with no component export so it can be imported by
 * both the layout and the pages without tripping react-refresh's rule that a
 * component file must only export components.
 */
export const TelemetryContext = createContext(null);

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within the dashboard layout");
  }
  return context;
}
