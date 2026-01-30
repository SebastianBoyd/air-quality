import { Component, createResource, For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { AQItoBucketId, BucketIdToColor } from './aqi_calculations';

interface MonthlyData {
    monthIndex: number; // 0-11
    daysTotal: number;
    distribution: {
        color: string;
        count: number;
    }[];
}


interface MonthlyAQIChartProps {
    year: number;
}

const fetchMonthlyData = async (year: number) => {
    // using relative path /api which proxies to backend
    const response = await fetch(`/api/monthly/${year}?device_id=1`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

const MonthlyAQIChart: Component<MonthlyAQIChartProps> = (props) => {
    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const [dailyData] = createResource(() => props.year, fetchMonthlyData);


    const processedData = () => {
        const rawData = dailyData();
        if (!rawData) return [];

        const year = props.year;
        const result: MonthlyData[] = [];

        // Group raw data by month
        // rawData is list of { date: string, aqi: number | null }
        const dataByMonth: Record<number, { aqi: number | null }[]> = {};
        for (let i = 0; i < 12; i++) dataByMonth[i] = [];

        rawData.forEach((item: any) => {
            const parts = item.date.split('-');
            const m = parseInt(parts[1], 10) - 1;
            if (dataByMonth[m]) {
                dataByMonth[m].push(item);
            }
        });

        for (let m = 0; m < 12; m++) {
            const daysInMonth = getDaysInMonth(m, year);
            const monthData = dataByMonth[m] || [];

            // Initialize bucket counts
            const counts: Record<string, number> = {};

            monthData.forEach(day => {
                const bucketIdx = AQItoBucketId(day.aqi);
                counts[bucketIdx] = (counts[bucketIdx] || 0) + 1;
            });

            const distribution: MonthlyData['distribution'] = [];
            for (const key of Object.keys(counts).sort((a, b) => parseInt(b) - parseInt(a))) {
                distribution.push({
                    color: BucketIdToColor(parseInt(key)),
                    count: counts[key]
                });
            }

            result.push({
                monthIndex: m,
                daysTotal: daysInMonth,
                distribution: distribution
            });
        }
        return result;
    };

    const padding = { top: 30, right: 40, bottom: 20, left: 20 };
    const rowHeight = 35;
    const gap = 4;
    const height = (rowHeight + gap) * 12 + padding.top + padding.bottom;
    const [width, setWidth] = createSignal(600);
    let containerRef: HTMLDivElement | undefined;

    onMount(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setWidth(entry.contentRect.width);
                }
            }
        });
        if (containerRef) observer.observe(containerRef);
        onCleanup(() => observer.disconnect());
    });

    const innerWidth = () => width() - padding.left - padding.right;

    return (
        <div
            ref={containerRef}
            class="chart"
            style={{ width: "100%", "max-width": "600px", height: `${height}px` }}
        >
            <Show when={!dailyData.loading} fallback={<div>Loading...</div>}>
                <svg viewBox={`0 0 ${width()} ${height}`} preserveAspectRatio="xMidYMid meet">
                    <text x={padding.left} y={20} class="axis-label" font-size="20" font-weight="600">
                        Y{props.year}
                    </text>

                    <For each={processedData()}>
                        {(month, i) => {
                            const y = padding.top + i() * (rowHeight + gap);
                            const prefixCounts: number[] = [];
                            let runningTotal = 0;
                            for (const bucket of month.distribution) {
                                prefixCounts.push(runningTotal);
                                runningTotal += bucket.count;
                            }
                            const dayWidth = () => innerWidth() / month.daysTotal;

                            return (
                                <g class={`month-row-${i()}`}>
                                    <For each={month.distribution}>
                                        {(bucket, j) => (
                                            <rect
                                                x={padding.left + prefixCounts[j()] * dayWidth()}
                                                y={y}
                                                width={bucket.count * dayWidth()}
                                                height={rowHeight}
                                                fill={bucket.color}
                                            />
                                        )}
                                    </For>
                                    {/* Month Label */}
                                    <g class="tick">
                                        <text x={padding.left + innerWidth() + 5} y={y + rowHeight / 2 + 5}>
                                            {monthNames[month.monthIndex]}
                                        </text>
                                    </g>
                                </g>
                            );
                        }}
                    </For>
                </svg>
            </Show>
        </div>
    );
};

export default MonthlyAQIChart;
