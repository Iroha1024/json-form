<script>
    import ContentEdit from './contentEdit.svelte'
    import ChoiceBox from './choiceBox.svelte'
    import ColorPicker from './colorPicker.svelte'

    function getComponent(type) {
        const map = new Map([['string', ContentEdit], ['boolean', ChoiceBox], ['color', ColorPicker]])
        return map.get(type)
    }

    export let json
    export let options
</script>

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
