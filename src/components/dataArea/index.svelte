<div class="json-form__data-area">
    {#each json as row}
        <div class="json-form__data-area__row">
            {#each Object.keys(row) as key}
                <svelte:component
                    this={getComponent(row[key].type)}
                    class="col"
                    bind:options
                    bind:key
                    bind:data={row} />
            {/each}
        </div>
    {/each}
</div>

<script>
    import { getComponent } from './compImport'

    export let json
    export let options
</script>
