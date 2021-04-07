<script>
	import { scaleLinear, scaleBand, extent, min, max } from 'd3';
import { text } from 'svelte/internal';
	import {AQItoDesc} from './aqi_calculations';

	const points = [{"hours_ago":17,"aqi":466},{"hours_ago":16,"aqi":120},{"hours_ago":15,"aqi":13},{"hours_ago":14,"aqi":11},{"hours_ago":13,"aqi":10},{"hours_ago":12,"aqi":10},{"hours_ago":11,"aqi":10},{"hours_ago":10,"aqi":6},{"hours_ago":9,"aqi":7},{"hours_ago":8,"aqi":8},{"hours_ago":7,"aqi":6},{"hours_ago":6,"aqi":7},{"hours_ago":5,"aqi":3},{"hours_ago":4,"aqi":3},{"hours_ago":3,"aqi":5},{"hours_ago":2,"aqi":5},{"hours_ago":0,"aqi":4}];

// 	const xTicks = points.map(d => d.year);
// 	const yTicks = extent(points, d => d.birthrate);
	const padding = { top: 10, right: 20, bottom: 40, left: 40 };

	let width = 500;
	let height = 200;

	$: xScale = scaleLinear()
		.domain([0, points.length])
		.range([padding.left, width - padding.right]);

	$: yScale = scaleLinear()
		.domain([0, max(points, d => d.aqi)])
		.range([height - padding.top - padding.bottom, padding.top]);
	
	$: xTicks = points.map(d => d.hours_ago);
	
	$: yTicks = yScale.ticks();

	$: innerWidth = width - (padding.left + padding.right);
	$: barWidth = innerWidth / points.length;
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
			{#each points as point, i}
				<rect
					x="{xScale(i) + 2}"
					y="{yScale(point.aqi)}"
					width="{barWidth - 4}"
					height="{height - padding.bottom - yScale(point.aqi)}"
					fill="{AQItoDesc(point.aqi).color}"
				></rect>
			{/each}
		</g>
		<text transform="translate({innerWidth/2 + padding.left},{height - padding.bottom / 4})" 
					text-anchor="middle"
					class="axis-label">Hours Ago</text>
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
