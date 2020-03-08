{#if options.editable}
    <div class={$$props.class} contenteditable="plaintext-only" bind:innerHTML={data[key].value} />
{:else}
    <div class={$$props.class} contenteditable="false" bind:innerHTML={data[key].value} />
{/if}

<script>
    export let data
    export let key
    export let options
</script>
