<script>
	import { scaleLinear, scaleBand, extent, min, max } from 'd3';

	const points = [{"hours_ago":17,"aqi":18},{"hours_ago":16,"aqi":17},{"hours_ago":15,"aqi":13},{"hours_ago":14,"aqi":11},{"hours_ago":13,"aqi":10},{"hours_ago":12,"aqi":10},{"hours_ago":11,"aqi":10},{"hours_ago":10,"aqi":6},{"hours_ago":9,"aqi":7},{"hours_ago":8,"aqi":8},{"hours_ago":7,"aqi":6},{"hours_ago":6,"aqi":7},{"hours_ago":5,"aqi":3},{"hours_ago":4,"aqi":3},{"hours_ago":3,"aqi":5},{"hours_ago":2,"aqi":5},{"hours_ago":0,"aqi":4}];

// 	const xTicks = points.map(d => d.year);
// 	const yTicks = extent(points, d => d.birthrate);
	const padding = { top: 20, right: 15, bottom: 20, left: 25 };

	let width = 500;
	let height = 200;

	function formatMobile(tick) {
		return "'" + tick.toString().slice(-2);
	}

	$: xScale = scaleLinear()
		.domain([0, points.length])
		.range([padding.left, width - padding.right]);

	$: yScale = scaleLinear()
		.domain([0, max(points, d => d.aqi)])
		.range([height - padding.bottom, padding.top]);
	
	$: xTicks = points.map(d => d.hours_ago);
	
	$: yTicks = yScale.ticks();

	$: innerWidth = width - (padding.left + padding.right);
	$: barWidth = innerWidth / points.length;
</script>

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
		stroke: #e2e2e2;
		stroke-dasharray: 2;
	}

	.tick text {
		fill: #ccc;
		text-anchor: start;
	}

	.tick.tick-0 line {
		stroke-dasharray: 0;
	}

	.x-axis .tick text {
		text-anchor: middle;
	}

	.bars rect {
		fill: #a11;
		stroke: none;
		opacity: 0.65;
	}
</style>

<div class="chart" bind:clientWidth={width} bind:clientHeight={height}>
	<svg>
		<!-- y axis -->
		<g class="axis y-axis" transform="translate(0,{padding.top})">
			{#each yTicks as tick}
				<g class="tick tick-{tick}" transform="translate(0, {yScale(tick) - padding.bottom})">
					<line x2="100%"></line>
					<text y="-4">{tick} {tick === 20 ? ' per 1,000 population' : ''}</text>
				</g>
			{/each}
		</g>

		<!-- x axis -->
		<g class="axis x-axis">
			{#each xTicks as tick, i}
				<g class="tick" transform="translate({xScale(i)},{height})">
					<text x="{barWidth/2}" y="-4">{width > 380 ? tick : formatMobile(tick)}</text>
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
				></rect>
			{/each}
		</g>
	</svg>
</div>
