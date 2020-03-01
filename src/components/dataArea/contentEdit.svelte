{#if editable}
    <div class={$$props.class} contenteditable bind:innerHTML={data[key].value} />
{:else}
    <div class={$$props.class} contenteditable="false" bind:innerHTML={data[key].value} />
{/if}

<script>
    export let options
    export let key
    export let data

    let { editable } = options
</script>
