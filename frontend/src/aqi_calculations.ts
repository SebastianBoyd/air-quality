export type AQIDescription = {
    text: string;
    color: string;
    percent: number;
};

export interface AQIData {
    aqi: number;
    day?: string;
    hour?: string;
    pm_2_5?: number;
    pm_10_0?: number;
}

function AQIpercent(AQI: number, rangeStart: number, rangeEnd: number): number {
    return ((AQI - rangeStart) / (rangeEnd - rangeStart)) * 100;
}

export function AQItoDesc(AQI: number): AQIDescription {
    let data = {} as AQIDescription;
    if (isNaN(AQI) || AQI === null) {
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
        data.percent = AQIpercent(AQI, 25, 50);
    } else if (AQI <= 100) {
        data.text = "Moderate";
        data.color = "#f9a825";
        data.percent = AQIpercent(AQI, 50, 100);
    } else if (AQI <= 150) {
        data.text = "Unhealthy for Sensitive Groups";
        data.color = "#ff5722";
        data.percent = AQIpercent(AQI, 100, 150);
    } else if (AQI <= 200) {
        data.text = "Unhealthy";
        data.color = "#ed2f21";
        data.percent = AQIpercent(AQI, 150, 200);
    } else if (AQI <= 300) {
        data.text = "Very Unhealthy";
        data.color = "#9c27b0";
        data.percent = AQIpercent(AQI, 200, 300);
    } else if (AQI <= 400) {
        data.text = "Hazardous";
        data.color = "#B22222";
        data.percent = AQIpercent(AQI, 300, 400);
    } else if (AQI < 500) {
        data.text = "Super Hazardous";
        data.color = "#800000";
        data.percent = AQIpercent(AQI, 400, 500);
    } else {
        data.text = "Apocalyptic";
        data.color = "#000000";
        data.percent = 100;
    }
    return data;
}

export function OverallAQI(pm_2_5: number, pm_10_0: number): number {
    return Math.max(AQIPM25(pm_2_5), AQIPM10(pm_10_0));
}

function Linear(
    AQIhigh: number,
    AQIlow: number,
    Conchigh: number,
    Conclow: number,
    Concentration: number
): number {
    var linear;
    var Conc = parseFloat(Concentration.toString());
    var a;
    a = ((Conc - Conclow) / (Conchigh - Conclow)) * (AQIhigh - AQIlow) + AQIlow;
    linear = Math.round(a);
    return linear;
}

function AQIPM25(Concentration: number): number {
    var Conc = parseFloat(Concentration.toString());
    var c;
    var AQI: number;
    c = Math.floor(10 * Conc) / 10;
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
        AQI = 500;
    }
    return AQI;
}

function AQIPM10(Concentration: number): number {
    var Conc = parseFloat(Concentration.toString());
    var c;
    var AQI: number;
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
        AQI = 500;
    }
    return AQI;
}
