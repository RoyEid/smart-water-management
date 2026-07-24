import { io } from "socket.io-client";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000";

const sensorSocket = io(socketUrl.replace(/\/+$/, ""), {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5_000,
});

let dashboardConsumers = 0;
let pendingDisconnect = null;

export function acquireSensorSocket() {
  dashboardConsumers += 1;

  if (pendingDisconnect !== null) {
    clearTimeout(pendingDisconnect);
    pendingDisconnect = null;
  }

  // `active` includes both connected and currently reconnecting states.
  if (!sensorSocket.active) {
    sensorSocket.connect();
  }

  return sensorSocket;
}

export function releaseSensorSocket() {
  dashboardConsumers = Math.max(0, dashboardConsumers - 1);

  if (dashboardConsumers > 0 || pendingDisconnect !== null) {
    return;
  }

  // React Strict Mode immediately re-runs an effect after its development
  // cleanup. Delaying one task lets that remount cancel this disconnect while
  // still closing the socket after a real dashboard unmount.
  pendingDisconnect = setTimeout(() => {
    pendingDisconnect = null;

    if (dashboardConsumers === 0) {
      sensorSocket.disconnect();
    }
  }, 0);
}

export default sensorSocket;
