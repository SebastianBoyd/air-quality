from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import databases
import sqlalchemy
import aiohttp
import datetime
import math

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/air"
database = databases.Database(DATABASE_URL)

metadata = sqlalchemy.MetaData()

sensor_data = sqlalchemy.Table(
    "sensordata",
    metadata,
    sqlalchemy.Column("timestamp", sqlalchemy.DateTime),
    sqlalchemy.Column("deviceID", sqlalchemy.Integer),
    sqlalchemy.Column("temperature", sqlalchemy.Numeric(5,2)),
    sqlalchemy.Column("humidity", sqlalchemy.Numeric(5,2)),
    sqlalchemy.Column("pressure", sqlalchemy.Numeric(6,2)),
    sqlalchemy.Column("pm_1_0", sqlalchemy.SmallInteger),
    sqlalchemy.Column("pm_2_5", sqlalchemy.SmallInteger),
    sqlalchemy.Column("pm_10_0", sqlalchemy.SmallInteger),
)

engine = sqlalchemy.create_engine(
    DATABASE_URL
)
metadata.create_all(engine)

Schedule = AsyncIOScheduler()

http_session = None

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    Schedule.start()
    
    global http_session
    http_session = aiohttp.ClientSession()
    await database.connect()

    update_time = await check_last_entry_time()
    if  update_time == None or update_time < datetime.datetime.now() - datetime.timedelta(minutes=5):
        print("update more than 5 minutes ago")
        run_time = datetime.datetime.now()
    else:
        print("update less than 5, minutes ago")
        run_time = update_time + datetime.timedelta(minutes=5)

    Schedule.add_job(read_sensor, 'interval', minutes=5, id='sensor_schedule', next_run_time=run_time)

@app.on_event("shutdown")
async def shutdown():
    scheduler.remove_job('sensor_schedule')
    await session.close()
    await database.disconnect()

@app.get("/")
async def root():
    return {"message": "Hello World2"}

@app.get("/test")
async def test():
    query = sensor_data.select()
    return await database.fetch_all(query)

@app.get("/hourly")
async def hourly():
    query = '''
        SELECT date_trunc('hour', timestamp) datetime, ROUND(AVG(pm_1_0), 2) pm_1_0, ROUND(AVG(pm_2_5), 2) pm_2_5, ROUND(AVG(pm_10_0), 2) pm_10_0
        FROM sensordata
        WHERE timestamp >= NOW() - '1 day'::INTERVAL
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY date_trunc('hour', timestamp);
    '''
    hours = await database.fetch_all(query)
    output = []
    dt = datetime.datetime.now()
    dt = dt.replace(minute=0, second=0, microsecond=0)
    for h in hours:
        value = {}
        timedelta = (dt - h['datetime'])
        value['hours_ago'] = timedelta.seconds//3600 + 24 * timedelta.days
        value['aqi'] = max(AQI_PM_2_5(h['pm_2_5']), AQI_PM_10(h['pm_10_0']))
        output.append(value)
    return output

async def check_last_entry_time():
    query = "SELECT timestamp FROM sensordata ORDER BY timestamp DESC LIMIT 1"
    latest_value = await database.fetch_one(query=query)
    if latest_value == None:
        return None
    return latest_value['timestamp']

async def read_sensor():
    print("attempting to read sensor data now ({})".format(datetime.datetime.now()))
    url = "http://thoughtless.duckdns.org/json"

    try:
        async with http_session.get(url) as response:
            print(response.status)
            if response.status == 200:
                result = await response.json(content_type='text/json')
                print(result)
                await push_sensor_to_db({
                                        "timestamp": datetime.datetime.now(),
                                        "deviceID": 1,
                                        "temperature": result['temp'],
                                        "humidity": result['humidity'],
                                        "pressure": result['pressure'],
                                        "pm_1_0": result['pm_1_0'],
                                        "pm_2_5": result['pm_2_5'],
                                        "pm_10_0": result['pm_10_0'],
                                        })

    except aiohttp.ClientConnectorError as e:
          print('Connection Error', str(e))

async def push_sensor_to_db(values):
    query = sensor_data.insert()
    await database.execute(query=query, values=values)

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
