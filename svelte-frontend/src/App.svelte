<script>
	import AQIMeter from './AQIMeter.svelte';
	import Bar from './Bar.svelte';
	import {OverallAQI} from './aqi_calculations';

	let points = [];
	let indoor_points = [];

	let aqi = NaN;
	let pm_1_0 = '';
	let pm_2_5 = '';
	let pm_10_0 = '';

	let indoor_aqi = NaN;

	function realtime_loaded(data) {
		console.log(data);
		pm_1_0 = data.pm_1_0;
		pm_2_5 = data.pm_2_5;
		pm_10_0 = data.pm_10_0;
		aqi = OverallAQI(data.pm_2_5, data.pm_10_0)
	}
	
	function hourly_loaded(data) {
		console.log(data);
		points = data;
	}

	function getLocalStorageBool(key) {
		if (localStorage[key] === undefined) {
			return false
		}
		return JSON.parse(localStorage[key])
	}

	let indoor_enabled = getLocalStorageBool("indoor_enabled")
	if (!indoor_enabled) {
	fetch('https://air.sebastianboyd.com/api/indoor_allowed')
		.then(response => response.json())
		.then(data => {
			indoor_enabled = data
			localStorage["indoor_enabled"] = data;
		});
	}

	$: if (indoor_enabled) {
		fetch('https://air.sebastianboyd.com/api/current/2')
		.then(response => response.json())
		.then(data => {
			console.log(data)
			indoor_aqi = OverallAQI(data.pm_2_5, data.pm_10_0)
		});

		fetch('https://air.sebastianboyd.com/api/hourly/2')
		.then(response => response.json())
		.then(data => indoor_points = data);
	}

	fetch('https://air.sebastianboyd.com/api/current/1')
		.then(response => response.json())
		.then(data => realtime_loaded(data));

	fetch('https://air.sebastianboyd.com/api/hourly/1')
		.then(response => response.json())
		.then(data => hourly_loaded(data));
</script>

<div class="container">
	<h3>Outdoor AQI</h3>
	<AQIMeter aqi={aqi}></AQIMeter>

	{#if indoor_enabled}
	<h3>Indoor AQI</h3>
	<AQIMeter aqi={indoor_aqi}></AQIMeter>
	{/if}

	<h3>Outdoor AQI Last 24 Hours</h3>
	<Bar data={points}></Bar>

	{#if indoor_enabled}
	<h3>Indoor AQI Last 24 Hours</h3>
	<Bar data={indoor_points}></Bar>
	{/if}

</div>

<style>

	@font-face {	
		font-family: 'Open Sans';
		src: url('/Open_Sans/OpenSans-Regular.ttf')  format('truetype');
		font-display: swap;
	}

	table {
		font-size: 1em;
		margin-left: 32px;
	}
	td {
		padding-right: 32px;
	}
/* 
	.container {
		font-family: 'Open Sans', sans-serif;
	} */

	.container {
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		padding: 10px;
		max-width: 600px;
	}
	h3 {
		font-weight: 300;
	}
</style>