import { Component, createMemo, For } from 'solid-js';
import { AQItoDesc } from './aqi_calculations';

interface MonthlyData {
    monthIndex: number; // 0-11
    daysTotal: number;
    distribution: {
        representativeAqi: number; // Representative AQI for color
        count: number;
    }[];
}

const MonthlyAQIChart: Component = () => {
    // Defines buckets from Worst to Best to match the image (Left=Bad, Right=Good)
    // Representative AQI values used to fetch color from AQItoDesc
    const buckets = [
        { label: 'Apocalyptic', aqi: 600 },
        { label: 'Super Hazardous', aqi: 450 },
        { label: 'Hazardous', aqi: 350 },
        { label: 'Very Unhealthy', aqi: 250 },
        { label: 'Unhealthy', aqi: 175 },
        { label: 'Unhealthy for Sensitive Groups', aqi: 125 },
        { label: 'Moderate', aqi: 75 },
        { label: 'Good', aqi: 40 },
        { label: 'Very Good', aqi: 10 },
        { label: 'No Data', aqi: NaN },
    ];

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Generate fake data
    const data = createMemo(() => {
        const year = 2023;
        const result: MonthlyData[] = [];

        for (let m = 0; m < 12; m++) {
            const daysInMonth = getDaysInMonth(m, year);
            // Determine days with no data (some months might have missing data)
            const noDataCount = Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0;
            let daysRemaining = daysInMonth - noDataCount;
            const distribution = [];

            // Randomly distribute days into buckets
            // We'll iterate buckets and take a random chunk

            const validBuckets = buckets.filter(b => !Number.isNaN(b.aqi));
            const noDataBucket = buckets.find(b => Number.isNaN(b.aqi));

            for (let i = 0; i < validBuckets.length; i++) {
                if (daysRemaining === 0) {
                    distribution.push({ representativeAqi: validBuckets[i].aqi, count: 0 });
                    continue;
                }

                if (i === validBuckets.length - 1) {
                    // Last valid bucket takes all remainder of valid days
                    distribution.push({ representativeAqi: validBuckets[i].aqi, count: daysRemaining });
                    daysRemaining = 0;
                } else {
                    const maxTake = Math.min(daysRemaining, 10);

                    // Randomized distribution logic
                    const r = Math.random();
                    let take = 0;
                    if (r > 0.3) {
                        take = Math.floor(Math.random() * (maxTake + 1));
                    }
                    // Ensure we don't take more than remaining
                    take = Math.min(take, daysRemaining);

                    distribution.push({ representativeAqi: validBuckets[i].aqi, count: take });
                    daysRemaining -= take;
                }
            }

            // Append No Data bucket at the end
            if (noDataBucket) {
                distribution.push({ representativeAqi: noDataBucket.aqi, count: noDataCount });
            }

            // The straightforward random above implies order dependency. 
            // Let's refine: The image has contiguous blocks.
            // My loop produces contiguous blocks.

            result.push({
                monthIndex: m,
                daysTotal: daysInMonth,
                distribution: distribution
            });
        }
        return result;
    });

    const padding = { top: 30, right: 40, bottom: 20, left: 20 };
    const rowHeight = 35;
    const gap = 4;
    const height = (rowHeight + gap) * 12 + padding.top + padding.bottom;
    const width = 600; // Fixed width for SVG logic

    const innerWidth = width - padding.left - padding.right;

    return (
        <div class="chart-container" style={{ "margin-top": "20px" }}>
            <h3>Monthly AQI Breakdown (2023)</h3>
            <div class="chart" style={{ width: "100%", "max-width": "600px", height: `${height}px` }}>
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
                    <text x={padding.left} y={20} font-size="20" font-weight="bold">Y2023</text>

                    <For each={data()}>
                        {(month, i) => {
                            let xOffset = padding.left;
                            const y = padding.top + i() * (rowHeight + gap);
                            const dayWidth = innerWidth / month.daysTotal;

                            return (
                                <g class={`month-row-${i()}`}>
                                    <For each={month.distribution}>
                                        {(bucket) => {
                                            const w = bucket.count * dayWidth;
                                            const currentX = xOffset;
                                            xOffset += w;
                                            return bucket.count > 0 ? (
                                                <rect
                                                    x={currentX}
                                                    y={y}
                                                    width={w}
                                                    height={rowHeight}
                                                    fill={AQItoDesc(bucket.representativeAqi).color}
                                                />
                                            ) : null;
                                        }}
                                    </For>
                                    {/* Month Label */}
                                    <text
                                        x={padding.left + innerWidth + 5}
                                        y={y + rowHeight / 2 + 5}
                                        font-size="14"
                                    >
                                        {monthNames[month.monthIndex]}
                                    </text>
                                </g>
                            );
                        }}
                    </For>
                </svg>
            </div>
        </div>
    );
};

export default MonthlyAQIChart;
