#include <Arduino.h>
#include <time.h>
#include <WiFiClientSecure.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>            //Local DNS Server used for redirecting all requests to the configuration portal
#include <ESP8266WebServer.h>     //Local WebServer used to serve the configuration portal
#include <ESP8266HTTPClient.h>
#include <WiFiManager.h>
#include <ESP8266WebServer.h>
#include <Wire.h>
#include "PMS.h"
#include <BME280_t.h>
#include <stdio.h>
#include "ESP8266httpUpdate.h"
#include <TaskScheduler.h>
#include "CAcerts.h"

#define ASCII_ESC 27

#define MYALTITUDE  118

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

const float ALPHA = 2.0 / (60 + 1); //Avg over 60 seconds
float AVG_PM_SP_UG_1_0;
float AVG_PM_AE_UG_2_5;
float AVG_PM_AE_UG_10_0;
float AVG_TEMPRATURE;
float AVG_HUMIDITY; 
float AVG_PRESSURE_ADJ; 

void check_update()
{
    Serial.print("connecting to ");
    Serial.println(update_host);
    if (!https.connect(update_host, httpsPort)) {
        Serial.println("connection failed");
        return;
    }

    // Verify validity of server's certificate
    if (https.verifyCertChain(update_host)) {
        Serial.println("Server certificate verified");
    } else {
        Serial.println("ERROR: certificate verification failed!");
        return;
    }

    Serial.print("Starting OTA from: ");
    Serial.print(update_host);
    Serial.println(update_url);

    //auto ret = ESPhttpUpdate.update(https, update_host, update_url);
    // if successful, ESP will restart
    //Serial.println("update failed");
    //Serial.println((int) ret);
}

float exp_avg(float acc, float new_val)
{
    if (acc)
    {
        return (ALPHA * new_val) + (1.0 - ALPHA) * acc;
    }
    return new_val;
}

// Generates response for Info Request
String getJSON(float temp, float humidity, float pressure, int pm_1_0, int pm_2_5, int pm_10_0)
{ 
    char data[200];
    sprintf(data, R"({"deviceID":"%s","temp":%f,"humidity":%f,"pressure":%f,"pm_1_0":%d,"pm_2_5":%d,"pm_10_0":%d})", 
            DEVICE_ID, temp, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
    return String(data);
}

// Setup HTTP Server
void setupHttpServer()
{
  server.begin();
  // Info Methods
  server.on("/json", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("access-control-allow-credentials", "false");
    server.sendHeader("access-control-allow-headers", "x-requested-with");
    server.sendHeader("access-control-allow-methods", "GET,OPTIONS");
    String json_data = getJSON(AVG_TEMPRATURE, AVG_HUMIDITY, AVG_PRESSURE_ADJ, AVG_PM_SP_UG_1_0, AVG_PM_AE_UG_2_5, AVG_PM_AE_UG_10_0);
    server.send(200, "text/json", "aq_data=" + String(json_data));
  });
  server.on("/json", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("access-control-allow-credentials", "false");
    server.sendHeader("access-control-allow-headers", "x-requested-with");
    server.sendHeader("access-control-allow-methods", "GET,OPTIONS");
    server.send(204);
  });
}

void sendDataToCorlysis(float temperature, float humidity, float pressure, int pm_1_0, int pm_2_5, int pm_10_0) {
    static long counter = 0;
    
    char payloadStr[150];
    sprintf(payloadStr, "bme280_data temperature=%f,humidity=%f,pressure=%f,pm_1_0=%d,pm_2_5=%d,pm_10_0=%d", temperature, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
    Serial.println(payloadStr);
    
    char corlysisUrl[200];
    sprintf(corlysisUrl, "http://corlysis.com:8087/write?db=%s&u=token&p=%s", db_name, db_key);
    http.begin(corlysisUrl);
    //HTTPS variant - check ssh public key fingerprint
    //sprintf(corlysisUrl, "https://corlysis.com:8086/write?db=%s&u=token&p=%s", dbName, dbPassword);
    //http.begin(corlysisUrl, "FF:2D:E9:25:75:39:D1:A0:5C:99:02:34:EF:81:73:0F:3F:3E:2D:0D");

    
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");  
    int httpCode = http.POST(payloadStr);
    Serial.print("http result:");
    Serial.println(httpCode);
    http.writeToStream(&Serial);
    http.end();

    if(httpCode == 204) {
        counter = 0;
        Serial.println("Data successfully sent.");
    }else{
        if(counter > 10 && httpCode == -1) {
            Serial.println("WiFi: still not connected -> reboot.");
            WiFi.forceSleepBegin(); wdt_reset(); ESP.restart(); while(1)wdt_reset();
        }
        counter++;
        Serial.println("Data were not sent. Check network connection.");
    }
    Serial.println("");  
}

void sendDataToBigQuery(float temp, float humidity, float pressure, int pm_1_0, int pm_2_5, int pm_10_0) {
    const char* functions_url = "https://us-central1-air-quality-weather.cloudfunctions.net/input-data-js";
    String post_data = getJSON(temp, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
    Serial.println(post_data);
}

void sendData(float temperature, float humidity, float pressure, int pm_1_0, int pm_2_5, int pm_10_0){
    //sendDataToCorlysis(temperature, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
    //sendDataToBigQuery(temperature, humidity, pressure, pm_1_0, pm_2_5, pm_10_0);
}

void setup()
{  

    Serial.begin(9600);  // GPIO2 (D4 pin on ESP-12E Development Board)
    Serial.println("\nStarting...");
    Serial.setDebugOutput(true);
    //WiFi.disconnect();
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

    Wire.begin();                                                      // initialize I2C that connects to sensor
    BMESensor.begin();  
}

void loop()
{
  if (pms.read(data))
  {
    Serial.print("PM 1.0 (ug/m3): ");
    Serial.println(data.PM_AE_UG_1_0);

    Serial.print("PM 2.5 (ug/m3): ");
    Serial.println(data.PM_AE_UG_2_5);

    Serial.print("PM 10.0 (ug/m3): ");
    Serial.println(data.PM_AE_UG_10_0);

    BMESensor.refresh();                                                  // read current sensor data
    Serial.print("Temperature: ");
    Serial.print(BMESensor.temperature);                                  // display temperature in Celsius
    Serial.print("C / ");
    Serial.print(BMESensor.temperature * 1.8 + 32);                                  // display temperature in Celsius
    Serial.println("F");

    Serial.print("Humidity:    ");
    Serial.print(BMESensor.humidity);                                     // display humidity in %   
    Serial.println("%");

    Serial.print("Pressure:    ");
    Serial.print(BMESensor.pressure  / 100.0F);                           // display pressure in hPa
    Serial.println("hPa");

    float relativepressure = BMESensor.seaLevelForAltitude(MYALTITUDE) / 100.0F;
    Serial.print("RelPress:    ");
    Serial.print(relativepressure);                             // display relative pressure in hPa for given altitude
    Serial.println("hPa");  

    Serial.println();

    AVG_PM_SP_UG_1_0 = exp_avg(AVG_PM_SP_UG_1_0, (float) data.PM_AE_UG_1_0);
    AVG_PM_AE_UG_2_5 = exp_avg(AVG_PM_AE_UG_2_5, (float) data.PM_AE_UG_2_5);
    AVG_PM_AE_UG_10_0 = exp_avg(AVG_PM_AE_UG_10_0, (float) data.PM_AE_UG_10_0);
    AVG_TEMPRATURE = exp_avg(AVG_TEMPRATURE, (float) BMESensor.temperature);
    AVG_HUMIDITY = exp_avg(AVG_HUMIDITY, (float) BMESensor.humidity);
    AVG_PRESSURE_ADJ = exp_avg(AVG_PRESSURE_ADJ, (float) relativepressure);

    counter++;
    if (counter >= 10)
    {   
        counter = 0;
        Serial.println("SEND DATA");
        //sendDataToCorlysis(AVG_TEMPRATURE, AVG_HUMIDITY, AVG_PRESSURE_ADJ, round(AVG_PM_SP_UG_1_0), round(AVG_PM_AE_UG_2_5), round(AVG_PM_AE_UG_10_0));
    }
  }
  server.handleClient();

}