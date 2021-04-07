<script>
	import AQIMeter from './AQIMeter.svelte';
	import Bar from './Bar.svelte';
</script>

<div class="container">
	<AQIMeter aqi={25}></AQIMeter>
	<Bar id="#bar"></Bar>
</div>

<style>
	.container {
		margin-left: auto;
		margin-right: auto;
		width: 75%;
		padding: 10px;
		max-width: 600px;
	}
</style>