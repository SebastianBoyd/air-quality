import asyncio
from sqlalchemy import (Column, DateTime, Float, Integer, MetaData,
                        String, Table)

from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine('sqlite+aiosqlite:///air-quality.db')
metadata = MetaData()

sensordata = Table('sensordata', metadata,
                   Column('id', Integer, primary_key=True),
                   Column('timestamp', DateTime),
                   Column('device_id', String),
                   Column('temperature', Float),
                   Column('humidity', Float),
                   Column('pressure', Float),
                   Column('pm_1_0', Float),
                   Column('pm_2_5', Float),
                   Column('pm_10_0', Float)
                   )

async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)


# loop = asyncio.get_event_loop()
# database_startup = loop.create_task(init_tables())