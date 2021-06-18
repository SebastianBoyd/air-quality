from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apscheduler.schedulers.asyncio import AsyncIOScheduler
import databases
import aiohttp
import datetime
import math
import time

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/air"
database = databases.Database(DATABASE_URL)

scheduler = AsyncIOScheduler()

http_session = None

app = FastAPI()

memcache = {'hourly': None}

origins = ["https://air.sebastianboyd.com", "http://localhost:5000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    scheduler.start()
    
    global http_session
    http_session = aiohttp.ClientSession()
    await database.connect()

    update_time = await check_last_entry_time()
    if  update_time == None or update_time < datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5):
        print("update more than 5 minutes ago")
        run_time = datetime.datetime.now()
    else:
        print("update less than 5, minutes ago")
        run_time = update_time + datetime.timedelta(minutes=5)

    scheduler.add_job(store_values, 'interval', minutes=5, id='sensor_schedule', next_run_time=run_time)
    scheduler.add_job(refresh_hourly, 'interval', minutes=1, id='refresh_hourly_schedule', next_run_time=datetime.datetime.now())

@app.on_event("shutdown")
async def shutdown():
    scheduler.remove_job('sensor_schedule')
    await http_session.close()
    await database.disconnect()

@app.get("/")
async def root():
    return {"message": "Hello World2"}

@app.get("/test")
async def test():
    # query = sensor_data.select()
    query = '''
            SELECT *
            FROM sensordata
            ORDERBY timestamp DESC
            LIMIT 20
            '''
    return await database.fetch_all(query)

@app.get("/current/{device_id}")
async def current_usage(device_id: str):
    url = "http://thoughtless.duckdns.org/json"
    return await read_sensor(url)

@app.get("/hourly")
async def hourly():
    return memcache["hourly"]

async def check_last_entry_time():
    query = "SELECT timestamp FROM sensordata ORDER BY timestamp DESC LIMIT 1"
    latest_value = await database.fetch_one(query=query)
    if latest_value == None:
        return None
    return latest_value['timestamp']

async def read_sensor(url):
    print("attempting to read sensor data now ({})".format(datetime.datetime.now()))

    try:
        async with http_session.get(url) as response:
            print(response.status)
            if response.status == 200:
                result = await response.json(content_type='text/json')
                print(result)
                return result

    except aiohttp.ClientConnectorError as e:
          print('Connection Error', str(e))

async def store_values():
    url = "http://thoughtless.duckdns.org/json"
    result = await read_sensor(url)
    values = {
        "timestamp": datetime.datetime.now(),
        "device_id": 1,
        "temperature": result['temp'],
        "humidity": result['humidity'],
        "pressure": result['pressure'],
        "pm_1_0": result['pm_1_0'],
        "pm_2_5": result['pm_2_5'],
        "pm_10_0": result['pm_10_0'],
        }
    query = '''
            INSERT INTO sensordata (timestamp, device_id, temperature, humidity, 
                                    pressure, pm_1_0, pm_2_5, pm_10_0)
            VALUES (:timestamp, :device_id, :temperature, :humidity,
                    :pressure, :pm_1_0, :pm_2_5, :pm_10_0)
            '''

    await database.execute(query=query, values=values)

async def refresh_hourly():
    query = '''
        SELECT date_trunc('hour', timestamp) datetime, ROUND(AVG(pm_1_0), 2) pm_1_0, ROUND(AVG(pm_2_5), 2) pm_2_5, ROUND(AVG(pm_10_0), 2) pm_10_0
        FROM sensordata
        WHERE timestamp >= NOW() - '1 day'::INTERVAL
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY date_trunc('hour', timestamp);
    '''
    start = time.time()
    hours = await database.fetch_all(query)
    end = time.time()
    print("db lookup time: {} ms".format( round((end-start) * 1000, 2) ))
    output = []
    for h in hours:
        value = {}
        value['aqi'] = max(AQI_PM_2_5(h['pm_2_5']), AQI_PM_10(h['pm_10_0']))
        output.append(value)
    
    memcache["hourly"] = output

def linear(AQIhigh, AQIlow, Conchigh, Conclow, Concentration):
    a = ((Concentration - Conclow) / (Conchigh - Conclow)) * (AQIhigh - AQIlow) + AQIlow
    return round(a)

def AQI_PM_2_5(concentration):
    c = (math.floor(10 * concentration)) / 10
    if (c >= 0 and c < 12.1):
        AQI = linear(50, 0, 12, 0, c)
    elif (c >= 12.1 and c < 35.5):
        AQI = linear(100, 51, 35.4, 12.1, c)
    elif (c >= 35.5 and c < 55.5):
        AQI = linear(150, 101, 55.4, 35.5, c)
    elif (c >= 55.5 and c < 150.5):
        AQI = linear(200, 151, 150.4, 55.5, c)
    elif (c >= 150.5 and c < 250.5):
        AQI = linear(300, 201, 250.4, 150.5, c)
    elif (c >= 250.5 and c < 350.5):
        AQI = linear(400, 301, 350.4, 250.5, c)
    elif (c >= 350.5 and c < 500.5):
        AQI = linear(500, 401, 500.4, 350.5, c)
    else:
        AQI = "500"
    return AQI

def AQI_PM_10(concentration):
    c = math.floor(concentration)
    if (c >= 0 and c < 55):
        AQI = linear(50, 0, 54, 0, c)
    elif (c >= 55 and c < 155):
        AQI = linear(100, 51, 154, 55, c)
    elif (c >= 155 and c < 255):
        AQI = linear(150, 101, 254, 155, c)
    elif (c >= 255 and c < 355):
        AQI = linear(200, 151, 354, 255, c)
    elif (c >= 355 and c < 425):
        AQI = linear(300, 201, 424, 355, c)
    elif (c >= 425 and c < 505):
        AQI = linear(400, 301, 504, 425, c)
    elif (c >= 505 and c < 605):
        AQI = linear(500, 401, 604, 505, c)
    else:
        AQI = "500"
    return AQI
