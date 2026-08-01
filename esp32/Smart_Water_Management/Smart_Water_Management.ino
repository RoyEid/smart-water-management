#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

// =====================================
// Backend configuration
// =====================================

// Laptop Wi-Fi IPv4 address running the Express backend.
// Must be the LAN IP of the machine, never localhost / 127.0.0.1.
// Re-check with "ipconfig" whenever the laptop rejoins the hotspot,
// because DHCP can hand out a different address.
#define SERVER_HOST "172.23.64.1"
#define SERVER_PORT "5000"

// Built from the parts above so the two endpoints can never drift apart
// and no stray character can sneak into the scheme.
#define SERVER_BASE_URL "http://" SERVER_HOST ":" SERVER_PORT

const char* SERVER_URL = SERVER_BASE_URL "/api/sensors/ultrasonic";
const char* CONTROL_URL = SERVER_BASE_URL "/api/device/control";

// Fail fast instead of stalling the pump loop on an unreachable backend.
const uint16_t HTTP_TIMEOUT_MS = 5000;

const char* DEVICE_ID = "tank-01";

// =====================================
// Pins
// =====================================

// Upper tank
const int UPPER_TRIG_PIN = 7;
const int UPPER_ECHO_PIN = 15;

// Lower tank
const int LOWER_TRIG_PIN = 12;
const int LOWER_ECHO_PIN = 13;

// Pump relay
const int RELAY_PIN = 4;

// =====================================
// Tank calibration
// =====================================

// Adjust after measuring the real tanks
const float UPPER_EMPTY_DISTANCE = 25.0;
const float UPPER_FULL_DISTANCE = 5.0;

const float LOWER_EMPTY_DISTANCE = 25.0;
const float LOWER_FULL_DISTANCE = 5.0;

// =====================================
// Automatic pump thresholds
// =====================================

// Start filling upper tank at or below 20%
const float UPPER_PUMP_ON_LEVEL = 20.0;

// Stop filling upper tank at or above 90%
const float UPPER_PUMP_OFF_LEVEL = 90.0;

// Pump can start only when lower tank has at least 20%
const float LOWER_START_MIN_LEVEL = 20.0;

// Emergency stop when lower tank reaches 10%
const float LOWER_STOP_LEVEL = 10.0;

// Most relay modules are active LOW
const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

bool pumpRunning = false;

// =====================================
// Remote control state
// =====================================

bool systemEnabled = true;
String pumpMode = "AUTO";
String manualPumpState = "OFF";

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;

unsigned long lastControlFetchTime = 0;
const unsigned long CONTROL_FETCH_INTERVAL = 2000;

// =====================================
// Water flow sensor (YF-S201)
// =====================================

// Signal pin. GPIO 4 is deliberately avoided because it drives the relay.
const int FLOW_SENSOR_PIN = 18;

// YF-S201 datasheet characteristic: output frequency (Hz) = 7.5 * flow (L/min).
const float FLOW_CALIBRATION_FACTOR = 7.5;

// Plausibility ceiling. The small pump physically does ~1-2 L/min, so any window
// computing above this is a spurious-interrupt burst (electrical noise, often
// from the pump/relay switching) and is discarded rather than displayed or
// integrated. Well above the real range, well below the ~100 L/min noise spikes.
const float MAX_VALID_FLOW_LMIN = 10.0;

// Physical upper-tank capacity. The per-session total is clamped to this so a
// long run, a miscalibration, or stray pulses can never report more water than
// the destination tank can physically hold.
const float UPPER_TANK_CAPACITY_LITRES = 8.0;

// Flow rate and total are recomputed on a fixed ~1 second window.
const unsigned long FLOW_CALC_INTERVAL = 1000;

// --- Flow data source ---------------------------------------------------------
// When true, the displayed flow rate and session total are a deterministic
// simulation. The YF-S201 on GPIO 18 stays wired and its ISR keeps counting, but
// those pulses are NOT used for the reported flow/total in this mode, so no real
// sensor value is ever mixed with the simulated value. Set false to fall back to
// the real pulse-based measurement.
const bool FLOW_SIMULATION_MODE = true;
const float SIMULATED_FLOW_L_MIN = 1.5;
const float MAX_TRANSFER_LITRES = 8.0;

// Incremented in the ISR on every falling edge, then copied and cleared under a
// short critical section so the main loop can never race the interrupt.
volatile uint32_t flowPulseCount = 0;
portMUX_TYPE flowMux = portMUX_INITIALIZER_UNLOCKED;

// Latest computed telemetry. Monitoring only: these values never gate the pump.
float flowRateLMin = 0.0;
float totalTransferredLitres = 0.0;

unsigned long lastFlowCalcTime = 0;

// Tracks the pump edge so the session total resets on each OFF -> ON transition.
bool flowLastPumpRunning = false;

// Counts pulses from the flow sensor. Kept tiny and in IRAM for a fast ISR.
void IRAM_ATTR pulseCounter() {
  portENTER_CRITICAL_ISR(&flowMux);
  flowPulseCount++;
  portEXIT_CRITICAL_ISR(&flowMux);
}

// =====================================
// Function declarations
// =====================================

void connectWiFi();
void fetchDeviceControlState();
void updateFlowMeter();
void updateSimulatedFlow();
void updateMeasuredFlow();

float readDistanceCm(int trigPin, int echoPin);
float readStableDistance(int trigPin, int echoPin);
float calculatePercentage(
  float distance,
  float emptyDistance,
  float fullDistance);
float calculateWaterHeight(
  float distance,
  float emptyDistance,
  float fullDistance);

String getTankStatus(float percentage);

void updatePump(
  float upperPercentage,
  float lowerPercentage);

void pumpOn();
void pumpOff();
String getPumpStatus();

int sendReading(
  float upperDistance,
  float upperPercentage,
  float upperWaterHeight,
  const String& upperStatus,
  float lowerDistance,
  float lowerPercentage,
  float lowerWaterHeight,
  const String& lowerStatus);

void sendSensorError(const String& sensorName);

void printReadings(
  float upperDistance,
  float upperPercentage,
  const String& upperStatus,
  float lowerDistance,
  float lowerPercentage,
  const String& lowerStatus);

// =====================================
// Setup
// =====================================

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(UPPER_TRIG_PIN, OUTPUT);
  pinMode(UPPER_ECHO_PIN, INPUT);

  pinMode(LOWER_TRIG_PIN, OUTPUT);
  pinMode(LOWER_ECHO_PIN, INPUT);

  pinMode(RELAY_PIN, OUTPUT);

  digitalWrite(UPPER_TRIG_PIN, LOW);
  digitalWrite(LOWER_TRIG_PIN, LOW);

  // Safety: pump OFF during startup
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpRunning = false;

  // Water flow sensor: open-collector output, so pull the line up and count
  // falling edges. Monitoring only — it shares nothing with the relay on GPIO 4.
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(
    digitalPinToInterrupt(FLOW_SENSOR_PIN),
    pulseCounter,
    FALLING);
  lastFlowCalcTime = millis();
  flowLastPumpRunning = pumpRunning;

  connectWiFi();
  fetchDeviceControlState();

  Serial.println();
  Serial.println("=================================");
  Serial.println("Smart Water Management Started");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Backend: ");
  Serial.println(SERVER_URL);
  Serial.println("Upper tank: TRIG 7, ECHO 15");
  Serial.println("Lower tank: TRIG 12, ECHO 13");
  Serial.println("Pump relay: GPIO 4");
  Serial.println("Flow sensor: GPIO 18 (YF-S201)");
  Serial.println("=================================");
}

// =====================================
// Main loop
// =====================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (
    millis() - lastControlFetchTime >= CONTROL_FETCH_INTERVAL) {
    lastControlFetchTime = millis();
    fetchDeviceControlState();
  }

  // Runs every loop pass so the 1 s flow window and the pump-edge reset stay
  // accurate regardless of the slower 2 s telemetry cadence below.
  updateFlowMeter();

  if (millis() - lastSendTime < SEND_INTERVAL) {
    return;
  }

  lastSendTime = millis();

  // Read upper tank
  float upperDistance =
    readStableDistance(
      UPPER_TRIG_PIN,
      UPPER_ECHO_PIN);

  // Prevent ultrasonic cross-talk
  delay(100);

  // Read lower tank
  float lowerDistance =
    readStableDistance(
      LOWER_TRIG_PIN,
      LOWER_ECHO_PIN);

  // Safety: stop pump if either sensor fails
  if (upperDistance < 0) {
    Serial.println("ERROR: Upper ultrasonic sensor");
    pumpOff();
    sendSensorError("UPPER");
    return;
  }

  if (lowerDistance < 0) {
    Serial.println("ERROR: Lower ultrasonic sensor");
    pumpOff();
    sendSensorError("LOWER");
    return;
  }

  float upperPercentage = calculatePercentage(
    upperDistance,
    UPPER_EMPTY_DISTANCE,
    UPPER_FULL_DISTANCE);

  float lowerPercentage = calculatePercentage(
    lowerDistance,
    LOWER_EMPTY_DISTANCE,
    LOWER_FULL_DISTANCE);

  float upperWaterHeight = calculateWaterHeight(
    upperDistance,
    UPPER_EMPTY_DISTANCE,
    UPPER_FULL_DISTANCE);

  float lowerWaterHeight = calculateWaterHeight(
    lowerDistance,
    LOWER_EMPTY_DISTANCE,
    LOWER_FULL_DISTANCE);

  String upperStatus =
    getTankStatus(upperPercentage);

  String lowerStatus =
    getTankStatus(lowerPercentage);

  updatePump(
    upperPercentage,
    lowerPercentage);

  printReadings(
    upperDistance,
    upperPercentage,
    upperStatus,
    lowerDistance,
    lowerPercentage,
    lowerStatus);

  sendReading(
    upperDistance,
    upperPercentage,
    upperWaterHeight,
    upperStatus,
    lowerDistance,
    lowerPercentage,
    lowerWaterHeight,
    lowerStatus);
}

// =====================================
// Wi-Fi
// =====================================

void connectWiFi() {
  static bool connectionStarted = false;
  static unsigned long connectionStartedAt = 0;
  static unsigned long lastDotAt = 0;

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (!connectionStarted) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    connectionStarted = true;
    connectionStartedAt = millis();
    lastDotAt = millis();

    Serial.print("Connecting to Wi-Fi");
    return;
  }

  if (millis() - lastDotAt >= 1000) {
    lastDotAt = millis();
    Serial.print(".");
  }

  if (millis() - connectionStartedAt >= 20000) {
    Serial.println();
    Serial.println("Wi-Fi timeout. Retrying...");

    WiFi.disconnect(true);
    delay(500);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    connectionStartedAt = millis();
  }
}

// =====================================
// Backend control
// =====================================

void fetchDeviceControlState() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;

  if (!http.begin(CONTROL_URL)) {
    Serial.print("Control begin() FAILED for URL: ");
    Serial.println(CONTROL_URL);
    return;
  }

  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();

    systemEnabled =
      payload.indexOf("\"systemEnabled\":true") != -1 || payload.indexOf("\"enabled\":true") != -1;

    if (
      payload.indexOf("\"pumpMode\":\"MANUAL\"") != -1) {
      pumpMode = "MANUAL";
    } else {
      pumpMode = "AUTO";
    }

    if (
      payload.indexOf(
        "\"manualPumpState\":\"ON\"")
      != -1) {
      manualPumpState = "ON";
    } else {
      manualPumpState = "OFF";
    }

    Serial.println("Control updated:");
    Serial.print("System: ");
    Serial.println(
      systemEnabled ? "ENABLED" : "DISABLED");

    Serial.print("Mode: ");
    Serial.println(pumpMode);

    Serial.print("Manual command: ");
    Serial.println(manualPumpState);
  } else {
    Serial.print("Control HTTP error: ");
    Serial.print(code);
    Serial.print(" (");
    Serial.print(http.errorToString(code));
    Serial.print(") URL: ");
    Serial.println(CONTROL_URL);

    if (code > 0) {
      Serial.print("Control response body: ");
      Serial.println(http.getString());
    }
  }

  http.end();
}

// =====================================
// Ultrasonic sensors
// =====================================

float readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  unsigned long duration =
    pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return -1.0;
  }

  float distance =
    duration * 0.0343 / 2.0;

  if (distance < 2.0 || distance > 400.0) {
    return -1.0;
  }

  return distance;
}

float readStableDistance(
  int trigPin,
  int echoPin) {
  const int SAMPLE_COUNT = 5;

  float readings[SAMPLE_COUNT];
  int validCount = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float distance =
      readDistanceCm(trigPin, echoPin);

    if (
      distance >= 2.0 && distance <= 400.0) {
      readings[validCount] = distance;
      validCount++;
    }

    delay(60);
  }

  if (validCount == 0) {
    return -1.0;
  }

  // Sort readings
  for (int i = 0; i < validCount - 1; i++) {
    for (int j = i + 1; j < validCount; j++) {
      if (readings[j] < readings[i]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }

  // Return median
  return readings[validCount / 2];
}

// =====================================
// Tank calculations
// =====================================

float calculatePercentage(
  float distance,
  float emptyDistance,
  float fullDistance) {
  float percentage =
    ((emptyDistance - distance) / (emptyDistance - fullDistance)) * 100.0;

  return constrain(
    percentage,
    0.0,
    100.0);
}

float calculateWaterHeight(
  float distance,
  float emptyDistance,
  float fullDistance) {
  float maximumWaterHeight =
    emptyDistance - fullDistance;

  float waterHeight =
    emptyDistance - distance;

  return constrain(
    waterHeight,
    0.0,
    maximumWaterHeight);
}

String getTankStatus(float percentage) {
  if (percentage <= 5.0) {
    return "Empty";
  }

  if (percentage <= 20.0) {
    return "Low";
  }

  if (percentage < 75.0) {
    return "Normal";
  }

  if (percentage < 90.0) {
    return "High";
  }

  return "Full";
}

// =====================================
// Automatic pump control
// =====================================

void updatePump(
  float upperPercentage,
  float lowerPercentage) {
  // System disabled
  if (!systemEnabled) {
    pumpOff();
    return;
  }

  // Critical dry-run protection
  // Always active, including manual mode
  if (lowerPercentage <= LOWER_STOP_LEVEL) {
    Serial.println(
      "Pump blocked: Lower tank is empty");

    pumpOff();
    return;
  }

  // Manual mode
  if (pumpMode == "MANUAL") {
    if (
      manualPumpState == "ON" && upperPercentage < UPPER_PUMP_OFF_LEVEL && lowerPercentage > LOWER_STOP_LEVEL) {
      pumpOn();
    } else {
      pumpOff();
    }

    return;
  }
  // Automatic mode
  if (
    !pumpRunning && upperPercentage <= UPPER_PUMP_ON_LEVEL && lowerPercentage >= LOWER_START_MIN_LEVEL) {
    Serial.println(
      "AUTO: Upper tank low and lower tank has water");

    pumpOn();
  }

  if (
    pumpRunning && (upperPercentage >= UPPER_PUMP_OFF_LEVEL || lowerPercentage <= LOWER_STOP_LEVEL)) {
    if (
      upperPercentage >= UPPER_PUMP_OFF_LEVEL) {
      Serial.println(
        "AUTO: Upper tank is full");
    }

    if (
      lowerPercentage <= LOWER_STOP_LEVEL) {
      Serial.println(
        "AUTO: Lower tank reached minimum level");
    }

    pumpOff();
  }
}

// =====================================
// Pump relay
// =====================================

void pumpOn() {
  if (pumpRunning) {
    return;
  }

  digitalWrite(RELAY_PIN, RELAY_ON);
  pumpRunning = true;

  Serial.println("Pump turned ON");
}

void pumpOff() {
  if (!pumpRunning) {
    digitalWrite(RELAY_PIN, RELAY_OFF);
    return;
  }

  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpRunning = false;

  Serial.println("Pump turned OFF");
}

String getPumpStatus() {
  return pumpRunning ? "ON" : "OFF";
}

// =====================================
// Water flow meter
// =====================================

// Dispatches to the active flow source. Monitoring only in BOTH modes: neither
// path calls pumpOn()/pumpOff(), so flow logic can never control or stop the pump.
void updateFlowMeter() {
  if (FLOW_SIMULATION_MODE) {
    updateSimulatedFlow();
  } else {
    updateMeasuredFlow();
  }
}

// Deterministic hardcoded flow. A fixed rate while the pump runs, integrated by
// real elapsed time, reset per session, and clamped to the transfer capacity.
// The GPIO 18 pulse counter is deliberately ignored here, so the reported flow
// and total are purely simulated with no real sensor value mixed in.
void updateSimulatedFlow() {
  // New session on OFF -> ON: reset the session total. This is the ONLY reset.
  if (pumpRunning && !flowLastPumpRunning) {
    totalTransferredLitres = 0.0;
    Serial.println("Flow(sim): pump started, session total reset");
  }
  flowLastPumpRunning = pumpRunning;

  // Integrate on the REAL elapsed interval, not an assumed 1000 ms.
  unsigned long now = millis();
  unsigned long elapsedMs = now - lastFlowCalcTime;
  if (elapsedMs < FLOW_CALC_INTERVAL) {
    return;
  }
  lastFlowCalcTime = now;

  // Pump OFF: no flow. Keep the final total visible (never reset or add here).
  if (!pumpRunning) {
    flowRateLMin = 0.0;
    Serial.print("[FLOW sim] pump=OFF rate=0.00 L/min totalL=");
    Serial.println(totalTransferredLitres, 3);
    return;
  }

  // Pump ON but this session already delivered a full tank: hold at capacity and
  // report no flow. The pump itself is left to the existing upper-tank full
  // protection in updatePump() — forcing it off here would change pump-control
  // safety logic, which must stay unchanged, so we intentionally do not.
  if (totalTransferredLitres >= MAX_TRANSFER_LITRES) {
    totalTransferredLitres = MAX_TRANSFER_LITRES;
    flowRateLMin = 0.0;
    Serial.print("[FLOW sim] pump=ON capacity reached rate=0.00 L/min totalL=");
    Serial.println(totalTransferredLitres, 3);
    return;
  }

  // Pump ON, still filling: fixed simulated rate, accumulated by real elapsed time.
  flowRateLMin = SIMULATED_FLOW_L_MIN;
  float intervalLitres = SIMULATED_FLOW_L_MIN * elapsedMs / 60000.0;
  totalTransferredLitres += intervalLitres;

  // Never exceed the transfer capacity; on reaching it, report no more flow.
  if (totalTransferredLitres >= MAX_TRANSFER_LITRES) {
    totalTransferredLitres = MAX_TRANSFER_LITRES;
    flowRateLMin = 0.0;
  }

  Serial.print("[FLOW sim] pump=ON rate=");
  Serial.print(flowRateLMin, 2);
  Serial.print(" L/min elapsedMs=");
  Serial.print(elapsedMs);
  Serial.print(" intervalL=");
  Serial.print(intervalLitres, 4);
  Serial.print(" totalL=");
  Serial.println(totalTransferredLitres, 3);
}

// Real YF-S201 pulse-based measurement. Unused while FLOW_SIMULATION_MODE is true.
// Monitoring only: reads pumpRunning to reset the session total but never calls
// pumpOn()/pumpOff().
void updateMeasuredFlow() {
  // Reset the session total the moment the pump begins a new fill (OFF -> ON).
  if (pumpRunning && !flowLastPumpRunning) {
    totalTransferredLitres = 0.0;
    Serial.println("Flow: pump started, session total reset");
  }
  flowLastPumpRunning = pumpRunning;

  // Measure the REAL elapsed interval instead of assuming a fixed 1000 ms, so a
  // slow loop pass (a blocking HTTP POST, sensor reads) can never distort the
  // integrated volume.
  unsigned long now = millis();
  unsigned long elapsedMs = now - lastFlowCalcTime;
  if (elapsedMs < FLOW_CALC_INTERVAL) {
    return;
  }
  lastFlowCalcTime = now;

  // Copy and clear the shared counter in one short critical section so a pulse
  // arriving mid-read is never lost or double counted.
  uint32_t copiedPulses;
  portENTER_CRITICAL(&flowMux);
  copiedPulses = flowPulseCount;
  flowPulseCount = 0;
  portEXIT_CRITICAL(&flowMux);

  // All flow math is float so a small window volume such as 0.02 L is added to
  // the running total instead of being truncated to zero.
  // YF-S201: frequency (Hz) = 7.5 * flow (L/min), so flow = frequency / 7.5.
  // (No * 60 here — the /7.5 already yields L/min directly.)
  float elapsedSeconds = elapsedMs / 1000.0;
  float pulseFrequencyHz = copiedPulses / elapsedSeconds;         // Hz
  flowRateLMin = pulseFrequencyHz / FLOW_CALIBRATION_FACTOR;      // L/min

  // Volume delivered during THIS interval (computed before any accumulation).
  float intervalLitres = flowRateLMin * elapsedMs / 60000.0;      // L

  // TEMP DEBUG: full flow pipeline every ~1 s. Remove once verified.
  Serial.print("[FLOW] copiedPulses=");
  Serial.print(copiedPulses);
  Serial.print(" elapsedMs=");
  Serial.print(elapsedMs);
  Serial.print(" freqHz=");
  Serial.print(pulseFrequencyHz, 2);
  Serial.print(" rate=");
  Serial.print(flowRateLMin, 3);
  Serial.print(" L/min intervalL=");
  Serial.print(intervalLitres, 4);

  // Reject spurious noise bursts: a value above the plausibility ceiling is not
  // displayed as flow and is not integrated into the session total.
  if (flowRateLMin > MAX_VALID_FLOW_LMIN) {
    Serial.print(" -> REJECTED (> ");
    Serial.print(MAX_VALID_FLOW_LMIN, 1);
    Serial.println(" L/min noise)");
    // Zero the reported rate so the noise spike is never displayed, and return
    // before accumulation so it is never added to the session total.
    flowRateLMin = 0.0;
    return;
  }

  totalTransferredLitres += intervalLitres;

  // Clamp the session total to [0, upper-tank capacity].
  if (totalTransferredLitres < 0.0) {
    totalTransferredLitres = 0.0;
  }
  if (totalTransferredLitres > UPPER_TANK_CAPACITY_LITRES) {
    totalTransferredLitres = UPPER_TANK_CAPACITY_LITRES;
  }

  Serial.print(" totalL=");
  Serial.print(totalTransferredLitres, 3);
  Serial.print(" pump=");
  Serial.println(pumpRunning ? "ON" : "OFF");
}

// =====================================
// Send both tanks to backend
// =====================================

int sendReading(
  float upperDistance,
  float upperPercentage,
  float upperWaterHeight,
  const String& upperStatus,
  float lowerDistance,
  float lowerPercentage,
  float lowerWaterHeight,
  const String& lowerStatus) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(
      "Skipping POST: Wi-Fi not connected");
    return -1;
  }

  HTTPClient http;

  if (!http.begin(SERVER_URL)) {
    Serial.print("POST begin() FAILED for URL: ");
    Serial.println(SERVER_URL);
    return -1;
  }

  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);

  http.addHeader(
    "Content-Type",
    "application/json");

  http.addHeader(
    "x-device-key",
    DEVICE_API_KEY);

  String json = "{";

  json += "\"deviceId\":\"";
  json += DEVICE_ID;
  json += "\",";

  json += "\"upperTank\":{";
  json += "\"distanceCm\":";
  json += String(upperDistance, 1);
  json += ",";

  json += "\"percentage\":";
  json += String(upperPercentage, 1);
  json += ",";

  json += "\"waterHeightCm\":";
  json += String(upperWaterHeight, 1);
  json += ",";

  json += "\"tankStatus\":\"";
  json += upperStatus;
  json += "\"";
  json += "},";

  json += "\"lowerTank\":{";
  json += "\"distanceCm\":";
  json += String(lowerDistance, 1);
  json += ",";

  json += "\"percentage\":";
  json += String(lowerPercentage, 1);
  json += ",";

  json += "\"waterHeightCm\":";
  json += String(lowerWaterHeight, 1);
  json += ",";

  json += "\"tankStatus\":\"";
  json += lowerStatus;
  json += "\"";
  json += "},";

  json += "\"pumpStatus\":\"";
  json += getPumpStatus();
  json += "\",";

  json += "\"systemEnabled\":";
  json += systemEnabled ? "true" : "false";
  json += ",";

  json += "\"pumpMode\":\"";
  json += pumpMode;
  json += "\",";

  json += "\"flowRateLMin\":";
  json += String(flowRateLMin, 2);
  json += ",";

  json += "\"totalTransferredLitres\":";
  json += String(totalTransferredLitres, 2);
  json += ",";

  json += "\"flowDataMode\":\"";
  json += FLOW_SIMULATION_MODE ? "simulated" : "measured";
  json += "\"";

  json += "}";

  Serial.print("POST URL: ");
  Serial.println(SERVER_URL);

  Serial.print("Payload: ");
  Serial.println(json);

  int responseCode = http.POST(json);

  Serial.print("Sensor POST response: ");
  Serial.println(responseCode);

  if (responseCode < 200 || responseCode >= 300) {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(responseCode));

    // A negative code means the request never reached the backend,
    // so there is no body to read.
    if (responseCode > 0) {
      Serial.print("Backend response: ");
      Serial.println(http.getString());
    }

    Serial.print("Wi-Fi status: ");
    Serial.print(WiFi.status());
    Serial.print(" | RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.print(" dBm | ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }

  http.end();

  return responseCode;
}

// =====================================
// Sensor error
// =====================================

void sendSensorError(
  const String& sensorName) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;

  if (!http.begin(SERVER_URL)) {
    Serial.print("Sensor-error begin() FAILED for URL: ");
    Serial.println(SERVER_URL);
    return;
  }

  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);

  http.addHeader(
    "Content-Type",
    "application/json");

  http.addHeader(
    "x-device-key",
    DEVICE_API_KEY);

  String json = "{";

  json += "\"deviceId\":\"";
  json += DEVICE_ID;
  json += "\",";

  json += "\"sensorStatus\":\"ERROR\",";
  json += "\"failedSensor\":\"";
  json += sensorName;
  json += "\",";

  json += "\"pumpStatus\":\"OFF\"";

  json += "}";

  int responseCode = http.POST(json);

  Serial.print("Sensor-error POST response: ");
  Serial.println(responseCode);

  http.end();
}

// =====================================
// Serial output
// =====================================

void printReadings(
  float upperDistance,
  float upperPercentage,
  const String& upperStatus,
  float lowerDistance,
  float lowerPercentage,
  const String& lowerStatus) {
  Serial.println();
  Serial.println("=================================");

  Serial.print("Upper Tank | Distance: ");
  Serial.print(upperDistance, 1);
  Serial.print(" cm | Level: ");
  Serial.print(upperPercentage, 1);
  Serial.print("% | Status: ");
  Serial.println(upperStatus);

  Serial.print("Lower Tank | Distance: ");
  Serial.print(lowerDistance, 1);
  Serial.print(" cm | Level: ");
  Serial.print(lowerPercentage, 1);
  Serial.print("% | Status: ");
  Serial.println(lowerStatus);

  Serial.print("Pump: ");
  Serial.print(getPumpStatus());

  Serial.print(" | System: ");
  Serial.print(
    systemEnabled ? "ENABLED" : "DISABLED");

  Serial.print(" | Mode: ");
  Serial.println(pumpMode);

  Serial.println("=================================");
}