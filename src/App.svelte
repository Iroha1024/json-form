<script>
    import TopBar from './components/topBar.svelte'
    import DataArea from './components/dataArea.svelte'

    export let json
    export let options

    let { width, height } = options
</script>

<div class="json-form__wrapper" style="width: {width}px; height: {height}px">
    <div class="json-form">
        <TopBar bind:json />
        <DataArea bind:json bind:options />
    </div>
</div>

<button
    on:click={() => {
        console.log(JSON.stringify(json, null, 2))
    }}>
    显示json
</button>
