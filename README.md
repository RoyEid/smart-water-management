# Smart Water Ultrasonic Monitor

This project receives HC-SR04 distance readings from an ESP32-S3 and displays the latest reading on a small authenticated React dashboard. The ESP32 sends one valid reading about every 500 ms. The backend immediately broadcasts each reading with Socket.IO, so the page changes without refreshing. The sensor becomes Offline when no reading arrives for three seconds.

The backend keeps only the latest reading in memory. Restarting the backend clears that reading; the sensor will populate it again on its next successful POST.

## Live data flow

```text
HC-SR04 → ESP32-S3 → POST /api/sensors/ultrasonic
        → in-memory latest reading → Socket.IO ultrasonic-distance event
        → React dashboard updates the distance, status, and timestamp only
```

The dashboard first requests `GET /api/sensors/ultrasonic/latest` with the existing JWT cookie. A single module-level socket.io-client connection listens for the exact `ultrasonic-distance` event, reconnects automatically, and is cleaned up when the dashboard unmounts.

## Project structure

```text
smart-water-management/
├── client/                       React, Vite, Tailwind CSS dashboard and auth UI
├── server/                       Express, MongoDB/Mongoose, JWT cookie authentication
├── esp32/
│   ├── esp32.ino                 Complete ESP32-S3 ultrasonic sender
│   ├── secrets.example.h         Safe credential template
│   └── secrets.h                 Local ignored credentials (never commit)
├── package.json                  Root install and development scripts
└── README.md
```

## Electrical safety warning

> **Do not connect a standard HC-SR04 ECHO pin directly to ESP32 GPIO 6.** The HC-SR04 ECHO signal can be approximately 5 V, while ESP32-S3 GPIO is designed for 3.3 V logic. Use a suitable logic-level shifter or a correctly designed resistor voltage divider to reduce the ECHO signal to a safe level. Connect all grounds together. If you are unsure about the wiring, ask someone experienced with electronics before powering the circuit.

The sketch uses these pins:

- HC-SR04 TRIG to ESP32-S3 GPIO 5
- HC-SR04 ECHO through level shifting to ESP32-S3 GPIO 6
- HC-SR04 VCC and GND according to the sensor and board specifications

No relay or pump is controlled by this project.

## 1. Install the software

Install these prerequisites first:

- Node.js 20.19 or newer (or Node.js 22.12 or newer)
- npm, which is included with Node.js
- MongoDB running locally, or access to a MongoDB connection string
- Arduino IDE with the Espressif ESP32 board package

Open PowerShell in the project folder and install all root, frontend, and backend dependencies:

```powershell
cd C:\Users\Admin\Desktop\smart-water-management
npm run install:all
```

## 2. Configure environment variables

Create local environment files from the safe examples:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
Copy-Item esp32\secrets.example.h esp32\secrets.h
```

Edit `server/.env` and set at least:

```dotenv
PORT=5000
DEVICE_API_KEY=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/smart-water-management
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long_for_security_reasons
```

Generate a unique, long value for `DEVICE_API_KEY`; the identical value must be entered in the ESP32 sketch. Use a different long random value for `JWT_SECRET`. Never put either secret in frontend code or commit `server/.env`.

The frontend example contains:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

`VITE_SOCKET_URL` names the backend origin used by Socket.IO. It contains no device secret.

Both actual `.env` files and `esp32/secrets.h` are ignored by the repository's `.gitignore`. The checked-in example files contain placeholders only. Generated Arduino output under `esp32/build/` is also ignored because compiled binaries can contain credential strings.

## 3. Start the project once

Make sure MongoDB is running. Then open one PowerShell terminal in the project folder and start exactly one frontend and one backend:

```powershell
cd C:\Users\Admin\Desktop\smart-water-management
npm run dev
```

The combined command prefixes the two logs with `client` and `server`. If either required port is occupied, that process exits clearly and the sibling process is stopped instead of leaving a partial development stack running. Do not also run `npm run dev:client` or `npm run dev:server` in other terminals at the same time.

## 4. Open the frontend

Open exactly:

```text
http://localhost:5173
```

Vite is fixed to port 5173 with `strictPort` enabled. If 5173 is occupied, startup fails with a clear error and never silently switches to 5174.

## 5. Find the laptop IPv4 address on Windows

The ESP32 cannot use `localhost`, because `localhost` on the ESP32 means the ESP32 itself.

1. Open Command Prompt or PowerShell.
2. Run `ipconfig`.
3. Find **Wireless LAN adapter Wi-Fi**.
4. Copy its **IPv4 Address**, for example `192.168.1.42`.
5. Ignore loopback addresses such as `127.0.0.1` and disconnected adapters.

## 6. Configure the ESP32 sketch

Open `esp32/secrets.h` and enter the replacement Wi-Fi credentials. It contains only these local values:

```cpp
constexpr char WIFI_SSID[] = "YOUR_NEW_WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "YOUR_NEW_WIFI_PASSWORD";
constexpr char DEVICE_API_KEY[] = "YOUR_NEW_DEVICE_API_KEY";
```

The endpoint remains in `esp32/esp32.ino`:

```cpp
const char* SERVER_URL =
  "http://192.168.1.192:5000/api/sensors/ultrasonic";
```

The device key must exactly match `DEVICE_API_KEY` in `server/.env`. Do not copy the device key into the React frontend. The previously exposed Wi-Fi password must also be changed on the router/access point; removing it from source code cannot revoke that old password.

For an ultrasonic-only hardware test, temporarily set this line in `esp32/esp32.ino` and upload again:

```cpp
constexpr bool SENSOR_ONLY_TEST = true;
```

This mode never starts Wi-Fi or HTTP. Change it back to `false` and upload again for end-to-end dashboard testing.

## 7. Use the same Wi-Fi network

Connect the ESP32-S3 and the laptop to the same Wi-Fi network. Guest networks and some mobile hotspots block devices from reaching one another; use a network that allows local device communication.

## 8. Upload the Arduino sketch

1. Connect the ESP32-S3 to the laptop with a data-capable USB cable.
2. In Arduino IDE, select the appropriate ESP32-S3 board and COM port.
3. Open `esp32/esp32.ino`. It is the only `.ino` file and contains the complete implementation.
4. Verify/compile the sketch.
5. Upload it to the board.

## 9. Open Serial Monitor

Open Arduino IDE's Serial Monitor and set the speed to **115200 baud**. About twice per second, a valid network reading should show one line:

```text
Distance: 24.7 cm | Pulse: 1440 us | HTTP: 200
```

The sketch takes five samples at least 60 ms apart, ignores invalid samples, requires at least three valid samples, and uses the median. The distance is then rounded once before both printing and sending, so the Serial Monitor and dashboard values match exactly. Readings outside 2–400 cm are not sent.

Useful diagnostics include:

```text
Distance: 24.7 cm | Pulse: 1440 us | Sensor-only test
Distance: 24.7 cm | Pulse: 1440 us | Wi-Fi offline
Distance: 24.7 cm | Pulse: 1440 us | Backend connection failed
No echo | Pulse: 0 | Check VCC, GND, TRIG GPIO5 and ECHO GPIO6
```

The valid distance and representative median pulse are printed before the HTTP attempt. Wi-Fi reconnection is non-blocking, so a disconnected network does not stop sensor measurement output.

### Required end-to-end test order

1. Compile `esp32/esp32.ino` with the ESP32-S3 board selected.
2. Set `SENSOR_ONLY_TEST = true`, upload, and inspect Serial Monitor at 115200 baud.
3. Confirm real hardware produces stable valid distance lines. A successful compile alone does not prove this physical check.
4. Start MongoDB, run `npm run dev` once, then test `http://localhost:5000/api/health` and `http://192.168.1.192:5000/api/health`.
5. Open `/dashboard`, manually POST `26.5`, and confirm the page changes immediately to `26.5 cm`.
6. Put newly rotated Wi-Fi credentials in `secrets.h`, set `SENSOR_ONLY_TEST = false`, and upload again.
7. Confirm Serial Monitor shows `HTTP: 200` after each valid filtered reading.
8. Confirm that the dashboard changes without refreshing and displays the exact same one-decimal value.

## 10. Test the POST endpoint manually

Before using the ESP32, you can verify the backend from Windows Command Prompt. Replace the example key with the value in `server/.env`:

```bat
curl -X POST http://localhost:5000/api/sensors/ultrasonic -H "Content-Type: application/json" -H "x-device-key: replace-with-a-long-random-secret" -d "{\"deviceId\":\"tank-01\",\"distanceCm\":26.5}"
```

A successful request returns HTTP 200 and the saved reading. Postman can send the same request by choosing POST, selecting raw JSON, adding `Content-Type: application/json`, and adding the `x-device-key` header.

PowerShell alternative:

```powershell
$headers = @{ "x-device-key" = "replace-with-the-key-from-server-env" }
$body = @{ deviceId = "tank-01"; distanceCm = 26.5 } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:5000/api/sensors/ultrasonic" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Useful negative tests:

- Remove or change `x-device-key`: expect HTTP 401.
- Send `distanceCm` below 2 or above 400: expect HTTP 400.
- Send an empty `deviceId`: expect HTTP 400.

## 11. Log in and view the live distance

1. Open `http://localhost:5173/register` and create an account if needed.
2. With the default `EMAIL_MODE=console`, read the six-digit verification code from the backend terminal and verify the account.
3. Log in. Successful login redirects directly to `/dashboard`.
4. The page displays one sensor card with the distance, Connected/Offline state, local last-updated time, and Logout button.
5. Move an object in front of the sensor. Confirm that Serial Monitor prints about two values per second and the dashboard changes to the same value without a page refresh.

The JWT remains in the existing HTTP-only cookie. Axios sends that cookie with the protected GET request; the secret token is not exposed to React. Opening `/dashboard` without a valid cookie redirects to `/login`.

## 12. Troubleshooting

### Check and stop only the process using a required port

Do not terminate every `node.exe` process. Inspect only the two required ports from Command Prompt or PowerShell:

```bat
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

Use the PID in the last column of the row whose state is `LISTENING`. Confirm that specific process before stopping it, replacing `1234` with the actual PID:

```bat
tasklist /FI "PID eq 1234"
taskkill /PID 1234 /F
```

Run the matching `netstat` command again to confirm the port is free, then start the project once with `npm run dev`. Never run the combined command and the individual client/server commands simultaneously.

### No echo or no Serial Monitor output

`No echo` is a sensor/wiring problem, not a dashboard problem. Set `SENSOR_ONLY_TEST = true`, upload `esp32/esp32.ino`, and use Serial Monitor at 115200 baud. Verify VCC → 5V, GND → GND, TRIG → GPIO 5, and ECHO → GPIO 6 through safe 5V-to-3.3V level shifting. If absolutely nothing prints, confirm the selected ESP32-S3 board, COM port, data-capable USB cable, uploaded sketch, and 115200 baud setting.

### Windows Firewall

If the ESP32 shows connection errors, allow Node.js through Windows Defender Firewall on **Private networks**, or create an inbound rule for TCP port 5000. Keep the rule limited to trusted private networks. Confirm the backend is running and try `http://LAPTOP_IPV4:5000` from another device on the same Wi-Fi.

### CORS errors in the browser

`FRONTEND_URL` must exactly match the browser's frontend origin, including protocol and port. For the normal local setup use `http://localhost:5173`. Keep `VITE_API_URL` and `VITE_SOCKET_URL` set to `http://localhost:5000`. If you open the frontend using the laptop IP, set all three origins consistently, then restart both backend and Vite.

### Socket.IO connection failures

In browser developer tools, open **Network** and look for a `/socket.io/` polling or WebSocket request. A blocked CORS response means `FRONTEND_URL` does not exactly match `http://localhost:5173`. Confirm `VITE_SOCKET_URL=http://localhost:5000`, restart Vite after changing frontend variables, and restart the backend after changing `FRONTEND_URL`. The client reconnects automatically and the dashboard removes all listeners when it unmounts.

### Invalid device key

HTTP 401 from the POST endpoint means the `x-device-key` value does not exactly match `DEVICE_API_KEY` in `server/.env`. Check for placeholder text, extra spaces, and a stale backend process. Restart the backend after changing its environment file.

### Sensor shows Offline

The dashboard shows Offline when no valid reading has reached the server in the last three seconds. Check Serial Monitor for a new `HTTP: 200` line about every 500 ms, invalid 2–400 cm readings, Wi-Fi status, the laptop IPv4 address, and firewall rules. The latest distance remains visible while Offline. Restarting the backend clears its in-memory reading, so the dashboard waits until the ESP32 posts again.

### Backend works on localhost but the ESP32 cannot connect

`localhost` works only from the laptop. Confirm that `SERVER_URL` in the sketch uses the IPv4 address from the laptop's active **Wireless LAN adapter Wi-Fi**, not `localhost`, VMware, VirtualBox, or Ethernet-only adapter addresses. Keep both devices on the same non-guest Wi-Fi, allow Node.js through the Private-network firewall, restart the backend, and re-upload the sketch after changing its URL or device key. A `Backend connection failed` suffix means the ESP32 cannot reach the laptop; HTTP 401 means the device key is different from `server/.env`.

### Backend unavailable

Confirm MongoDB is running, then confirm the `server` output from `npm run dev` reports `http://0.0.0.0:5000`. Check that `VITE_API_URL` is `http://localhost:5000` and restart the combined command after changing `client/.env`.

### VS Code says `WiFi.h` cannot be found

The generic Microsoft C/C++ extension does not automatically load Arduino board libraries, so it can show a red `WiFi.h` underline even when the ESP32 core is installed. Compile and upload with Arduino IDE: open `esp32/esp32.ino`, select **ESP32S3 Dev Module** (or the exact ESP32-S3 board you own), select its COM port, and click Upload. The project has been compiled successfully with the installed ESP32 3.3.10 core. If you want an Arduino-aware workflow inside VS Code, install and configure PlatformIO instead of relying on the generic C/C++ extension alone.

## API summary

### `POST /api/sensors/ultrasonic`

Requires `x-device-key`. Accepted JSON:

```json
{
  "deviceId": "tank-01",
  "distanceCm": 24.7
}
```

### `GET /api/sensors/ultrasonic/latest`

Requires the existing authenticated user cookie. A reading response is:

```json
{
  "deviceId": "tank-01",
  "distanceCm": 24.7,
  "receivedAt": "2026-07-22T12:00:00.000Z",
  "isOnline": true
}
```

### `GET /api/health`

Does not require authentication. Test it from both the laptop and the Wi-Fi address:

```text
http://localhost:5000/api/health
http://192.168.1.192:5000/api/health
```

If localhost works but the Wi-Fi URL does not, confirm the backend log says `http://0.0.0.0:5000` and allow Node.js or TCP port 5000 through Windows Firewall on Private networks.

### Socket.IO event

Every accepted POST immediately emits:

```text
ultrasonic-distance
{"deviceId":"tank-01","distanceCm":24.7,"receivedAt":"2026-07-22T12:00:00.000Z"}
```
