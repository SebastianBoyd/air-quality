import { Component, createMemo, For, Show } from 'solid-js';
import { AQItoDesc, AQIData } from './aqi_calculations';

interface CirclesProps {
    data: AQIData[];
}

const Circles: Component<CirclesProps> = (props) => {
    const circleRadius = 18;
    const circlePadding = 5;
    const legendPadding = 25;

    const height = circleRadius * 2 + 30; // 30 for text below the circle

    const width = createMemo(() =>
        circleRadius * 2 * props.data.length + circlePadding * (props.data.length - 1) + legendPadding
    );

    return (
        <div class="chart" style={{ width: `${width()}px`, height: `${height}px` }}>
            <svg width={width()} height={height}>
                <g class="key-text">
                    <text x="2" y={`${circleRadius + 5}px`}>AQI</text>
                    <text x="2" y={`${circleRadius * 2 + 12}px`}>Date</text>
                </g>
                <g class="circle-container" transform={`translate(${legendPadding}, 0)`}>
                    <For each={props.data}>
                        {(item, i) => (
                            <g
                                class="circle-group"
                                transform={`translate(${circleRadius * 2 * i() +
                                    circleRadius +
                                    i() * circlePadding
                                    }, ${circleRadius})`}
                            >
                                <circle r={circleRadius} fill={AQItoDesc(item.aqi).color} />
                                <text
                                    class="circle-text"
                                    dy="5"
                                    text-anchor="middle"
                                    fill="white"
                                >
                                    <Show when={item.aqi !== null} fallback="~">
                                        {item.aqi}
                                    </Show>
                                </text>
                                <text
                                    class="day-text"
                                    dy={`${circleRadius + 12}px`}
                                    dx={`-${0}px`}
                                    text-anchor="middle"
                                >
                                    {item.day}
                                </text>
                            </g>
                        )}
                    </For>
                </g>
            </svg>
        </div>
    );
};

export default Circles;
