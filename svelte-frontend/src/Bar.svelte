<script>
	import { scaleLinear, scaleBand, extent, min, max } from 'd3';
	import {AQItoDesc} from './aqi_calculations';

	export let data;

// 	const xTicks = points.map(d => d.year);
// 	const yTicks = extent(points, d => d.birthrate);
	const padding = { top: 10, right: 20, bottom: 40, left: 40 };

	let width = 500;
	let height = 200;

	$: xScale = scaleLinear()
		.domain([0, data.length])
		.range([padding.left, width - padding.right]);

	$: yScale = scaleLinear()
		.domain([0, max(data, d => d.aqi)])
		.range([height - padding.top - padding.bottom, padding.top]);
	
	$: xTicks = data.map(d => d.hour);
	
	$: yTicks = yScale.ticks();

	$: innerWidth = width - (padding.left + padding.right);
	$: barWidth = innerWidth / data.length;
</script>

<div class="chart" bind:clientWidth={width} bind:clientHeight={height}>
	<svg>
		<!-- y axis -->
		<g class="axis y-axis" transform="translate(0,{padding.top})">
			{#each yTicks as tick}
				<g class="tick tick-{tick}" transform="translate(20, {yScale(tick)})">
					<line x2="100%"></line>
					<text y="-2">{tick}</text>
				</g>
			{/each}
		</g>

		<!-- x axis -->
		<g class="axis x-axis">
			{#each xTicks as tick, i}
				<g class="tick" transform="translate({xScale(i)},{height - padding.bottom + 16})">
					<text x="{barWidth/2}" y="-4">{tick}</text>
				</g>
			{/each}
		</g>

		<g class='bars'>
			{#each data as d, i}
				<rect
					x="{xScale(i) + 2}"
					y="{yScale(d.aqi)}"
					width="{barWidth - 4}"
					height="{height - padding.bottom - yScale(d.aqi)}"
					fill="{AQItoDesc(d.aqi).color}"
				></rect>
			{/each}
		</g>
		<text transform="translate({innerWidth/2 + padding.left},{height - padding.bottom / 4})" 
					text-anchor="middle"
					class="axis-label">Time (24h)</text>
		<text 
			transform="translate({12},{height / 2 - padding.top}) rotate(-90)" 
			text-anchor="middle"
			class="axis-label">AQI</text>
	</svg>
</div>

<style>
	h2 {
		text-align: center;
	}

	/* .chart {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	} */

	svg {
		position: relative;
		width: 100%;
		height: 200px;
	}

	.tick {
		font-family: Helvetica, Arial;
		font-size: .725em;
		font-weight: 200;
	}

	.tick line {
		stroke: #d1d1d1;
		stroke-dasharray: 2;
	}

	.tick text {
		fill: #7e7e7e;
		text-anchor: start;
	}

	.tick.tick-0 line {
		stroke-dasharray: 0;
	}

	.x-axis .tick text {
		text-anchor: middle;
	}

	.bars rect {
		/* fill: #a11; */
		stroke: none;
		/* opacity: 0.65; */
	}

	.axis-label {
		font-weight: 200;
	}
</style>
