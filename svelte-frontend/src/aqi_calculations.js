function AQIpercent(AQI, rangeStart, rangeEnd) {
  return (AQI - rangeStart) / (rangeEnd - rangeStart) * 100;
}

export function AQItoDesc(AQI) {
  let data = {}
  if (isNaN(AQI)) {
    data.text = "Loading...";
    data.color = "#d1d1d1";
    data.percent = 0;
  } else if (AQI <= 25) {
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

export function OverallAQI(pm_2_5, pm_10_0) {
  return Math.max(AQIPM25(pm_2_5), AQIPM10(pm_10_0))
}

function Linear(AQIhigh, AQIlow, Conchigh, Conclow, Concentration) {
  var linear;
  var Conc = parseFloat(Concentration);
  var a;
  a = ((Conc - Conclow) / (Conchigh - Conclow)) * (AQIhigh - AQIlow) + AQIlow;
  linear = Math.round(a);
  return linear;
}

function AQIPM25(Concentration) {
  var Conc = parseFloat(Concentration);
  var c;
  var AQI;
  c = (Math.floor(10 * Conc)) / 10;
  if (c >= 0 && c < 12.1) {
      AQI = Linear(50, 0, 12, 0, c);
  } else if (c >= 12.1 && c < 35.5) {
      AQI = Linear(100, 51, 35.4, 12.1, c);
  } else if (c >= 35.5 && c < 55.5) {
      AQI = Linear(150, 101, 55.4, 35.5, c);
  } else if (c >= 55.5 && c < 150.5) {
      AQI = Linear(200, 151, 150.4, 55.5, c);
  } else if (c >= 150.5 && c < 250.5) {
      AQI = Linear(300, 201, 250.4, 150.5, c);
  } else if (c >= 250.5 && c < 350.5) {
      AQI = Linear(400, 301, 350.4, 250.5, c);
  } else if (c >= 350.5 && c < 500.5) {
      AQI = Linear(500, 401, 500.4, 350.5, c);
  } else {
      AQI = "500";
  }
  return AQI;
}

function AQIPM10(Concentration) {
  var Conc = parseFloat(Concentration);
  var c;
  var AQI;
  c = Math.floor(Conc);
  if (c >= 0 && c < 55) {
      AQI = Linear(50, 0, 54, 0, c);
  } else if (c >= 55 && c < 155) {
      AQI = Linear(100, 51, 154, 55, c);
  } else if (c >= 155 && c < 255) {
      AQI = Linear(150, 101, 254, 155, c);
  } else if (c >= 255 && c < 355) {
      AQI = Linear(200, 151, 354, 255, c);
  } else if (c >= 355 && c < 425) {
      AQI = Linear(300, 201, 424, 355, c);
  } else if (c >= 425 && c < 505) {
      AQI = Linear(400, 301, 504, 425, c);
  } else if (c >= 505 && c < 605) {
      AQI = Linear(500, 401, 604, 505, c);
  } else {
      AQI = "500";
  }
  return AQI;
}