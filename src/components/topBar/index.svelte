<div class="json-form__top-bar">
    {#each colList as { key, name }}
        <div class="json-form__top-bar__col col" on:click={updateCol(key, name)}>{name}</div>
    {/each}
</div>

<script>
    import { message } from '../../store/message'
    import { notification } from '../../store/notification'

    export let json
    export let options
    export let colList

    function updateCol(oldKey, oldName) {
        if (!options.editable) return
        if (json.length < 1) {
            notification.set('无法更新，请先添加行数据！')
            return
        }
        message.set({
            type: 'updateCol',
            title: '更新列',
            value: {
                oldKey,
                oldName,
            },
            fn: () => {
                json = json.map(row => {
                    const { key, name } = $message.value
                    if (key !== oldKey) {
                        row[key] = row[oldKey]
                        delete row[oldKey]
                    }
                    row[key].name = name
                    return row
                })
            },
        })
    }
</script>
