from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import database_startup, engine, sensordata
import sqlalchemy as sqa
import aiohttp
from datetime import datetime, timedelta, timezone
import math
import pytz

scheduler = AsyncIOScheduler(job_defaults={'misfire_grace_time': 30},)

http_session = None

app = FastAPI()

memcache = {'hourly-1': None, 'hourly-2': None}

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
    await database_startup

    update_time = await check_last_entry_time()

    if update_time == None or update_time < datetime.now(timezone.utc) - timedelta(minutes=5):
        print("update more than 5 minutes ago")
        run_time = datetime.now()
    else:
        print("update less than 5 minutes ago")
        run_time = update_time + timedelta(minutes=5)
        run_time = run_time.replace(tzinfo=pytz.utc)

    scheduler.add_job(store_all, 'interval', minutes=5,
                      id='sensor_schedule', next_run_time=run_time)
    scheduler.add_job(refresh_all_hourly, 'interval', minutes=1,
                      id='refresh_all_hourly_schedule', next_run_time=datetime.now(timezone.utc))
    scheduler.add_job(refresh_all_daily, 'interval', hours=1,
                      id='refresh_all_daily_schedule', next_run_time=datetime.now(timezone.utc))
    
    await refresh_daily(1)


@app.on_event("shutdown")
async def shutdown():
    scheduler.remove_job('sensor_schedule')
    await http_session.close()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/test")
async def test():
    async with engine.connect() as conn:
        query = sqa.select(sensordata).order_by(
            sensordata.c.timestamp.desc()).limit(20)
        result = await conn.execute(query)
        return result.fetchall()


@app.get("/current/{device_id}")
async def current_usage(device_id: str):
    if device_id == '1':
        url = "http://pacific.sebastianboyd.com:8717/json"
    elif device_id == '2':
        url = "http://pacific.sebastianboyd.com:8626/json"
    else:
        raise HTTPException(status_code=404, detail="device does not exist")
    return await read_sensor(url)


@app.get("/hourly/{device_id}")
async def hourly(device_id: int):
    return memcache["hourly-{}".format(device_id)]

@app.get("/daily/{device_id}")
async def daily(device_id: int):
    return memcache["daily-{}".format(device_id)]


@app.get("/check_ip")
async def check_ip(request: Request):
    return request.client.host


@app.get("/indoor_allowed")
async def indoor_allowed(request: Request):
    allowed_ips = ["127.0.0.1", "192.168.1.1", "98.37.4.219", "98.234.210.36"]
    return request.client.host in allowed_ips


async def check_last_entry_time():
    async with engine.connect() as conn:
        query = sqa.select(sensordata.c.timestamp).order_by(
            sensordata.c.timestamp.desc()).limit(1)
        result = await conn.execute(query)
        latest_value = result.fetchone()
    if latest_value == None:
        return None
    return latest_value[0].replace(tzinfo=timezone.utc)


async def read_sensor(url):
    print("attempting to read sensor data now ({})".format(
        datetime.now(timezone.utc)))

    try:
        async with http_session.get(url) as response:
            print(response.status)
            if response.status == 200:
                result = await response.json(content_type='text/json')
                print(result)
                return result

    except aiohttp.ClientConnectorError as e:
          print('Connection Error', str(e))


async def store_all():
    await store_values("http://pacific.sebastianboyd.com:8717/json", 1)
    await store_values("http://pacific.sebastianboyd.com:8626/json", 2)


async def store_values(url, device_id):
    result = await read_sensor(url)
    if result is None:
        print("Failed to load data")
        return
    print(result.get('temp'))
    values = {
        "timestamp": datetime.now(timezone.utc),
        "device_id": device_id,
        "temperature": result.get('temp'),
        "humidity": result.get('humidity'),
        "pressure": result.get('pressure'),
        "pm_1_0": result.get('pm_1_0'),
        "pm_2_5": result.get('pm_2_5'),
        "pm_10_0": result.get('pm_10_0'),
        }
    query = sqa.insert(sensordata).values(**values)

    async with engine.connect() as conn:
        await conn.execute(query)
        await conn.commit()

def get_all_device_ids():
    # Will be more complex when we support more devices
    return [1, 2]

async def refresh_all_hourly():
    for device_id in get_all_device_ids():
        await refresh_hourly(device_id)

async def refresh_all_daily():
    for device_id in get_all_device_ids():
        await refresh_daily(device_id)

async def avg_sensor_data(format_string, sensordata, device_id, time_range, time_now, offset_string=None):
    async with engine.connect() as conn:
        query = sqa.select(
                sqa.func.strftime(format_string,
                                sqa.func.datetime(sensordata.c.timestamp, offset_string) if offset_string
                                else sensordata.c.timestamp).label("time"),
                sqa.func.avg(sensordata.c.pm_2_5).label("avg_pm_2_5"),
                sqa.func.avg(sensordata.c.pm_10_0).label("avg_pm_10_0")
            ) \
            .where(sensordata.c.timestamp.between(time_range, time_now) & (sensordata.c.device_id == device_id)) \
            .group_by("time") \
            .order_by("time")
        
        results = await conn.execute(query)
        data = results.fetchall()
        
        return data

async def refresh_hourly(device_id):
    
    timezone_name = "America/Los_Angeles"
    local_timezone = pytz.timezone(timezone_name)
    utc_offset = datetime.now(local_timezone).utcoffset()
    offset_string = f"{int(utc_offset.total_seconds() / 60)} minutes"
    
    format_string = "%Y-%m-%d %H:00:00"

    hours_range = 24        
    time_now = datetime.now(timezone.utc)        
    time_range = time_now - timedelta(hours=hours_range)

    data = await avg_sensor_data(format_string, sensordata, device_id, time_range, time_now, offset_string)
        
    result_hours = {datetime.strptime(item[0], format_string).replace(tzinfo=timezone.utc): (item[1], item[2]) for item in data}
         
    time_range_local = time_range.astimezone(local_timezone).replace(minute=0, second=0, microsecond=0)
    timestamps = [(time_range_local + timedelta(hours=i)) for i in range(1, hours_range + 1)]

    filled_data = [
        {
            "hour": ts.hour,
            "aqi": NoneMax(AQI_PM_2_5(result_hours[ts][0]), AQI_PM_10(result_hours[ts][1]))
            if ts in result_hours
            else None
        }
        for ts in timestamps
    ]

    memcache["hourly-{}".format(device_id)] = filled_data

async def refresh_daily(device_id):
    timezone_name = 'America/Los_Angeles'
    local_timezone = pytz.timezone(timezone_name)
    utc_offset = datetime.now(local_timezone).utcoffset()
    offset_string = f"{int(utc_offset.total_seconds() / 60)} minutes"
    format_string = "%Y-%m-%d"

    days_range = 7
    time_now = datetime.now(timezone.utc)
    time_range = time_now - timedelta(days=days_range)


    data = await avg_sensor_data(format_string, sensordata, device_id, time_range, time_now, offset_string)
    
    result_days = {datetime.strptime(item[0], format_string): (item[1], item[2]) for item in data}
    
    time_range_local = time_range.astimezone(local_timezone).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    timestamps = [(time_range_local + timedelta(days=i)) for i in range(1, days_range + 1)]

    filled_data = [
        {
            "day": ts.day,
            "aqi": max(AQI_PM_2_5(result_days[ts][0]), AQI_PM_10(result_days[ts][1]))
            if ts in result_days
            else None,
        }
        for ts in timestamps
    ]

    memcache["daily-{}".format(device_id)] = filled_data

def linear(AQIhigh, AQIlow, Conchigh, Conclow, Concentration):
    a = ((Concentration - Conclow) / (Conchigh - Conclow)) * (AQIhigh - AQIlow) + AQIlow
    return round(a)

def NoneMax(a, b):
    if a == None: return b
    if b == None: return a
    return max(a, b)

def AQI_PM_2_5(concentration):
    if concentration == None: return None
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
    if concentration == None: return None
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
