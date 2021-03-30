// Copyright 2019 Sebastian Boyd
#include <Arduino.h>
#include <Wire.h>
#include <BME280_t.h>
#include <DNSServer.h>  //Local DNS Server used for redirecting all requests to the configuration portal
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>  //Local WebServer used to serve the configuration portal
#include <ESP8266WiFi.h>
#include <TaskScheduler.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <stdio.h>
#include <time.h>
#include "CAcerts.h"
#include "ESP8266httpUpdate.h"
#include "PMS.h"
#include <ArduinoOTA.h>

#define ASCII_ESC 27

#define MYALTITUDE 118

extern const unsigned char DSTRootCAX3_crt[] PROGMEM;
extern const unsigned int DSTRootCAX3_crt_len;

const char* update_host = "air.sebastianboyd.com";
const char* update_url = "/firmware-latest.bin";

const int httpsPort = 443;

WiFiManager wifiManager;

PMS pms(Serial);
PMS::DATA data;

ESP8266WebServer server(80);
HTTPClient http;

char bufout[10];

BME280<> BMESensor;

WiFiClientSecure https;

const char* db_name = "sensor_data";
const char* db_key = "55a438a31c8d7fc473acf2a6f1c4df60";

const char* DEVICE_ID = "1";

int counter = 0;

const float ALPHA = 2.0 / (60 + 1);  // Avg over 60 seconds
float AVG_PM_SP_UG_1_0;
float AVG_PM_AE_UG_2_5;
float AVG_PM_AE_UG_10_0;
float AVG_TEMPRATURE;
float AVG_HUMIDITY;
float AVG_PRESSURE_ADJ;

float exp_avg(float acc, float new_val) {
  if (acc) {
    return (ALPHA * new_val) + (1.0 - ALPHA) * acc;
  }
  return new_val;
}

// Generates response for Info Request
String getJSON(float temp, float humidity, float pressure, int pm_1_0,
               int pm_2_5, int pm_10_0) {
  char data[200];
  sprintf(
      data,
      R"({"deviceID":"%s","temp":%f,"humidity":%f,"pressure":%f,"pm_1_0":%d,"pm_2_5":%d,"pm_10_0":%d})",
      DEVICE_ID, temp, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
  return String(data);
}

// Setup HTTP Server
void setupHttpServer() {
  server.begin();
  // Info Methods
  server.on("/jsonp", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("access-control-allow-credentials", "false");
    server.sendHeader("access-control-allow-headers", "x-requested-with");
    server.sendHeader("access-control-allow-methods", "GET");
    server.sendHeader("content-type", "application/javascript");
    String json_data =
        getJSON(AVG_TEMPRATURE, AVG_HUMIDITY, AVG_PRESSURE_ADJ,
                AVG_PM_SP_UG_1_0, AVG_PM_AE_UG_2_5, AVG_PM_AE_UG_10_0);
    server.send(200, "text/json", "aq_data=" + String(json_data));
  });

  server.on("/json", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("access-control-allow-credentials", "false");
    server.sendHeader("access-control-allow-headers", "x-requested-with");
    server.sendHeader("access-control-allow-methods", "GET");
    server.sendHeader("content-type", "application/json");
    String json_data =
        getJSON(AVG_TEMPRATURE, AVG_HUMIDITY, AVG_PRESSURE_ADJ,
                AVG_PM_SP_UG_1_0, AVG_PM_AE_UG_2_5, AVG_PM_AE_UG_10_0);
    server.send(200, "text/json", String(json_data));
  });
}

void sendData(float temperature, float humidity, float pressure, int pm_1_0,
              int pm_2_5, int pm_10_0) {
  // sendDataToCorlysis(temperature, humidity, pressure, pm_1_0, pm_2_5,
  // pm_10_0); sendDataToBigQuery(temperature, humidity, pressure, pm_1_0,
  // pm_2_5, pm_10_0);
}

void setup() {
  Serial.begin(9600);  // GPIO2 (D4 pin on ESP-12E Development Board)
  Serial.println("\nStarting...");
  Serial.setDebugOutput(true);
  // WiFi.disconnect();
  wifiManager.autoConnect("Air-Quality");
  setupHttpServer();
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  // Synchronize time useing SNTP
  Serial.print("Setting time using SNTP");
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println("");
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.print("Current time: ");
  Serial.print(asctime(&timeinfo));

  // Load root certificate in DER format into WiFiClientSecure object
  bool res = https.setCACert_P(DSTRootCAX3_crt, DSTRootCAX3_crt_len);
  if (!res) {
    Serial.println("Failed to load root CA certificate!");
    while (true) {
      yield();
    }
  }

  // // New ota server start
  ArduinoOTA.setHostname("ESP8266");
  ArduinoOTA.setPassword("esp8266");

  ArduinoOTA.onStart([]() {
    Serial.println("Start");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });
  ArduinoOTA.begin();
  Serial.println("OTA ready");

  Wire.begin();  // initialize I2C that connects to sensor
  BMESensor.begin();
  pms.passiveMode();
}

void loop() {
  if (pms.read(data)) {
    Serial.print("PM 1.0 (ug/m3): ");
    Serial.println(data.PM_AE_UG_1_0);

    Serial.print("PM 2.5 (ug/m3): ");
    Serial.println(data.PM_AE_UG_2_5);

    Serial.print("PM 10.0 (ug/m3): ");
    Serial.println(data.PM_AE_UG_10_0);

    BMESensor.refresh();  // read current sensor data
    Serial.print("Temperature: ");
    Serial.print(BMESensor.temperature);  // display temperature in Celsius
    Serial.print("C / ");
    Serial.print(BMESensor.temperature * 1.8 +
                 32);  // display temperature in Celsius
    Serial.println("F");

    Serial.print("Humidity:    ");
    Serial.print(BMESensor.humidity);  // display humidity in %
    Serial.println("%");

    Serial.print("Pressure:    ");
    Serial.print(BMESensor.pressure / 100.0F);  // display pressure in hPa
    Serial.println("hPa");

    float relativepressure = BMESensor.seaLevelForAltitude(MYALTITUDE) / 100.0F;
    Serial.print("RelPress:    ");
    Serial.print(relativepressure);  // display relative pressure in hPa for
                                     // given altitude
    Serial.println("hPa");

    Serial.println();

    AVG_PM_SP_UG_1_0 = exp_avg(AVG_PM_SP_UG_1_0, (float)data.PM_AE_UG_1_0);
    AVG_PM_AE_UG_2_5 = exp_avg(AVG_PM_AE_UG_2_5, (float)data.PM_AE_UG_2_5);
    AVG_PM_AE_UG_10_0 = exp_avg(AVG_PM_AE_UG_10_0, (float)data.PM_AE_UG_10_0);
    AVG_TEMPRATURE = exp_avg(AVG_TEMPRATURE, (float)BMESensor.temperature);
    AVG_HUMIDITY = exp_avg(AVG_HUMIDITY, (float)BMESensor.humidity);
    AVG_PRESSURE_ADJ = exp_avg(AVG_PRESSURE_ADJ, (float)relativepressure);

    counter++;
    if (counter >= 10) {
      counter = 0;
      Serial.println("SEND DATA");
      // sendDataToCorlysis(AVG_TEMPRATURE, AVG_HUMIDITY, AVG_PRESSURE_ADJ,
      // round(AVG_PM_SP_UG_1_0), round(AVG_PM_AE_UG_2_5),
      // round(AVG_PM_AE_UG_10_0));
    }
  }
  server.handleClient();
  ArduinoOTA.handle();
}