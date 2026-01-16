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

const AQI_LEVELS = [
    { label: "Unknown", max: -1, color: "#d1d1d1" },
    { label: "Very Good", max: 25, color: "#2196f3" },
    { label: "Good", max: 50, color: "#4caf50" },
    { label: "Moderate", max: 100, color: "#f9a825" },
    { label: "Unhealthy for Sensitive Groups", max: 150, color: "#ff5722" },
    { label: "Unhealthy", max: 200, color: "#ed2f21" },
    { label: "Very Unhealthy", max: 300, color: "#9c27b0" },
    { label: "Hazardous", max: 400, color: "#B22222" },
    { label: "Super Hazardous", max: 499, color: "#800000" },
    { label: "Apocalyptic", max: Infinity, color: "#000000" },
];

export function AQItoBucketId(AQI: number | null): number {
    if (AQI === null) {
        return 0;
    }
    for (let i = 0; i < AQI_LEVELS.length; i++) {
        const level = AQI_LEVELS[i];
        if (AQI <= level.max) {
            return i;
        }
    }
    return 0;
}

export function BucketIdToColor(bucketIdx: number): string {
    if (bucketIdx === 0) {
        return "#d1d1d1";
    }
    return AQI_LEVELS[bucketIdx].color;
}

export function AQItoDesc(AQI: number | null): AQIDescription {
    let data = {} as AQIDescription;
    if (AQI === null || isNaN(AQI)) {
        data.text = "No Data";
        data.color = "#d1d1d1";
        data.percent = 0;
        return data;
    }

    for (let i = 0; i < AQI_LEVELS.length; i++) {
        const level = AQI_LEVELS[i];
        if (AQI <= level.max) {
            data.text = level.label;
            data.color = level.color;
            const prevMax = i === 0 ? 0 : AQI_LEVELS[i - 1].max;

            if (level.label === "Apocalyptic") {
                data.percent = 100;
            } else {
                data.percent = AQIpercent(AQI, prevMax, level.max);
            }
            return data;
        }
    }
    return data; // Should not reach here due to Infinity
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
