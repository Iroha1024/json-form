<div class="json-form__data-area">
    {#each json as row}
        <div class="json-form__data-area__row">
            {#each Object.keys(row) as key}
                <svelte:component class="col" this={getComponent(row[key].type)} bind:data={row} bind:key {options} />
            {/each}
        </div>
    {/each}
</div>

<script>
    import { getComponent } from './compImport'

    export let json
    export let options
</script>
