from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import databases
import sqlalchemy

DATABASE_URL = "postgresql://test:password@localhost:5432/air"
database = databases.Database(DATABASE_URL)

metadata = sqlalchemy.MetaData()

sensor_data = sqlalchemy.Table(
    "sensor-data",
    metadata,
    sqlalchemy.Column("timestamp", sqlalchemy.DateTime),
    sqlalchemy.Column("deviceID", sqlalchemy.Integer),
    sqlalchemy.Column("temp", sqlalchemy.Numeric(5,2)),
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

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    Schedule.start()
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/test")
async def test():
    query = sensor_data.select()
    return await database.fetch_all(query)

async def sensor_insert():
    query = sensor_data.insert()
    values = {"text": "example1", "completed": True}
    await database.execute(query=query, values=values)