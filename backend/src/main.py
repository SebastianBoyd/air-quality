import socket
from database import init_tables
from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from schedule import setup_jobs, stop_jobs
from refresh_data import read_sensor
from query import hourly_aqi, daily_aqi

app = FastAPI()
router = APIRouter(prefix="/api")

# memcache = {'hourly-1': None, 'hourly-2': None}

origins = ["https://air.sebastianboyd.com", "http://localhost:5000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

allowed_ips = ["127.0.0.1", "98.234.210.36"]

@app.on_event("startup")
async def startup_event():
    hostname = "pacific.sebastianboyd.com"
    ip_address = socket.gethostbyname(hostname)
    allowed_ips.append(ip_address)
    await init_tables()
    await setup_jobs()


@app.on_event("shutdown")
async def shutdown():
    await stop_jobs()
    print('shutdown')


@router.get("/")
async def root():
    return {"message": "Hello World"}


@router.get("/current/{device_id}")
async def current_usage(device_id: str):
    if device_id == '1':
        url = "http://pacific.sebastianboyd.com:8717/json"
    elif device_id == '2':
        url = "http://pacific.sebastianboyd.com:8626/json"
    else:
        raise HTTPException(status_code=404, detail="device does not exist")
    return await read_sensor(url)


@router.get("/hourly/{device_id}")
async def hourly(device_id: int):
    return await hourly_aqi(device_id)

@router.get("/daily/{device_id}")
async def daily(device_id: int):
    return await daily_aqi(device_id)

@router.get("/check_ip")
async def check_ip(request: Request):
    return request.client.host


@router.get("/indoor_allowed")
async def indoor_allowed(request: Request):
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if not x_forwarded_for:
        return True
    return x_forwarded_for.split(",")[0] in allowed_ips

app.include_router(router)