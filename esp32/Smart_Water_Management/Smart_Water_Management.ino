#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

// ===============================
// Backend configuration
// ===============================

const char* SERVER_URL =
  "http://192.168.1.192:5000/api/sensors/ultrasonic";

const char* DEVICE_ID = "tank-01";

// ===============================
// Pins
// ===============================

const int TRIG_PIN = 5;
const int ECHO_PIN = 6;
const int RELAY_PIN = 4;

// ===============================
// Tank calibration
// ===============================

const float EMPTY_DISTANCE = 50.0;
const float FULL_DISTANCE = 5.0;

// ===============================
// Pump thresholds & Remote Control State
// ===============================

const float PUMP_ON_LEVEL = 20.0;
const float PUMP_OFF_LEVEL = 90.0;

const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

bool pumpRunning = false;

// Control state variables synced from backend GET /api/device/control
bool systemEnabled = true;
String pumpMode = "AUTO";          // "AUTO" or "MANUAL"
String manualPumpState = "OFF";    // "ON" or "OFF"

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;

unsigned long lastControlFetchTime = 0;
const unsigned long CONTROL_FETCH_INTERVAL = 2000;

// Function declarations
void connectWiFi();
float readDistanceCm();
float readStableDistance();
float calculatePercentage(float distance);
float calculateWaterHeight(float distance);
String getTankStatus(float percentage);
void updatePump(float percentage);
void pumpOn();
void pumpOff();
String getPumpStatus();
int sendReading(float distance, float percentage, float waterHeight, const String& tankStatus);
void sendSensorError();
void printReading(float distance, float percentage, float waterHeight, const String& tankStatus);
void fetchDeviceControlState();

// ===============================
// Setup
// ===============================

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);

  digitalWrite(TRIG_PIN, LOW);

  // Safety: pump OFF at startup
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpRunning = false;

  connectWiFi();
  fetchDeviceControlState();

  Serial.println("Smart Water Management System Started");
}

// ===============================
// Main loop
// ===============================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Poll device control state from backend
  if (millis() - lastControlFetchTime >= CONTROL_FETCH_INTERVAL) {
    lastControlFetchTime = millis();
    fetchDeviceControlState();
  }

  if (millis() - lastSendTime < SEND_INTERVAL) {
    return;
  }

  lastSendTime = millis();

  float distance = readStableDistance();

  if (distance < 0) {
    Serial.println("Ultrasonic sensor error: no echo");
    pumpOff();
    sendSensorError();
    return;
  }

  float percentage = calculatePercentage(distance);
  float waterHeight = calculateWaterHeight(distance);
  String tankStatus = getTankStatus(percentage);

  updatePump(percentage);

  printReading(distance, percentage, waterHeight, tankStatus);
  sendReading(distance, percentage, waterHeight, tankStatus);
}

// ===============================
// Wi-Fi & Device Control Polling
// ===============================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected. ESP32 IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("Wi-Fi connection failed");
  }
}

void fetchDeviceControlState() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_URL);
  url.replace("/api/sensors/ultrasonic", "/api/device/control");
  http.begin(url);
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    systemEnabled = (payload.indexOf("\"systemEnabled\":true") != -1 || payload.indexOf("\"enabled\":true") != -1);
    if (payload.indexOf("\"pumpMode\":\"MANUAL\"") != -1) {
      pumpMode = "MANUAL";
    } else {
      pumpMode = "AUTO";
    }
    if (payload.indexOf("\"manualPumpState\":\"ON\"") != -1) {
      manualPumpState = "ON";
    } else {
      manualPumpState = "OFF";
    }

    Serial.print("Control HTTP status: ");
    Serial.println(code);
    Serial.print("Control JSON: ");
    Serial.println(payload);
    Serial.print("System Enabled: ");
    Serial.println(systemEnabled ? "true" : "false");
    Serial.print("Pump Mode: ");
    Serial.println(pumpMode);
    Serial.print("Manual Pump State: ");
    Serial.println(manualPumpState);
    Serial.print("Relay Applied: ");
    Serial.println(getPumpStatus());
  }
  http.end();
}

// ===============================
// Sensor & Tank Calculations
// ===============================

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1.0;

  float distance = duration * 0.0343 / 2.0;
  if (distance < 2.0 || distance > 400.0) return -1.0;

  return distance;
}

float readStableDistance() {
  const int SAMPLE_COUNT = 5;
  float readings[SAMPLE_COUNT];
  int validCount = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float distance = readDistanceCm();
    if (distance >= 2.0 && distance <= 400.0) {
      readings[validCount] = distance;
      validCount++;
    }
    delay(50);
  }

  if (validCount == 0) return -1.0;

  for (int i = 0; i < validCount - 1; i++) {
    for (int j = i + 1; j < validCount; j++) {
      if (readings[j] < readings[i]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }

  return readings[validCount / 2];
}

float calculatePercentage(float distance) {
  float percentage = ((EMPTY_DISTANCE - distance) / (EMPTY_DISTANCE - FULL_DISTANCE)) * 100.0;
  return constrain(percentage, 0.0, 100.0);
}

float calculateWaterHeight(float distance) {
  float maximumWaterHeight = EMPTY_DISTANCE - FULL_DISTANCE;
  float waterHeight = EMPTY_DISTANCE - distance;
  return constrain(waterHeight, 0.0, maximumWaterHeight);
}

String getTankStatus(float percentage) {
  if (percentage <= 5.0) return "Empty";
  if (percentage <= 20.0) return "Low";
  if (percentage < 75.0) return "Normal";
  if (percentage < 90.0) return "High";
  return "Full";
}

// ===============================
// Pump Control Logic
// ===============================

void updatePump(float percentage) {
  // Safety Rule 1: System Disabled -> Force Pump OFF
  if (!systemEnabled) {
    if (pumpRunning) pumpOff();
    return;
  }

  // Manual Mode: Follow manualPumpState
  if (pumpMode == "MANUAL") {
    if (manualPumpState == "ON" && !pumpRunning) {
      pumpOn();
    } else if (manualPumpState == "OFF" && pumpRunning) {
      pumpOff();
    }
    return;
  }

  // Automatic Mode: Use water level thresholds
  if (percentage <= PUMP_ON_LEVEL && !pumpRunning) {
    pumpOn();
  } else if (percentage >= PUMP_OFF_LEVEL && pumpRunning) {
    pumpOff();
  }
}

void pumpOn() {
  digitalWrite(RELAY_PIN, RELAY_ON);
  pumpRunning = true;
  Serial.println("Pump turned ON");
}

void pumpOff() {
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpRunning = false;
  Serial.println("Pump turned OFF");
}

String getPumpStatus() {
  return pumpRunning ? "ON" : "OFF";
}

// ===============================
// Send Data to Backend
// ===============================

int sendReading(float distance, float percentage, float waterHeight, const String& tankStatus) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"distanceCm\":" + String(distance, 1) + ",";
  json += "\"percentage\":" + String(percentage, 1) + ",";
  json += "\"waterHeightCm\":" + String(waterHeight, 1) + ",";
  json += "\"tankStatus\":\"" + tankStatus + "\",";
  json += "\"pumpStatus\":\"" + getPumpStatus() + "\"";
  json += "}";

  int responseCode = http.POST(json);
  http.end();
  return responseCode;
}

void sendSensorError() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sensorStatus\":\"ERROR\",";
  json += "\"pumpStatus\":\"OFF\"";
  json += "}";

  http.POST(json);
  http.end();
}

void printReading(float distance, float percentage, float waterHeight, const String& tankStatus) {
  Serial.print("Distance: ");
  Serial.print(distance, 1);
  Serial.print(" cm | Level: ");
  Serial.print(percentage, 1);
  Serial.print("% | Tank: ");
  Serial.print(tankStatus);
  Serial.print(" | Pump: ");
  Serial.print(getPumpStatus());
  Serial.print(" | SystemEnabled: ");
  Serial.print(systemEnabled ? "YES" : "NO");
  Serial.print(" | Mode: ");
  Serial.println(pumpMode);
}
