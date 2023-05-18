from datetime import datetime, timezone

import aiohttp
import sqlalchemy as sqa
from database import engine, sensordata


async def sensor_http_request(url, session):
    print("attempting to read sensor data now ({})".format(
        datetime.now(timezone.utc)))

    try:
        async with session.get(url) as response:
            print(response.status)
            if response.status == 200:
                result = await response.json(content_type='text/json')
                print(result)
                return result

    except aiohttp.ClientConnectorError as e:
          print('Connection Error', str(e))

async def read_sensor(url, session=None):
    if session is None:
        async with aiohttp.ClientSession() as session:
            return await sensor_http_request(url, session)
    else:
        return await sensor_http_request(url, session)


async def refresh_all_sensors():
    async with aiohttp.ClientSession() as session:
        await store_values("http://pacific.sebastianboyd.com:8717/json", 1, session)
        await store_values("http://pacific.sebastianboyd.com:8626/json", 2, session)

async def store_values(url, device_id, session):
    result = await read_sensor(url, session)
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