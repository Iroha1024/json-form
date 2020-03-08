<div class="json-form__wrapper" style="width: {options.width}px; height: {options.height}px">
    {#if options.editable}
        <SideBar bind:json />
    {/if}
    <div class="json-form__main">
        <div class="json-form">
            <TopBar bind:json {options} />
            <DataArea bind:json bind:options />
        </div>
    </div>
    <MessageBox {json} />
</div>

<svelte:options accessors/>

<script>
    import '@simonwep/pickr/dist/themes/nano.min.css'
    import './css/index.scss'

    import TopBar from './components/topBar/index.svelte'
    import SideBar from './components/sideBar/index.svelte'
    import DataArea from './components/dataArea/index.svelte'
    import MessageBox from './components/messageBox/index.svelte'

    export let json
    export let options
</script>
