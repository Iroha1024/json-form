<div class="json-form__side-bar">
    <div class="iconfont icon-add-row" on:click={addRow} />
    <div class="iconfont icon-add-col" on:click={addCol} />
    <div
        class="iconfont icon-json"
        on:click={() => {
            console.log(JSON.stringify(json, null, 2))
        }} />
</div>

<script>
    import { message } from '../../store'

    export let json

    function addRow() {
        const data = JSON.parse(JSON.stringify(json[0]))
        Object.keys(data).forEach(key => {
            const type = data[key].type
            switch (type) {
                case 'string':
                    data[key].value = ''
                    break
                case 'boolean':
                    data[key].value = false
                    break
                case 'color':
                    data[key].value = '#000000'
                    break
            }
        })
        json = [...json, data]
    }

    function addCol() {
        message.set({
            type: 'addCol',
            title: '新增一列',
            value: null,
            fn: () => {
                json = json.map(row => {
                    const { key, name, type, value } = $message.value
                    row[key] = {
                        name,
                        type,
                        value,
                    }
                    return row
                })
            },
        })
    }
</script>
