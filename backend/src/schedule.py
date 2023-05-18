from datetime import datetime, timedelta, timezone

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from query import check_last_entry_time
from refresh_data import refresh_all_sensors

scheduler = AsyncIOScheduler(job_defaults={'misfire_grace_time': 30},)

async def setup_jobs():
    scheduler.start()

    update_time = await check_last_entry_time()

    if update_time == None or update_time < datetime.now(timezone.utc) - timedelta(minutes=5):
        print("update more than 5 minutes ago")
        run_time = datetime.now()
    else:
        print("update less than 5 minutes ago")
        run_time = update_time + timedelta(minutes=5)
        run_time = run_time.replace(tzinfo=pytz.utc)
    
    scheduler.add_job(refresh_all_sensors, 'interval', minutes=5,
                      id='sensor_schedule', next_run_time=run_time)
    # scheduler.add_job(refresh_all_hourly, 'interval', minutes=1,
    #                   id='refresh_all_hourly_schedule', next_run_time=datetime.now(timezone.utc))
    # scheduler.add_job(refresh_all_daily, 'interval', hours=1,
    #                   id='refresh_all_daily_schedule', next_run_time=datetime.now(timezone.utc))

async def stop_jobs():
    scheduler.remove_job('sensor_schedule')
    scheduler.shutdown()