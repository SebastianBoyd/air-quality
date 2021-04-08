<script>
	import AQIMeter from './AQIMeter.svelte';
	import Bar from './Bar.svelte';
	import {OverallAQI} from './aqi_calculations';

	let points = [];

	let aqi = NaN;

	function realtime_loaded(data) {
		console.log(data);
		aqi = OverallAQI(data.pm_2_5, data.pm_10_0)
	}
	
	function hourly_loaded(data) {
		console.log(data);
		points = data;
	}

	fetch('https://thoughtless.sebastianboyd.com/json')
		.then(response => response.json())
		.then(data => realtime_loaded(data));

	fetch('http://doubtful.duckdns.org:8000/hourly')
		.then(response => response.json())
		.then(data => hourly_loaded(data));
</script>

<div class="container">
	<h3>Current AQI</h3>
	<AQIMeter aqi={aqi}></AQIMeter>
	<h3>AQI Last 24 Hours</h3>
	<Bar data={points}></Bar>
</div>

<style>
	.container {
		margin-left: auto;
		margin-right: auto;
		width: 75%;
		padding: 10px;
		max-width: 600px;
	}
	h3 {
		font-weight: 200;
	}
</style>