# IoT Smart Water Pump Management System

**Senior Project — Final Submission**  
**Lebanese International University (LIU)** | School of Engineering  
Department of Computer and Communication Engineering (CCE)  

**Authors:** Roy F. Eid & Samar A. Harb  

---

## Overview

Intermittent municipal water supply and scheduled power availability pose severe water management challenges in residential and commercial buildings. Water supply often alternates between utility grid electricity (**Dawle**) and shared neighborhood diesel generators (**Moteur**), necessitating careful water pumping coordination to avoid overloading generators, running pumps dry, or causing tank overflow.

The **IoT Smart Water Pump Management System** provides an end-to-end automated solution. Custom **ESP32-S3** microcontroller hardware monitors water levels across dual storage tanks (lower source and upper destination), detects electrical power sources, and tracks pipeline flow. Sensor telemetry is streamed to a centralized **Node.js/Express** backend and stored in **MongoDB**, while a responsive **React 19** dashboard provides real-time monitoring, intelligent pump automation, manual overrides, historical analytics, and granular device-level access control.

---

## Key Features

- **Dual-Tank Level Monitoring:** Continuously tracks distance (cm), calibrated water level (%), and volume (Liters) across independent upper and lower tanks.
- **Power Source Detection (Dawle vs. Moteur):** Samples incoming AC voltage to detect state grid power versus private generator supply.
- **Intelligent Pump Automation:**
  - **AUTO Mode:** Automatic upper tank replenishment when below threshold ($\le 20\%$) and source water is available ($\ge 20\%$), stopping automatically at full capacity ($\ge 90\%$).
  - **MANUAL Mode:** User-directed remote pump activation and deactivation from the dashboard.
  - **Generator Protection Guard (`allowPumpOnMoteur`):** Automatically blocks heavy pump operation during generator power (Moteur) unless an authorized user explicitly permits it.
  - **Dry-Run & Overflow Prevention:** Automatic hardware cutoffs if the source tank reaches critical reserve ($\le 10\%$) or the upper tank reaches maximum capacity ($\ge 90\%$).
- **Flow Verification:** Counts pipeline pulses via a dedicated flow sensor to verify water movement whenever the pump relay is engaged.
- **Real-Time Bidirectional Synchronization:** Instantaneous telemetry updates and pump control state propagation via WebSocket connections (Socket.IO).
- **Device-Scoped Role-Based Access Control (RBAC):** Granular access tiers per device (Admin, Controller, Viewer) supporting multi-user households.
- **Historical Telemetry & Analytics:** Paginated data tables, date-range filtering, downloadable CSV reports, and operational summary KPIs.
- **Alert Management:** System-wide fault detection and alert tracking (Sensor Error, Dry Run, Offline Device) with read/resolve lifecycles.
- **Security & Authentication:** Session-based authentication using HTTP-only cookies, bcrypt password hashing, email OTP verification, password recovery, and optional Google/GitHub OAuth 2.0.
- **Multi-Language & Adaptive UI:** Full interface translation for English, Arabic (العربية with native RTL), French (Français), and Chinese (中文), along with Light, Dark, and System theme support.

---

## System Architecture

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                       Hardware Layer                        │
  │  ESP32-S3 Microcontroller                                   │
  │  ├── HC-SR04 Ultrasonic Sensor (Upper Tank)  [GPIO 7 / 15]  │
  │  ├── HC-SR04 Ultrasonic Sensor (Lower Tank)  [GPIO 12 / 13] │
  │  ├── YF-S201 Hall-Effect Flow Sensor         [GPIO 18]      │
  │  ├── ZMPT101B AC Voltage Sensor (Power Grid) [GPIO 3]       │
  │  └── 1-Channel Relay Module (12V Pump)       [GPIO 4]       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 │ HTTP POST /api/sensors/ultrasonic (Telemetry)
                                 │ HTTP GET  /api/device/control     (Control Polling)
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                        Backend Layer                        │
  │  Node.js / Express Server                                   │
  │  ├── Sensor Data Ingestion & Zod Schema Validation          │
  │  ├── Alert Resolution Engine & Device Registry              │
  │  ├── Session Security (HTTP-only Cookies, JWT, CSRF Origin) │
  │  ├── Device-Scoped Member Access Control (RBAC)             │
  │  └── Socket.IO Real-Time Broadcast Server                   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ MongoDB                       │ WebSocket Stream & REST API
                 │ (Persistent Storage)          │ (Live Events & JSON)
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌───────────────────────────┐
  │ MongoDB Collections          │ │    React 19 Client App    │
  │ ├── users                    │ │ Vite + Tailwind CSS       │
  │ ├── devices                  │ │ ├── Real-Time Gauges      │
  │ ├── devicemembers            │ │ ├── Auto/Manual Controls  │
  │ ├── devicecontrolstates      │ │ ├── Telemetry Analytics   │
  │ ├── ultrasonicreadings       │ │ ├── Household Members     │
  │ ├── alerts                   │ │ └── Multi-Language / RTL  │
  │ └── auditlogs                │ └───────────────────────────┘
  └──────────────────────────────┘
```

---

## User Access Roles

User authorization is strictly scoped per device through device membership (`DeviceMember`). There is no separate platform-wide superadmin actor; every registered user owns their claimed devices and can delegate access to household members:

| Role | Description | Permissions |
| :--- | :--- | :--- |
| **Admin** | **Device Owner** | Full device management. Can operate pump controls (AUTO/MANUAL, ON/OFF, Moteur permission), configure physical tank dimensions and liter capacities, rename the device, clear resolved alerts, and manage household members (invite, change roles, revoke access). |
| **Controller** | **Operational Member** | Can monitor live tank telemetry, view historical data, view analytics and alerts, and operate pump controls (AUTO/MANUAL modes, pump ON/OFF, and Moteur permission). Cannot alter tank configurations or manage members. |
| **Viewer** | **Read-Only Member** | Can view live tank levels, telemetry history, analytics, and active alerts. Cannot operate pump controls, configure tanks, or manage members. |

---

## Hardware

The system is engineered using the following hardware components:

| Hardware Component | Model / Specification | Purpose in System |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32-S3 Dev Module | Dual-core 2.4 GHz Wi-Fi microcontroller executing firmware control loops. |
| **Upper Ultrasonic Sensor** | HC-SR04 (or JSN-SR04T) | Measures air column distance to upper (destination) water level. |
| **Lower Ultrasonic Sensor** | HC-SR04 (or JSN-SR04T) | Measures air column distance to lower (source/well) water level. |
| **Water Flow Sensor** | YF-S201 (Hall Effect) | Senses physical water movement through output pipeline via pulse interrupts. |
| **Voltage / Power Sensor** | ZMPT101B AC Transformer | Samples AC waveform on mains to distinguish utility power (Dawle) from generator power (Moteur). |
| **Pump Relay Module** | 1-Channel 5V Relay (Active LOW) | Electrically isolates and switches power to the 12V DC water pump. |
| **Water Pump** | 12V DC Submersible / Transfer Pump | Pumps water from the lower reservoir to the upper tank. |
| **Storage Tanks** | Dual Water Tanks | Lower reservoir (source) and upper roof tank (destination). |
| **Level Shifter / Divider** | 5V to 3.3V Divider | Steps down 5V echo signals safely to protect ESP32-S3 3.3V GPIO inputs. |
| **Power Supply** | 5V DC (ESP32/Sensors) & 12V DC (Pump) | Dual-voltage power supply with common ground reference. |

### Microcontroller Pinout Mapping

| Component | Pin Function | ESP32-S3 Pin | Hardware Notes |
| :--- | :--- | :--- | :--- |
| **Upper Ultrasonic Sensor** | TRIG | **GPIO 7** | Digital output trigger pulse |
| **Upper Ultrasonic Sensor** | ECHO | **GPIO 15** | Digital input pulse (stepped down to 3.3V) |
| **Lower Ultrasonic Sensor** | TRIG | **GPIO 12** | Digital output trigger pulse |
| **Lower Ultrasonic Sensor** | ECHO | **GPIO 13** | Digital input pulse (stepped down to 3.3V) |
| **Water Flow Sensor (YF-S201)** | SIGNAL | **GPIO 18** | Hardware interrupt input (`INPUT_PULLUP`) |
| **Voltage Sensor (ZMPT101B)** | ANALOG OUT | **GPIO 3** | ADC1_CH2 analog input for AC sampling |
| **Pump Relay Module** | IN | **GPIO 4** | Digital output (`LOW` = ON, `HIGH` = OFF) |

---

## Software Stack

### Frontend
- **Framework:** React 19 (`^19.2.7`)
- **Build Tool:** Vite (`^8.1.1`)
- **Styling:** Tailwind CSS (`^4.3.3`)
- **Routing:** React Router DOM (`^7.18.1`)
- **Icons:** Lucide React (`^1.25.0`)
- **HTTP Client:** Axios (`^1.18.1`)
- **WebSockets:** Socket.IO Client (`^4.8.3`)

### Backend
- **Runtime:** Node.js (v20+ or v22+, ES Modules)
- **Framework:** Express (`^4.21.2`)
- **Validation:** Zod (`^3.24.2`)
- **Security:** Helmet (`^8.0.0`), express-rate-limit (`^7.5.0`), bcryptjs (`^2.4.3`), jsonwebtoken (`^9.0.2`)
- **Email Delivery:** Nodemailer (`^6.10.0`) supporting SMTP, Brevo, or Console mock mode
- **Authentication:** Passport.js (`^0.7.0`) with Google (`passport-google-oauth20`) & GitHub (`passport-github2`) strategies

### Database
- **Engine:** MongoDB (Mongoose ODM `^8.10.1`)

### Real-Time Communication
- **Engine:** Socket.IO Server (`^4.8.3`) with cookie-based handshake authentication

### Embedded Firmware
- **Language / Framework:** C++ / Arduino Framework for ESP32
- **Core Libraries:** `WiFi.h`, `HTTPClient.h`

---

## How the System Works

1. **Sensing & Preprocessing:**
   - Every 2 seconds, the ESP32-S3 triggers the ultrasonic sensors to sample distances to water surfaces.
   - AC voltage is sampled continuously over a 40 ms sinusoidal window to detect Dawle presence.
   - The flow sensor triggers an interrupt counter whenever water passes through the pipe.
2. **Telemetry Ingestion:**
   - The ESP32 sends an HTTP POST request to `/api/sensors/ultrasonic` carrying readings and authenticated by an `x-device-key` header.
   - The backend validates the payload with Zod, calculates volume based on configured tank height/capacity, evaluates system alerts, and stores the reading in MongoDB.
3. **Real-Time Push to Client:**
   - The server broadcasts the new telemetry to authenticated connected clients over Socket.IO (`ultrasonic:update`).
   - The React dashboard immediately updates live gauges, tank percentages, volume readouts, and pump states without reloading.
4. **Control Polling & Execution:**
   - The ESP32 polls `/api/device/control?deviceId=<ID>` every 2 seconds to fetch the target state (`systemEnabled`, `pumpMode`, `manualPumpState`, `allowPumpOnMoteur`, and physical tank heights for calibration sync).
   - The firmware processes local safety rules (dry-run prevention, overflow limits, and generator policy) and drives the pump relay accordingly.

---

## Project Structure

```text
smart-water-management-main/
├── client/                     # React 19 Web Application
│   ├── public/                 # Static assets & brand icons
│   ├── src/
│   │   ├── components/         # Reusable UI, dashboard widgets, modal dialogs
│   │   ├── context/            # Global state (Auth, Theme, Language, Telemetry)
│   │   ├── hooks/              # Custom hooks (useTankData, useDeviceControl, etc.)
│   │   ├── locales/            # Localization strings (EN, AR, FR, ZH)
│   │   ├── pages/              # Primary routes (Dashboard, PumpControl, History, etc.)
│   │   ├── services/           # Axios HTTP client and Socket.IO connection
│   │   └── utils/              # Unit conversion, reasoning engine, formatters
│   ├── package.json
│   └── vite.config.js
├── esp32/                      # Microcontroller Firmware
│   └── Smart_Water_Management/
│       ├── Smart_Water_Management.ino  # Production ESP32-S3 C++ firmware
│       ├── secrets.example.h           # Template for hardware credentials
│       └── secrets.h                   # Local credentials (ignored by Git)
├── server/                     # Express REST API & Socket.IO Backend
│   ├── scripts/                # Database inspection and syntax validation tools
│   ├── src/
│   │   ├── config/             # MongoDB connection, email transporter, Passport OAuth
│   │   ├── controllers/        # Route logic (Auth, Sensor, Control, Devices, Alerts)
│   │   ├── middleware/         # Authentication, validation, and error handlers
│   │   ├── models/             # Mongoose schemas (User, Device, Alert, AuditLog, etc.)
│   │   ├── realtime/           # Socket.IO connection handling and room dispatch
│   │   ├── routes/             # API endpoint definitions
│   │   ├── services/           # Core logic (alert engine, device access, audit)
│   │   └── utils/              # Session cookies, password hashing, token validation
│   ├── package.json
│   └── .env.example
├── package.json                # Workspace root orchestration scripts
├── pins.txt                    # Hardware pin reference sheet
└── README.md                   # Project documentation
```

---

## Installation & Setup

### Prerequisites
- **Node.js:** v20.19.0+ or v22.12.0+
- **npm:** v10+
- **MongoDB:** v6.0+ running locally or a MongoDB Atlas URI
- **Arduino IDE:** v2.0+ with **esp32 by Espressif Systems** board definitions installed

---

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd smart-water-management-main
```

---

### Step 2: Install Dependencies

Install all dependencies across the workspace (root, client, and server) using the root script:

```bash
npm run install:all
```

*(Alternatively, install each workspace individually: `npm install`, `npm --prefix server install`, `npm --prefix client install`)*

---

### Step 3: Configure Environment Variables

#### 1. Backend (`server/.env`)
Copy the backend example file:

```bash
cp server/.env.example server/.env
```

Populate `server/.env` with your local settings (see [Environment Configuration](#environment-configuration) below).

#### 2. Frontend (`client/.env`)
Copy the frontend example file:

```bash
cp client/.env.example client/.env
```

Ensure the API and Socket URLs point to the backend:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

#### 3. Firmware (`esp32/Smart_Water_Management/secrets.h`)
Copy the firmware credentials template:

```bash
cp esp32/Smart_Water_Management/secrets.example.h esp32/Smart_Water_Management/secrets.h
```

Update `secrets.h` with your local Wi-Fi credentials and shared device API key.

---

### Step 4: Start MongoDB

If using a local MongoDB instance, start the MongoDB daemon:

```bash
mongod
```

*(If using MongoDB Atlas, simply provide your connection string in `server/.env`)*

---

### Step 5: Start the Application

Run both the backend API and frontend development server concurrently from the root directory:

```bash
npm run dev
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`
- **Health Check Endpoint:** `http://localhost:5000/api/health`

---

### Step 6: Configure & Flash the ESP32-S3 Firmware

1. Open `esp32/Smart_Water_Management/Smart_Water_Management.ino` in the Arduino IDE.
2. In `Smart_Water_Management.ino`, set `SERVER_HOST` to your computer's local Wi-Fi IPv4 address (found using `ipconfig` on Windows or `ifconfig` on Linux/macOS). **Do not use `localhost` or `127.0.0.1` on the ESP32.**
3. Verify that `DEVICE_API_KEY` in `secrets.h` matches `DEVICE_API_KEY` in `server/.env`.
4. Connect the ESP32-S3 board via USB.
5. In Arduino IDE:
   - Go to **Tools** > **Board** and select **ESP32S3 Dev Module**.
   - Go to **Tools** > **Port** and select your microcontroller's serial COM port.
6. Click **Upload**.
7. Open the **Serial Monitor** at **115200 baud** to verify Wi-Fi connection and telemetry dispatch.

---

## Environment Configuration

Configure the backend variables in `server/.env`. **Never commit actual secrets or production keys to version control.**

| Variable Name | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`). |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS. |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | Primary frontend URL used for CSRF origin checks. |
| `MONGO_URI` | Yes | `mongodb://127.0.0.1:27017/smart-water-management` | MongoDB connection URI. |
| `DEVICE_API_KEY` | Yes | — | Secret authentication key shared between backend and ESP32 (`x-device-key`). |
| `JWT_SECRET` | Yes | — | Cryptographic secret used to sign session tokens (minimum 32 characters). |
| `JWT_EXPIRES_IN` | No | `7d` | Expiration lifetime for JWT tokens. |
| `COOKIE_EXPIRES_DAYS` | No | `7` | Number of days session cookies remain valid when Remember Me is active. |
| `COOKIE_SAME_SITE` | No | `lax` | Cookie SameSite policy (`lax`, `strict`, or `none`). |
| `EMAIL_MODE` | No | `console` | Email provider (`console` for dev mock logs, `smtp` for real email, `brevo` for Brevo API). |
| `SMTP_HOST` | Conditional | — | SMTP mail server hostname (e.g., `smtp.gmail.com`). |
| `SMTP_PORT` | Conditional | `587` | SMTP mail server port (`587` for STARTTLS, `465` for SSL). |
| `SMTP_SECURE` | Conditional | `false` | Set to `true` for port 465, `false` for port 587. |
| `SMTP_USER` | Conditional | — | SMTP login email address. |
| `SMTP_PASS` | Conditional | — | SMTP login password or application-specific password. |
| `EMAIL_FROM` | Conditional | — | Sender name and address for system emails. |
| `GOOGLE_CLIENT_ID` | Optional | — | Google OAuth 2.0 Client ID for Google login. |
| `GOOGLE_CLIENT_SECRET` | Optional | — | Google OAuth 2.0 Client Secret. |
| `GOOGLE_CALLBACK_URL` | Optional | `http://localhost:5000/api/auth/google/callback` | OAuth redirect callback URL for Google. |
| `GITHUB_CLIENT_ID` | Optional | — | GitHub OAuth Client ID for GitHub login. |
| `GITHUB_CLIENT_SECRET` | Optional | — | GitHub OAuth Client Secret. |
| `GITHUB_CALLBACK_URL` | Optional | `http://localhost:5000/api/auth/github/callback` | OAuth redirect callback URL for GitHub. |

---

## ESP32 Configuration

All hardware configuration parameters are managed in two files under `esp32/Smart_Water_Management/`:

### 1. `secrets.h` (Local Credentials)
Contains sensitive network and authentication credentials:

```cpp
#pragma once

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* DEVICE_API_KEY = "YOUR_SHARED_DEVICE_API_KEY"; // Must match DEVICE_API_KEY in server/.env
```

### 2. `Smart_Water_Management.ino` (Network & Device Identifiers)
Defines network endpoints and hardware identifiers:

```cpp
// Local IP address of the machine running the backend server
#define SERVER_HOST "192.168.1.50"  // Set to computer's LAN IP (never localhost/127.0.0.1)
#define SERVER_PORT "5000"

// Unique hardware identification string
const char *DEVICE_ID = "swm-1C047B9205D4";
```

---

## Main Safety Logic

Pump operation is governed by multi-tier hardware and software safety interlocks enforced by the ESP32-S3 firmware:

1. **Critical Dry-Run Protection (Lower Tank $\le 10\%$):**
   If the lower source tank level drops to or below 10%, pumping is immediately terminated and blocked across both AUTO and MANUAL modes to prevent pump cavitation and burnout.
2. **Overflow Prevention (Upper Tank $\ge 90\%$):**
   If the upper destination tank level reaches or exceeds 90%, pumping is stopped automatically to prevent spillage and structural damage.
3. **Automated Refill Criteria (AUTO Mode):**
   The pump engages automatically only when:
   - The system is enabled (`systemEnabled == true`).
   - The upper tank level is at or below 20% (`upperPercentage <= 20%`).
   - The lower tank has sufficient reserve above the dry-run limit (`lowerPercentage >= 20%`).
   - Power policy conditions are met (Dawle available or Moteur permitted).
4. **Generator Power Policy (MOTEUR Guard):**
   - When AC voltage detection confirms **DAWLE** (state power), pumping is permitted under normal automatic rules.
   - When power is classified as **MOTEUR** (private generator), the pump is held OFF by default to prevent overloading neighborhood generators, unless explicitly authorized by the user via the `allowPumpOnMoteur` control setting.
5. **Sensor Fail-Safe Shutdown:**
   If either ultrasonic distance reading is invalid ($< 0$ cm due to reflection loss or sensor disconnection), the firmware immediately disables the pump and dispatches an emergency `sendSensorError` notification to the backend.

---

## Running the Project

### Quick-Start Commands

```bash
# 1. Start development server (backend on :5000, frontend on :5173)
npm run dev

# 2. Run automated test suites (backend + frontend)
npm test

# 3. Check server syntax across all files
npm run check

# 4. Run frontend code quality linter
npm run lint

# 5. Full workspace verification (check + lint + test + production build)
npm run verify
```

---

## Final Project Authors

- **Roy F. Eid**
- **Samar A. Harb**

**Lebanese International University (LIU)**  
School of Engineering  
Department of Computer and Communication Engineering (CCE)  
Senior Project Submission
