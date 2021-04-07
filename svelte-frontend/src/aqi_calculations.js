function AQIpercent(AQI, rangeStart, rangeEnd) {
  return (AQI - rangeStart) / (rangeEnd - rangeStart) * 100;
}

export function AQItoDesc(AQI) {
  let data = {}
  if (AQI <= 25) {
    data.text = "Very Good";
    data.color = "#2196f3";
    data.percent = AQIpercent(AQI, 0, 25);
  } else if (AQI <= 50) {
    data.text = "Good";
    data.color = "#4caf50";
    data.percent = (AQI - 25) / 50.0;
    data.percent = AQIpercent(AQI, 25, 50);
  } else if (AQI <= 100) {
    data.text = "Moderate";
    data.color = "#f9a825";
    data.percent = (AQI - 50) / (100.0 - 50);
    data.percent = AQIpercent(AQI, 50, 100);
  } else if (AQI <= 150) {
    data.text = "Unhealthy for Sensitive Groups";
    data.color = "#ff5722";
    data.percent = (AQI - 100) / 150.0;
    data.percent = AQIpercent(AQI, 100, 150);
  } else if (AQI <= 200) {
    data.text = "Unhealthy";
    data.color = "#ed2f21";
    data.percent = (AQI - 150) / 200.0;
    data.percent = AQIpercent(AQI, 150, 200);
  } else if (AQI <= 300) {
    data.text = "Very Unhealthy";
    data.color = "#9c27b0";
    data.percent = (AQI - 200) / 300.0;
    data.percent = AQIpercent(AQI, 200, 300);
  } else if (AQI <= 400) {
    data.text = "Hazardous";
    data.color = "#B22222";
    data.percent = (AQI - 300) / 400.0;
    data.percent = AQIpercent(AQI, 300, 400);
  } else if (AQI < 500) {
    data.text = "Super Hazardous";
    data.color = "#800000";
    data.percent = (AQI - 400) / 500.0;
    data.percent = AQIpercent(AQI, 400, 500);
  } else {
    data.text = "Apocalyptic";
    data.color = "#000000";
    data.percent = 100;
  }
  return data;
}