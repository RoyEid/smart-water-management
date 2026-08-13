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
#define SERVER_HOST "10.110.55.157"
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
const int RELAY_PIN = 5;

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
// Water flow presence detection (YF-S201)
// =====================================

// Signal pin. GPIO 4 is deliberately avoided because it drives the relay.
const int FLOW_SENSOR_PIN = 18;

// Debounce / loss timeout so detection is stable and does not flicker on individual missed pulses.
const unsigned long FLOW_OFF_TIMEOUT_MS = 2000;
const unsigned long FLOW_EVAL_INTERVAL_MS = 200;

// Incremented in the ISR on every falling edge, then copied and cleared under a short critical section.
volatile uint32_t flowPulseCount = 0;
portMUX_TYPE flowMux = portMUX_INITIALIZER_UNLOCKED;

// Binary water presence status (monitoring only, never controls the pump)
bool waterFlowDetected = false;
unsigned long lastFlowPulseTime = 0;
unsigned long lastFlowEvalTime = 0;

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
  lastFlowEvalTime = millis();
  lastFlowPulseTime = 0;

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
// Water flow presence detection
// =====================================

// Evaluates pulse arrival periodically to decide binary waterFlowDetected state.
// Monitoring only: never calls pumpOn() / pumpOff().
void updateFlowMeter() {
  unsigned long now = millis();
  if (now - lastFlowEvalTime < FLOW_EVAL_INTERVAL_MS) {
    return;
  }
  lastFlowEvalTime = now;

  uint32_t copiedPulses;
  portENTER_CRITICAL(&flowMux);
  copiedPulses = flowPulseCount;
  flowPulseCount = 0;
  portEXIT_CRITICAL(&flowMux);

  if (copiedPulses > 0) {
    lastFlowPulseTime = now;
    if (!waterFlowDetected) {
      waterFlowDetected = true;
      Serial.println("[FLOW] Water flow detected");
    }
  } else if (waterFlowDetected && (now - lastFlowPulseTime >= FLOW_OFF_TIMEOUT_MS)) {
    waterFlowDetected = false;
    Serial.println("[FLOW] No water flow");
  }
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

  json += "\"waterFlowDetected\":";
  json += waterFlowDetected ? "true" : "false";

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