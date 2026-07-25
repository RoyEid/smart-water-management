#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

// =====================================
// Backend configuration
// =====================================

const char* SERVER_URL =
  "http://192.168.1.192:5000/api/sensors/ultrasonic";

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
// Function declarations
// =====================================

void connectWiFi();
void fetchDeviceControlState();

float readDistanceCm(int trigPin, int echoPin);
float readStableDistance(int trigPin, int echoPin);
float calculatePercentage(
  float distance,
  float emptyDistance,
  float fullDistance
);
float calculateWaterHeight(
  float distance,
  float emptyDistance,
  float fullDistance
);

String getTankStatus(float percentage);

void updatePump(
  float upperPercentage,
  float lowerPercentage
);

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
  const String& lowerStatus
);

void sendSensorError(const String& sensorName);

void printReadings(
  float upperDistance,
  float upperPercentage,
  const String& upperStatus,
  float lowerDistance,
  float lowerPercentage,
  const String& lowerStatus
);

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

  connectWiFi();
  fetchDeviceControlState();

  Serial.println();
  Serial.println("=================================");
  Serial.println("Smart Water Management Started");
  Serial.println("Upper tank: TRIG 7, ECHO 15");
  Serial.println("Lower tank: TRIG 12, ECHO 13");
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
    millis() - lastControlFetchTime >=
    CONTROL_FETCH_INTERVAL
  ) {
    lastControlFetchTime = millis();
    fetchDeviceControlState();
  }

  if (millis() - lastSendTime < SEND_INTERVAL) {
    return;
  }

  lastSendTime = millis();

  // Read upper tank
  float upperDistance =
    readStableDistance(
      UPPER_TRIG_PIN,
      UPPER_ECHO_PIN
    );

  // Prevent ultrasonic cross-talk
  delay(100);

  // Read lower tank
  float lowerDistance =
    readStableDistance(
      LOWER_TRIG_PIN,
      LOWER_ECHO_PIN
    );

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
    UPPER_FULL_DISTANCE
  );

  float lowerPercentage = calculatePercentage(
    lowerDistance,
    LOWER_EMPTY_DISTANCE,
    LOWER_FULL_DISTANCE
  );

  float upperWaterHeight = calculateWaterHeight(
    upperDistance,
    UPPER_EMPTY_DISTANCE,
    UPPER_FULL_DISTANCE
  );

  float lowerWaterHeight = calculateWaterHeight(
    lowerDistance,
    LOWER_EMPTY_DISTANCE,
    LOWER_FULL_DISTANCE
  );

  String upperStatus =
    getTankStatus(upperPercentage);

  String lowerStatus =
    getTankStatus(lowerPercentage);

  updatePump(
    upperPercentage,
    lowerPercentage
  );

  printReadings(
    upperDistance,
    upperPercentage,
    upperStatus,
    lowerDistance,
    lowerPercentage,
    lowerStatus
  );

  sendReading(
    upperDistance,
    upperPercentage,
    upperWaterHeight,
    upperStatus,
    lowerDistance,
    lowerPercentage,
    lowerWaterHeight,
    lowerStatus
  );
}

// =====================================
// Wi-Fi
// =====================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to Wi-Fi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startTime < 15000
  ) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected. ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed");
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

  String url = String(SERVER_URL);

  url.replace(
    "/api/sensors/ultrasonic",
    "/api/device/control"
  );

  http.begin(url);
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();

    systemEnabled =
      payload.indexOf("\"systemEnabled\":true") != -1 ||
      payload.indexOf("\"enabled\":true") != -1;

    if (
      payload.indexOf("\"pumpMode\":\"MANUAL\"") != -1
    ) {
      pumpMode = "MANUAL";
    } else {
      pumpMode = "AUTO";
    }

    if (
      payload.indexOf(
        "\"manualPumpState\":\"ON\""
      ) != -1
    ) {
      manualPumpState = "ON";
    } else {
      manualPumpState = "OFF";
    }

    Serial.println("Control updated:");
    Serial.print("System: ");
    Serial.println(
      systemEnabled ? "ENABLED" : "DISABLED"
    );

    Serial.print("Mode: ");
    Serial.println(pumpMode);

    Serial.print("Manual command: ");
    Serial.println(manualPumpState);
  } else {
    Serial.print("Control HTTP error: ");
    Serial.println(code);
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
  int echoPin
) {
  const int SAMPLE_COUNT = 5;

  float readings[SAMPLE_COUNT];
  int validCount = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float distance =
      readDistanceCm(trigPin, echoPin);

    if (
      distance >= 2.0 &&
      distance <= 400.0
    ) {
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
  float fullDistance
) {
  float percentage =
    ((emptyDistance - distance) /
    (emptyDistance - fullDistance)) *
    100.0;

  return constrain(
    percentage,
    0.0,
    100.0
  );
}

float calculateWaterHeight(
  float distance,
  float emptyDistance,
  float fullDistance
) {
  float maximumWaterHeight =
    emptyDistance - fullDistance;

  float waterHeight =
    emptyDistance - distance;

  return constrain(
    waterHeight,
    0.0,
    maximumWaterHeight
  );
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
  float lowerPercentage
) {
  // System disabled
  if (!systemEnabled) {
    pumpOff();
    return;
  }

  // Critical dry-run protection
  // Always active, including manual mode
  if (lowerPercentage <= LOWER_STOP_LEVEL) {
    Serial.println(
      "Pump blocked: Lower tank is empty"
    );

    pumpOff();
    return;
  }

  // Manual mode
  if (pumpMode == "MANUAL") {
    if (
      manualPumpState == "ON" &&
      lowerPercentage >= LOWER_START_MIN_LEVEL
    ) {
      pumpOn();
    } else {
      pumpOff();
    }

    return;
  }

  // Automatic mode
  if (
    !pumpRunning &&
    upperPercentage <= UPPER_PUMP_ON_LEVEL &&
    lowerPercentage >= LOWER_START_MIN_LEVEL
  ) {
    Serial.println(
      "AUTO: Upper tank low and lower tank has water"
    );

    pumpOn();
  }

  if (
    pumpRunning &&
    (
      upperPercentage >= UPPER_PUMP_OFF_LEVEL ||
      lowerPercentage <= LOWER_STOP_LEVEL
    )
  ) {
    if (
      upperPercentage >= UPPER_PUMP_OFF_LEVEL
    ) {
      Serial.println(
        "AUTO: Upper tank is full"
      );
    }

    if (
      lowerPercentage <= LOWER_STOP_LEVEL
    ) {
      Serial.println(
        "AUTO: Lower tank reached minimum level"
      );
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
  const String& lowerStatus
) {
  if (WiFi.status() != WL_CONNECTED) {
    return -1;
  }

  HTTPClient http;

  http.begin(SERVER_URL);
  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.addHeader(
    "x-device-key",
    DEVICE_API_KEY
  );

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
  json += "\"";

  json += "}";

  int responseCode = http.POST(json);

  Serial.print("Sensor POST response: ");
  Serial.println(responseCode);

  if (responseCode < 200 || responseCode >= 300) {
    Serial.print("Backend response: ");
    Serial.println(http.getString());
  }

  http.end();

  return responseCode;
}

// =====================================
// Sensor error
// =====================================

void sendSensorError(
  const String& sensorName
) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;

  http.begin(SERVER_URL);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.addHeader(
    "x-device-key",
    DEVICE_API_KEY
  );

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

  http.POST(json);
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
  const String& lowerStatus
) {
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
    systemEnabled ? "ENABLED" : "DISABLED"
  );

  Serial.print(" | Mode: ");
  Serial.println(pumpMode);

  Serial.println("=================================");
}