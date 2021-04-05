<script>
	export let aqi;
	$: aqi_description = AQItoDesc(aqi);
	
	function AQIpercent(AQI, rangeStart, rangeEnd) {
		return (AQI - rangeStart) / (rangeEnd - rangeStart) * 100;
	}
	
	function AQItoDesc(AQI) {
		let data = {}
		if (AQI <= 25) {
			data.text = "Very Good";
			data.color = "#2196f3";
			data.percent = AQIpercent(AQI, 0, 25);
		} else if (AQI <= 50) {
			data.text = "Good";
			data.color = "#4caf50";
			data.percent = (AQI - 25) / 50.0;
			data.percent = AQIpercent(AQI, 25, 50);
		} else if (AQI <= 100) {
			data.text = "Moderate";
			data.color = "#f9a825";
			data.percent = (AQI - 50) / (100.0 - 50);
			data.percent = AQIpercent(AQI, 50, 100);
		} else if (AQI <= 150) {
			data.text = "Unhealthy for Sensitive Groups";
			data.color = "#ff5722";
			data.percent = (AQI - 100) / 150.0;
			data.percent = AQIpercent(AQI, 100, 150);
		} else if (AQI <= 200) {
			data.text = "Unhealthy";
			data.color = "#ed2f21";
			data.percent = (AQI - 150) / 200.0;
			data.percent = AQIpercent(AQI, 150, 200);
		} else if (AQI <= 300) {
			data.text = "Very Unhealthy";
			data.color = "#9c27b0";
			data.percent = (AQI - 200) / 300.0;
			data.percent = AQIpercent(AQI, 200, 300);
		} else if (AQI <= 400) {
			data.text = "Hazardous";
			data.color = "#B22222";
			data.percent = (AQI - 300) / 400.0;
			data.percent = AQIpercent(AQI, 300, 400);
		} else if (AQI < 500) {
			data.text = "Super Hazardous";
			data.color = "#800000";
			data.percent = (AQI - 400) / 500.0;
			data.percent = AQIpercent(AQI, 400, 500);
		} else {
			data.text = "Apocalyptic";
			data.color = "#000000";
			data.percent = 100;
		}
		return data;

	};

</script>

<div id="aqi-container" style="text-align: center; background-color: {aqi_description.color}">
	<span id="aqi_name">{aqi_description.text}</span>
	<span id="aqi">{aqi}</span>
	<div class="meter">
		<div style="width: {aqi_description.percent}%" id="percent"></div>
	</div>
</div>

<style>
	#aqi-container {
		color: white;
		padding: 16px;
		border-radius: 16px;
		max-width: 400px;
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}

	.meter { 
		height: 12px;
		margin-top: 4px;
		position: relative;
		background: rgba(0, 0, 0, 0.11);
		width: calc(100% + 32px);
		padding: 0px;
		box-sizing: border-box;
		margin-left: -16px;
		margin-bottom: -16px;
	}
	.meter > div {
		display: block;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		position: relative;
	}

</style>