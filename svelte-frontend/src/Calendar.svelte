<script>
	import { each } from "svelte/internal";
	import calendarize from 'calendarize';


  let width = 1000;
	let height = 200;

	const date = new Date();
	let calendar = calendarize(date);
	let days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	let month = date.toLocaleString('default', { month: 'long' });

</script>
<div class="container" bind:clientWidth={width} bind:clientHeight={height}>

	<span>{month}</span>
	<div class="month">
		{#each days_of_week as dow}
			<span>{dow}</span>
		{/each}
		{#each calendar as week}
				{#each week as day}
					<span class="day">
						{#if day != 0}
							{day}
						{/if}
					</span>
				{/each}
		{/each}
	</div>
</div>

<style>
	.month {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: right;
		grid-gap: 4px;
	}
	.day {
		display: block;
		background-color: red;
		color: white;
	}
</style>