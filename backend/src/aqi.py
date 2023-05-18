import math

def overall_aqi(pm_2_5, pm_10):
    return NoneMax(aqi_pm_2_5(pm_2_5), aqi_pm_10(pm_10))

def aqi_pm_2_5(concentration):
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
        AQI = 500
    return AQI

def aqi_pm_10(concentration):
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
        AQI = 500
    return AQI

def linear(AQIhigh, AQIlow, Conchigh, Conclow, Concentration):
    a = ((Concentration - Conclow) / (Conchigh - Conclow)) * (AQIhigh - AQIlow) + AQIlow
    return round(a)

def NoneMax(a, b):
    if a == None: return b
    if b == None: return a
    return max(a, b)