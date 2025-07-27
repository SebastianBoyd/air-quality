<script>
	import AQIMeter from "./AQIMeter.svelte";
	import Bar from "./Bar.svelte";
	import Circles from "./Circles.svelte";
	import { OverallAQI } from "./aqi_calculations";

	let points = [];
	let indoor_points = [];
	let outdoor_circles = [];
	let indoor_circles = [];

	let aqi = NaN;
	let indoor_aqi = NaN;

	let indoor_enabled = getLocalStorageBool("indoor_enabled");

	if (!indoor_enabled) {
		updateIndoorEnabled("/api/indoor_allowed");
	}

	const urls = {
		outdoorCurrent: "/api/current/1",
		outdoorHourly: "/api/hourly/1",
		outdoorDaily: "/api/daily/1",
		indoorCurrent: "/api/current/2",
		indoorHourly: "/api/hourly/2",
		indoorDaily: "/api/daily/2",
	};

	loadOutdoorData();

	$: if (indoor_enabled) {
		loadIndoorData();
	}

	function loadOutdoorData() {
		fetchData(urls.outdoorCurrent, (data) => (aqi = OverallAQI(data.pm_2_5, data.pm_10_0)));
		fetchData(urls.outdoorHourly, (data) => (points = data));
		fetchData(urls.outdoorDaily, (data) => (outdoor_circles = data));
	}

	function loadIndoorData() {
		fetchData(urls.indoorCurrent, (data) => (indoor_aqi = OverallAQI(data.pm_2_5, data.pm_10_0)));
		fetchData(urls.indoorHourly, (data) => (indoor_points = data));
		fetchData(urls.indoorDaily, (data) => (indoor_circles = data));
	}

	function fetchData(url, callback) {
		fetch(url)
			.then((response) => response.json())
			.then(callback);
	}

	function updateIndoorEnabled(url) {
		fetch(url)
			.then((response) => response.json())
			.then((data) => {
				indoor_enabled = data;
				localStorage.setItem("indoor_enabled", data);
			});
	}

	function getLocalStorageBool(key) {
		return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : false;
	}
</script>

<div class="container">
	<h3>Outdoor AQI</h3>
	<AQIMeter {aqi} />

	{#if indoor_enabled}
		<h3>Indoor AQI</h3>
		<AQIMeter aqi={indoor_aqi} />
	{/if}

	<h3>Outdoor AQI Last 24 Hours</h3>
	<Bar data={points} />

	{#if indoor_enabled}
		<h3>Indoor AQI Last 24 Hours</h3>
		<Bar data={indoor_points} />
	{/if}

	<h3>Outdoor AQI Last 7 Days</h3>
	<Circles data={outdoor_circles} />

	{#if indoor_enabled}
		<h3>Indoor AQI Last 7 Days</h3>
		<Circles data={indoor_circles} />
	{/if}
</div>

<style>
	@font-face {
		font-family: "Open Sans";
		src: url("/Open_Sans/OpenSans-Regular.ttf") format("truetype");
		font-display: swap;
	}

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