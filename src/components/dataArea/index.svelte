<div class="json-form__data-area">
    {#each json as row, x (row)}
        <div class="json-form__data-area__row" class:row--hover={!$condition}>
            {#each Object.keys(row) as key, y}
                <svelte:component
                    this={getComponent(row[key].type)}
                    class="col {$condition === 'remove-row' && $coordinate.x === x ? 'row--remove' : ''}
                    {$condition === 'remove-col' && $coordinate.y === y ? 'col--remove' : ''}"
                    bind:data={row}
                    bind:key
                    {options}
                    on:mousemove={() => {
                        updateCoordinate(x, y)
                    }}
                    on:click={() => {
                        remove(x, key)
                    }} />
            {/each}
        </div>
    {/each}
</div>

<script>
    import { getComponent } from './compImport'

    import { condition } from '../../store/condition'
    import { coordinate } from '../../store/coordinate'

    export let json
    export let options

    function updateCoordinate(x, y) {
        if (($condition && x !== $coordinate.x) || y !== $coordinate.y) {
            coordinate.set({
                x,
                y,
            })
        }
    }

    function remove(x, key) {
        if ($condition === 'remove-row') {
            json = json.filter((item, index) => index !== x)
        } else if ($condition === 'remove-col') {
            json = json.map(row => {
                delete row[key]
                return row
            })
        }
        condition.reset()
    }
</script>
