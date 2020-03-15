<div class="json-form__wrapper" bind:this={wrapper} on:contextmenu|preventDefault={resetCondition}>
    {#if options.editable}
        <SideBar bind:json {colList} />
    {/if}
    <div class="json-form__main">
        <div class="json-form">
            <TopBar bind:json {options} {colList} />
            <DataArea bind:json bind:options />
        </div>
    </div>
    <MessageBox {json} />
    <Notification />
</div>

<svelte:options accessors />

<script>
    import '@simonwep/pickr/dist/themes/nano.min.css'
    import './css/index.scss'

    import { onMount } from 'svelte'

    import { condition } from './store/condition'

    import TopBar from './components/topBar/index.svelte'
    import SideBar from './components/sideBar/index.svelte'
    import DataArea from './components/dataArea/index.svelte'
    import MessageBox from './components/messageBox/index.svelte'
    import Notification from './components/notification/index.svelte'

    export let json
    export let options

    let wrapper
    let colList

    onMount(() => {
        setStyle()
    })

    //数据清空时，仍保存列信息
    $: if (json.length > 0) {
        colList = Object.entries(json[0]).map(([key, { name, type }]) => ({
            key,
            name,
            type,
        }))
    }

    $: if (wrapper && options.style) {
        setStyle()
    }

    function setStyle() {
        const { width, height, fontSize, lineHeight, padding, background } = options.style
        const set = (key, value) => wrapper.style.setProperty(key, value)
        set('--width', width + 'px')
        set('--height', typeof height === 'number' ? height + 'px' : height)
        set('--font-size', fontSize + 'px')
        set('--line-height', lineHeight)
        set('--padding-top', padding.top + 'px')
        set('--padding-right', padding.right + 'px')
    }

    function resetCondition() {
        condition.reset()
    }
</script>
