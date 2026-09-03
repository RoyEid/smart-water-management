# Smart Water Management System

An enterprise-grade, IoT-enabled water monitoring and pump automation platform. The system pairs custom ESP32-S3 dual-tank hardware with a modern React 19 dashboard and an Express/MongoDB backend, delivering real-time telemetry, automated pump safety reasoning, multi-device management, and granular role-based access control.

---

## Architecture & Live Data Flow

```text
  ┌────────────────────────────────────────────────────────┐
  │                    Hardware Layer                      │
  │  ESP32-S3 Microcontroller                              │
  │  ├── HC-SR04 Ultrasonic (Upper Tank)  [GPIO 7 / 15]    │
  │  ├── HC-SR04 Ultrasonic (Lower Tank)  [GPIO 12 / 13]   │
  │  ├── YF-S201 Flow Sensor              [GPIO 14]        │
  │  ├── AC / Generator Sense Line (Dawle vs Moteur)       │
  │  └── Pump Control Relay               [GPIO 4]         │
  └───────────────────────────┬────────────────────────────┘
                              │ HTTP POST /api/sensors/ultrasonic (Header: x-device-key)
                              │ HTTP GET  /api/device/control (Polls pump commands)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                     Backend API                        │
  │  Node.js / Express / MongoDB / Socket.IO               │
  │  ├── Ingestion & Moving Median Telemetry Filter        │
  │  ├── Automatic Pump Reasoning Engine & Interlocks      │
  │  ├── Auth (JWT Cookies, Google/GitHub OAuth, Email OTP)│
  │  ├── Per-Device Scoped RBAC (Admin, Controller, Viewer)│
  │  └── Real-time Socket.IO Broadcast ("ultrasonic:update")│
  └───────────────────────────┬────────────────────────────┘
                              │
                              │ WebSocket Stream & REST API
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Web Application Layer                  │
  │  React 19 + Vite + Tailwind CSS                        │
  │  ├── Live Tank Visualizations & Volume Math            │
  │  ├── Pump Manual / Auto Controls & Reasoning Cards     │
  │  ├── Telemetry History, Filtering, & CSV Export        │
  │  ├── Household Member Management & Invitations         │
  │  └── Multi-Language (EN, AR, FR, ZH) & Dark/Light Mode │
  └────────────────────────────────────────────────────────┘
```

---

## Key Features

### Dual-Tank Monitoring & Flow Tracking
* **Real-time Tank Telemetry:** Ultrasonic measurements calculate water height (cm), capacity percentage (%), and volume (L) for both upper and lower tanks.
* **Flow Detection:** Integrated YF-S201 flow sensor validates water movement when the pump is energized.
* **Dual Power Sensing:** Dynamically senses mains electricity (**DAWLE**) versus generator (**MOTEUR**), adapting pumping logic according to user policy.

### Intelligent Pump Automation & Safety Interlocks
* **Dynamic Operating Modes:** Toggle between **AUTO** (level-driven automated pumping) and **MANUAL** (user-driven override).
* **Hardware & Software Interlocks:**
  * **Dry-Run Protection:** Prevents the pump from running if the lower source tank is depleted (`LOWER_TANK_CRITICAL`).
  * **Overflow Prevention:** Automatically terminates pumping when the upper destination tank reaches capacity (`UPPER_TANK_FULL`).
  * **Blocked Flow Detection:** Triggers safety shutdown if the pump is active but no flow is measured within the threshold period (`PUMP_BLOCKED`).
  * **Generator Policy (`allowPumpOnMoteur`):** Restricts high-current pump operation during generator power unless explicitly authorized by the device admin.

### Multi-Device Management & Household Sharing
* **Zero-Touch Provisioning:** Devices register lazily upon first valid telemetry transmission.
* **Secure Device Claiming:** Claim hardware ownership using single-use 6-digit physical claim codes.
* **Per-Device Role-Based Access Control (RBAC):**
  * **Admin:** Full device control, physical tank dimension configuration, device renaming, alert resolution, and household member administration.
  * **Controller:** Real-time monitoring and manual pump operation.
  * **Viewer:** Read-only access to live dashboards, analytics, and alert logs.

### Enterprise Security & Authentication
* **Authentication Suite:** Local email/password authentication, 6-digit email OTP verification, password recovery flows, and OAuth 2.0 (Google & GitHub).
* **Hardened Security:** Password hashing with bcrypt (12 rounds), HTTP-only SameSite session cookies, strict CORS verification, state-changing CSRF origin guards, rate limiting, and Helmet security headers.
* **Full Audit Trail:** Structured logging for security actions, credential alterations, hardware claiming, and pump state changes.

### User Experience & Internationalization
* **Real-Time Responsiveness:** Instant UI state updates via Socket.IO without page reloads.
* **Internationalization:** Complete localized interfaces with RTL support for English, Arabic (العربية), French (Français), and Chinese (中文).
* **Adaptive Theming:** Seamless switching between Light, Dark, and System modes.

---

## Repository Structure

```text
smart-water-management-main/
├── client/                             # React 19 Frontend (Vite + Tailwind CSS)
│   └── src/
│       ├── components/
│       │   ├── analytics/              # KPI cards, volume bar charts, water trend graphs
│       │   ├── dashboard/              # Tank visuals, pump readout, auto-reasoning cards
│       │   ├── devices/                # Household members card, tank config form
│       │   ├── layout/                 # Sidebar, header, navigation, notification bell
│       │   └── settings/               # Profile, security, connected accounts, preferences
│       ├── context/                    # Auth, Theme, Language, Toast, Telemetry providers
│       ├── hooks/                      # useTankData, useDeviceControl, useAlerts, useAsyncData
│       ├── pages/                      # Dashboard, PumpControl, History, Alerts, Devices, Settings
│       ├── services/                   # Axios API client, Socket.IO client
│       └── utils/                      # Pump reasoning, transfer math, telemetry formatting
├── server/                             # Node.js + Express Backend API
│   └── src/
│       ├── config/                     # Database (Mongoose), Email (SMTP/Brevo), Passport OAuth
│       ├── controllers/                # Auth, Sensors, DeviceControl, Devices, Alerts, Analytics
│       ├── middleware/                 # requireAuth, validateRequest, rateLimiters, errorHandler
│       ├── models/                     # User, Device, DeviceMember, DeviceControlState, Alert, etc.
│       ├── realtime/                   # Socket.IO server initialization and room broadcasts
│       ├── routes/                     # /api/auth, /api/sensors, /api/device/control, /api/devices
│       ├── services/                   # Device access, email dispatch, audit, control service
│       └── utils/                      # Token generation, password hashing, cookies
├── esp32/                              # Microcontroller Firmware
│   └── Smart_Water_Management/
│       ├── Smart_Water_Management.ino  # Production ESP32-S3 firmware
│       ├── secrets.example.h           # Wi-Fi & Device API Key template
│       └── secrets.h                   # Ignored local credentials
├── package.json                        # Root orchestration scripts
└── README.md                           # Documentation
```

---

## Frontend Application Routes

| Route | Access | Description |
| :--- | :--- | :--- |
| `/dashboard` | Authenticated | Real-time dual-tank levels, volumes, active pump state, and automated reasoning. |
| `/pump-control` | Authenticated | Mode switching (AUTO/MANUAL), manual pump toggle, and power policy controls. |
| `/live-monitoring` | Authenticated | Raw telemetry inspector and hardware stream diagnostics. |
| `/water-flow` | Authenticated | Flow rate measurements, session transfer counters, and status indicators. |
| `/history` | Authenticated | Paginated, searchable historical readings with CSV export capabilities. |
| `/alerts` | Authenticated | System alerts filtered by severity (Info, Warning, Critical) and resolution state. |
| `/devices` | Authenticated | List of accessible devices and ownership claim modal. |
| `/devices/:id` | Authenticated | Device management, tank capacity/height settings, and household member roster. |
| `/settings` | Authenticated | User profile, security, connected OAuth accounts, theme, and notifications. |
| `/login`, `/register` | Public / Guest | Account access, registration, OTP verification, and password recovery. |

---

## Role-Based Access Control (RBAC)

Access permissions are scoped to each specific device via `DeviceMember`:

| Feature / Action | Admin | Controller | Viewer |
| :--- | :---: | :---: | :---: |
| Monitor live water levels & telemetry | Yes | Yes | Yes |
| View alert history & system diagnostics | Yes | Yes | Yes |
| Inspect historical readings & export CSV | Yes | Yes | Yes |
| Operate pump (AUTO/MANUAL, ON/OFF) | Yes | Yes | No |
| Toggle generator pump permission (`allowPumpOnMoteur`) | Yes | Yes | No |
| Configure tank heights and liter capacities | Yes | No | No |
| Rename device label | Yes | No | No |
| Acknowledge / resolve system alerts | Yes | No | No |
| Manage household members (invite, change role, revoke) | Yes | No | No |
| Claim an unowned device via physical code | Yes | No | No |

---

## Hardware Specifications & Circuit Configuration

> [!WARNING]
> **Logic Level Compatibility Notice:**
> The ESP32-S3 operates on **3.3V logic**. The HC-SR04 ultrasonic sensor operates on **5V VCC** and returns a 5V logic signal on its `ECHO` pin. Connecting a 5V `ECHO` signal directly to an ESP32 GPIO pin can cause hardware damage. Use a bidirectional logic level shifter or an appropriate resistor voltage divider (e.g., 1kΩ / 2kΩ) to safely step down the ECHO signal to 3.3V. Connect all ground pins (GND) to a common rail.

### Pinout Configuration (ESP32-S3)

| Component | Signal | ESP32-S3 GPIO | Notes |
| :--- | :--- | :--- | :--- |
| **Upper Tank HC-SR04** | TRIG | **GPIO 7** | Output pulse trigger |
| **Upper Tank HC-SR04** | ECHO | **GPIO 15** | Input pulse through 3.3V level shifter |
| **Lower Tank HC-SR04** | TRIG | **GPIO 12** | Output pulse trigger |
| **Lower Tank HC-SR04** | ECHO | **GPIO 13** | Input pulse through 3.3V level shifter |
| **Water Flow Sensor (YF-S201)** | SIGNAL | **GPIO 14** | Pulse interrupt counter |
| **Pump Relay Module** | IN | **GPIO 4** | Active HIGH / LOW relay driver |
| **AC Dawle Sense (Mains)** | SENSE | **GPIO 16** | Optocoupled voltage detection |

---

## Installation & Setup

### Prerequisites
* **Node.js**: v20.19.0+ or v22.12.0+
* **npm**: v10+ (bundled with Node.js)
* **MongoDB**: v6.0+ running locally or a MongoDB Atlas connection string
* **Arduino IDE**: v2.0+ with the **Espressif ESP32** board package installed

---

### Step 1: Install Dependencies

From the repository root, install all dependencies across the workspace:

```bash
npm run install:all
```

---

### Step 2: Environment Configuration

Create the local environment configuration files from their templates:

#### Backend (`server/.env`)

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your settings:

```dotenv
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/smart-water-management
DEVICE_API_KEY=your-secure-device-secret-key
JWT_SECRET=your_random_secret_string_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Email Dispatch Mode (console | brevo | smtp)
EMAIL_MODE=console
EMAIL_FROM="Smart Water Management" <no-reply@example.com>

# Optional: Google & GitHub OAuth credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
```

#### Frontend (`client/.env`)

```bash
cp client/.env.example client/.env
```

```dotenv
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

#### Microcontroller Firmware (`esp32/Smart_Water_Management/secrets.h`)

Create `esp32/Smart_Water_Management/secrets.h`:

```cpp
#pragma once

const char* WIFI_SSID     = "YOUR_WIFI_NETWORK_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* DEVICE_API_KEY = "your-secure-device-secret-key"; // Matches DEVICE_API_KEY in server/.env
```

In `esp32/Smart_Water_Management/Smart_Water_Management.ino`, update `SERVER_HOST` to your computer's local Wi-Fi IP address (obtain via `ipconfig` on Windows or `ifconfig` on macOS/Linux):

```cpp
#define SERVER_HOST "192.168.1.50"  // LAN IP of backend server (do not use localhost on ESP32)
#define SERVER_PORT "5000"
```

---

### Step 3: Run the Application

Start both the backend server and frontend development server concurrently:

```bash
npm run dev
```

* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)
* **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Step 4: Flash the ESP32-S3 Firmware

1. Open **Arduino IDE**.
2. Go to **Tools** > **Board** and select **ESP32S3 Dev Module**.
3. Select your microcontroller's serial port under **Tools** > **Port**.
4. Open `esp32/Smart_Water_Management/Smart_Water_Management.ino`.
5. Click **Upload**.
6. Open the **Serial Monitor** set to **115200 baud** to view real-time connection status and telemetry dispatch logs.

---

## Verification & Automated Testing

The repository includes a comprehensive test suite for security, role authorization, tank volume algorithms, and telemetry formats:

```bash
# Run all verification checks (syntax checks, frontend linting, tests, and build)
npm run verify

# Run unit tests only across backend and frontend
npm test

# Run frontend code quality linter
npm run lint

# Validate production bundle build
npm run build:client
```

---

## Core API Reference

### Health Check

```http
GET /api/health
```

**Response (HTTP 200):**
```json
{
  "success": true,
  "status": "ok",
  "databaseConnected": true,
  "socketReady": true,
  "timestamp": "2026-09-03T09:00:00.000Z"
}
```

---

### Sensor Telemetry Ingestion

```http
POST /api/sensors/ultrasonic
Content-Type: application/json
x-device-key: <DEVICE_API_KEY>
```

**Request Body:**
```json
{
  "deviceId": "swm-1C047B9205D4",
  "upperDistanceCm": 24.5,
  "lowerDistanceCm": 18.2,
  "waterFlowDetected": true,
  "powerSource": "DAWLE"
}
```

---

### Hardware Pump Control State Polling

```http
GET /api/device/control?deviceId=swm-1C047B9205D4
```

**Response (HTTP 200):**
```json
{
  "deviceId": "swm-1C047B9205D4",
  "systemEnabled": true,
  "pumpMode": "AUTO",
  "manualPumpState": "OFF",
  "allowPumpOnMoteur": false,
  "updatedAt": "2026-09-03T09:00:00.000Z"
}
```

---

### Real-Time WebSocket Events (Socket.IO)

Clients subscribe to live telemetry broadcasts emitted whenever new readings are ingested:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { withCredentials: true });

socket.on("ultrasonic:update", (telemetry) => {
  console.log("Device:", telemetry.deviceId);
  console.log("Upper Tank Level:", telemetry.upperTank.percentage, "%");
  console.log("Lower Tank Level:", telemetry.lowerTank.percentage, "%");
  console.log("Pump State:", telemetry.pumpStatus);
});
```

---

## Troubleshooting Guide

### Port Availability (`5000` or `5173` already in use)

To identify and terminate processes occupying required ports on Windows:

```powershell
# Identify the process ID (PID)
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Terminate the process by PID
taskkill /PID <PID> /F
```

### Microcontroller Cannot Connect to Backend
1. **IP Configuration:** Ensure `SERVER_HOST` in `Smart_Water_Management.ino` is set to the computer's actual Wi-Fi IPv4 address (e.g., `192.168.x.x`), **not** `localhost` or `127.0.0.1`.
2. **Subnet Isolation:** Confirm that both the computer and the ESP32-S3 are connected to the same Wi-Fi network and that client isolation (AP isolation) is disabled on your router.
3. **Firewall Rules:** Allow incoming connections on port 5000 through the Windows Defender Firewall:
   ```powershell
   netsh advfirewall firewall add rule name="Node Backend 5000" dir=in action=allow protocol=TCP localport=5000
   ```

### Device Key Rejection (HTTP 401)
* Verify that `DEVICE_API_KEY` in `server/.env` exactly matches `DEVICE_API_KEY` in `esp32/Smart_Water_Management/secrets.h`.
* Confirm no extraneous leading or trailing whitespace characters exist in either file.

---

## License

This project is licensed under the MIT License.
