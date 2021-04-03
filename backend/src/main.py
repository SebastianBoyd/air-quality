from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import databases
import sqlalchemy
import aiohttp
import datetime

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
    if update_time < datetime.datetime.now() - datetime.timedelta(minutes=5):
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