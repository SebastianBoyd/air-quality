<script>
    import { AQItoDesc } from "./aqi_calculations";

    export let data;

    const circleRadius = 18;
    const circlePadding = 5;
    const legendPadding = 25;

    let width;
    let height = circleRadius * 2 + 30; // 30 for text below the circle

    $: {
        width =
            circleRadius * 2 * data.length + circlePadding * (data.length - 1) + legendPadding;
    }
</script>

<div class="chart" style="width: {width}px; height: {height}px;">
    <svg {width} {height}>
        <g class="key-text">
            <text x="2" y="{circleRadius + 5}px">AQI</text>
            <text x="2" y="{circleRadius * 2 + 12}px">Date</text>
        </g>
        <g class="circle-container" transform="translate({legendPadding}, 0)">
            {#each data as item, i}
                <g
                    class="circle-group"
                    transform="translate({circleRadius * 2 * i +
                        circleRadius +
                        i * circlePadding}, {circleRadius})"
                >
                    <circle r={circleRadius} fill={AQItoDesc(item.aqi).color} />
                    <text
                        class="circle-text"
                        dy="5"
                        text-anchor="middle"
                        fill="white"
                    >
                        {#if item.aqi !== null}
                            {item.aqi}
                        {:else}
                            ~
                        {/if}
                    </text>
                    <text
                        class="day-text"
                        dy="{circleRadius + 12}px"
                        dx="-{0}px"
                        text-anchor="middle"
                    >
                        {item.day}
                    </text>
                </g>
            {/each}
        </g>
    </svg>
</div>

<style>
    .circle-container {
        display: flex;
        justify-content: space-between;
    }

    .circle-text {
        font-size: 12px;
        text-anchor: middle;
    }

    .day-text {
        font-family: Helvetica, Arial;
        font-size: 0.725em;
        font-weight: 200;
        fill: #7e7e7e;
    }

    .key-text {
        font-family: Helvetica, Arial;
        font-size: 0.725em;
        font-weight: 200;

    }
</style>