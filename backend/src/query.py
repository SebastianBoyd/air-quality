from datetime import datetime, timedelta, timezone

import pytz
import sqlalchemy as sqa
from aqi import overall_aqi
from database import engine, sensordata


def get_all_device_ids():
    # Will be more complex when we support more devices
    return [1, 2]

async def check_last_entry_time():
    async with engine.connect() as conn:
        query = sqa.select(sensordata.c.timestamp).order_by(
            sensordata.c.timestamp.desc()).limit(1)
        result = await conn.execute(query)
        latest_value = result.fetchone()
    if latest_value == None:
        return None
    return latest_value[0].replace(tzinfo=timezone.utc)

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

async def hourly_aqi(device_id):
    
    timezone_name = "America/Los_Angeles"
    local_timezone = pytz.timezone(timezone_name)
    
    format_string = "%Y-%m-%d %H:00:00"

    hours_range = 24        
    time_now = datetime.now(timezone.utc)        
    time_range = time_now - timedelta(hours=hours_range)

    data = await avg_sensor_data(format_string, sensordata, device_id, time_range, time_now)
        
    result_hours = {datetime.strptime(item[0], format_string).replace(tzinfo=timezone.utc): (item[1], item[2]) for item in data}
         
    time_range_local = time_range.astimezone(local_timezone).replace(minute=0, second=0, microsecond=0)
    timestamps = [(time_range_local + timedelta(hours=i)) for i in range(1, hours_range + 1)]

    filled_data = [
        {
            "hour": ts.hour,
            "aqi": overall_aqi(result_hours[ts][0], result_hours[ts][1])
            if ts in result_hours
            else None
        }
        for ts in timestamps
    ]

    return filled_data

async def daily_aqi(device_id):
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
            "aqi": overall_aqi(result_days[ts][0], result_days[ts][1])
            if ts in result_days
            else None,
        }
        for ts in timestamps
    ]

    return filled_data

async def get_monthly_data(device_id, year):
    timezone_name = 'America/Los_Angeles'
    local_timezone = pytz.timezone(timezone_name)
    utc_offset = datetime.now(local_timezone).utcoffset()
    offset_string = f"{int(utc_offset.total_seconds() / 60)} minutes"
    format_string = "%Y-%m-%d"

    # Start of year in local time
    start_local = local_timezone.localize(datetime(year, 1, 1))
    # Start of next year in local time
    end_local = local_timezone.localize(datetime(year + 1, 1, 1))
    
    # Convert to UTC for database query
    time_range = start_local.astimezone(timezone.utc)
    time_limit = end_local.astimezone(timezone.utc)
    
    # Reuse avg_sensor_data logic. Note that time_now argument in avg_sensor_data is the stored upper bound.
    data = await avg_sensor_data(format_string, sensordata, device_id, time_range, time_limit, offset_string)
    
    result_days = {datetime.strptime(item[0], format_string).date(): (item[1], item[2]) for item in data}
    
    # Generate complete list of days
    current_date = start_local.date()
    end_date = end_local.date()
    
    filled_data = []
    while current_date < end_date:
        aqi = None
        if current_date in result_days:
            pm25, pm10 = result_days[current_date]
            aqi = overall_aqi(pm25, pm10)
            
        filled_data.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "aqi": aqi
        })
        current_date += timedelta(days=1)
        
    return filled_data