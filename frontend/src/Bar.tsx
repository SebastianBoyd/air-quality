import { Component, createMemo, For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { AQItoDesc, AQIData } from './aqi_calculations';

interface BarProps {
    data: AQIData[];
}

const Bar: Component<BarProps> = (props) => {
    const padding = { top: 10, right: 20, bottom: 40, left: 40 };
    const [width, setWidth] = createSignal(500);
    let height = 200;
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

    const xScale = (value: number) => {
        let start = padding.left;
        let end = width() - padding.right;
        return (end - start) / props.data.length * value + start;
    }

    const max = (list: any[], fn: (d: any) => number) => {
        return Math.max(...list.map(fn));
    }

    const yDomain = createMemo(() => [-0.5, max(props.data, d => d.aqi)]);

    const yScale = (value: number) => {
        let start = height - padding.top - padding.bottom;
        let end = padding.top;
        const domain = yDomain();
        return (end - start) / (domain[1] - domain[0]) * (value - domain[0]) + start;
    }

    const xTicks = createMemo(() => props.data.map(d => parseInt(d.hour || "0"))); // Assuming hour is string or number

    const setTicks = (maxVal: number) => {
        if (maxVal < 0) {
            return [];
        }
        const step_goal = maxVal / 10;
        const possibleSteps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
        const step = possibleSteps.reduce((prev, curr) => Math.abs(curr - step_goal) < Math.abs(prev - step_goal) ? curr : prev);
        const num_steps = Math.round(maxVal / step) + 1;
        return Array.from(new Array(num_steps), (x, i) => i * step);
    }

    const yTicks = createMemo(() => setTicks(yDomain()[1]));

    const innerWidth = () => width() - (padding.left + padding.right);
    const barWidth = () => innerWidth() / props.data.length;

    return (
        <div ref={containerRef} class="chart" style={{ width: "100%", height: "200px" }}>
            <svg style={{ width: "100%", height: "200px" }} viewBox={`0 0 ${width()} ${height}`} preserveAspectRatio="none">
                {/* y axis */}
                <g class="axis y-axis" transform={`translate(0,${padding.top})`}>
                    <For each={yTicks()}>
                        {(tick) => (
                            <g class={`tick tick-${tick}`} transform={`translate(20, ${yScale(tick)})`}>
                                <line x2="100%" class="tick-line"></line>
                                <Show when={tick >= 0}>
                                    <text y="-2">{tick}</text>
                                </Show>
                            </g>
                        )}
                    </For>
                </g>

                {/* x axis */}
                <g class="axis x-axis">
                    <For each={xTicks()}>
                        {(tick, i) => (
                            <g class="tick" transform={`translate(${xScale(i())},${height - padding.bottom + 16})`}>
                                <Show when={tick % 2 === 0}>
                                    <line x1={barWidth() / 2} x2={barWidth() / 2} y1="-10" y2="-16"></line>
                                    <text x={barWidth() / 2} y="-2">{tick}</text>
                                </Show>
                            </g>
                        )}
                    </For>
                </g>

                <g class='bars'>
                    <For each={props.data}>
                        {(d, i) => (
                            <Show when={d.aqi != null}>
                                <rect
                                    x={xScale(i()) + 2}
                                    y={yScale(d.aqi) + padding.top}
                                    width={barWidth() - 2}
                                    height={height - padding.bottom - padding.top - yScale(d.aqi)}
                                    fill={AQItoDesc(d.aqi).color}
                                ></rect>
                            </Show>
                        )}
                    </For>
                </g>
                <text
                    transform={`translate(${innerWidth() / 2 + padding.left},${height - padding.bottom / 4})`}
                    text-anchor="middle"
                    class="axis-label"
                >Time (24h)</text>
                <text
                    transform={`translate(${12},${height / 2 - padding.top}) rotate(-90)`}
                    text-anchor="middle"
                    class="axis-label"
                >AQI</text>
            </svg>
        </div>
    );
};

export default Bar;
