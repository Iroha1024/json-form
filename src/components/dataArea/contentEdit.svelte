{#if options.editable && !$condition}
    <div
        class={$$props.class}
        contenteditable="plaintext-only"
        bind:innerHTML={data[key].value}
        on:mousemove
        on:click />
{:else}
    <div class={$$props.class} contenteditable="false" bind:innerHTML={data[key].value} on:mousemove on:click />
{/if}

<script>
    import { condition } from '../../store/condition'

    export let data
    export let key
    export let options
</script>
