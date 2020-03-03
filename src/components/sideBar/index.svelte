<div class="json-form__side-bar">
    <div class="icon iconfont icon-add-row" on:click={addRow} />
    <div class="icon iconfont icon-add-col" on:click={addCol} />
    <div class="icon iconfont icon-export" on:click={exportJson} />
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
            title: '新增列',
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

    function exportJson() {
        console.log(JSON.stringify(json, null, 2))
    }
</script>
