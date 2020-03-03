<div class="json-form__wrapper" style="width: {width}px; height: {height}px">
    {#if editable}
        <SideBar bind:json />
    {/if}
    <div class="json-form__main">
        <div class="json-form">
            <TopBar bind:json />
            <DataArea bind:json bind:options />
        </div>
    </div>
    <MessageBox {json} />
</div>

<script>
    import TopBar from './components/topBar/index.svelte'
    import SideBar from './components/sideBar/index.svelte'
    import DataArea from './components/dataArea/index.svelte'
    import MessageBox from './components/messageBox/index.svelte'

    export let json
    export let options

    let { width, height, editable } = options
</script>
