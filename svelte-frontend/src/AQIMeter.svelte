<script>
	export let aqi;

	import {AQItoDesc} from './aqi_calculations';

	$: aqi_description = AQItoDesc(aqi);

</script>

<div id="aqi-container" style="text-align: center; background-color: {aqi_description.color}">
	<span id="aqi_text">{aqi_description.text} {isNaN(aqi) ? '': aqi }</span>
	<div class="meter">
		<div style="width: {aqi_description.percent}%" id="percent"></div>
	</div>
</div>

<style>
	#aqi-container {
		color: white;
		padding: 16px;
		border-radius: 16px;
		/* max-width: 400px; */
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