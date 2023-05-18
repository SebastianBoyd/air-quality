from src.aqi import overall_aqi, aqi_pm_2_5, aqi_pm_10

def test_aqi_pm_2_5():
    assert aqi_pm_2_5(None) is None
    assert aqi_pm_2_5(0) == 0
    assert aqi_pm_2_5(50) == 137
    assert aqi_pm_2_5(400) == 434
    assert aqi_pm_2_5(999) == 500

def test_aqi_pm_10():
    assert aqi_pm_10(None) is None
    assert aqi_pm_10(0) == 0
    assert aqi_pm_10(50) == 46
    assert aqi_pm_10(400) == 266
    assert aqi_pm_2_5(999) == 500

def test_overall_aqi():
    assert overall_aqi(None, None) is None
    assert overall_aqi(50, 50) == 137
    assert overall_aqi(0, None) == 0
    assert overall_aqi(None, 50) == 46
    assert overall_aqi(50, 400) == 266