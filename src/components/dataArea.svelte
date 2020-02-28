<script>
    import ContentEdit from './contentEdit.svelte'

    export let json
    export let options
</script>

<div class="json-form__data-area">
    {#each json as row}
        <div class="json-form__data-area__row">
            {#each Object.keys(row) as key}
                <ContentEdit class="col" bind:options bind:key bind:data={row} />
            {/each}
        </div>
    {/each}
</div>
