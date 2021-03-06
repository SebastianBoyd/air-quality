<script>
	import {AQItoDesc} from './aqi_calculations';

	export let data;

	const padding = { top: 10, right: 20, bottom: 40, left: 40 };

	let width = 500;
	let height = 200;

	let xScale = (value) => {
		let start = padding.left;
		let end = width - padding.right;
		return (end - start) / data.length * value + start
	} 

	let max = (list, fn) => {
		return Math.max(...list.map(fn))
	}

	$: yDomain = [-0.5, max(data, d => d.aqi)]

	let yScale = (value) => {
		let start = height - padding.top - padding.bottom;
		let end = padding.top;
		return (end - start) / (yDomain[1] - yDomain[0]) * (value - yDomain[0]) + start 
	} 

	$: xTicks = data.map(d => d.hour);
	
	let setTicks = (max) => {
		if (max < 0) {
			return []
		}
		const step_goal = max / 10
		const possibleSteps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000]
		const step = possibleSteps.reduce((prev, curr) => Math.abs(curr - step_goal) < Math.abs(prev - step_goal) ? curr : prev);
		const num_steps = Math.round(max / step) + 1;
		return Array.from(new Array(num_steps), (x, i) => i * step);
	}

	$: yTicks = setTicks(yDomain[1]);

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
					{#if tick >= 0}
						<text y="-2">{tick}</text>
					{/if}
				</g>
			{/each}
		</g>

		<!-- x axis -->
		<g class="axis x-axis">
			{#each xTicks as tick, i}
				<g class="tick" transform="translate({xScale(i)},{height - padding.bottom + 16})">
					{#if tick % 2 == 0}
						<line x1="{barWidth/2}" x2="{barWidth/2}" y1="-10" y2="-16"></line>
						<text x="{barWidth/2}" y="-2">{tick}</text>
					{/if}
				</g>
			{/each}
		</g>

		<g class='bars'>
			{#each data as d, i}
				{#if d.aqi != null}
				<rect
					x="{xScale(i) + 2}"
					y="{yScale(d.aqi) + padding.top}"
					width="{barWidth - 2}"
					height="{height - padding.bottom - padding.top - yScale(d.aqi)}"
					fill="{AQItoDesc(d.aqi).color}"
				></rect>
				{/if}
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

	.y-axis .tick line {
		stroke: #d1d1d1;
		stroke-dasharray: 2;
	}

	.x-axis .tick line {
		stroke: #7e7e7e;
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
		font-weight: 300;
		fill: currentColor;
	}

	@media (prefers-color-scheme: dark) {
		.tick text {
			fill: #d1d1d1;
		}
		.y-axis .tick line {
			fill: #7e7e7e;
		}
	}
</style>
