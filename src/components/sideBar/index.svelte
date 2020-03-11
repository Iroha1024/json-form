<div class="json-form__side-bar">
    <div class="icon iconfont icon-add-row" on:click={addRow} />
    <div class="icon iconfont icon-add-col" on:click={addCol} />
    <div class="icon iconfont icon-remove-row" on:click={removeRow} />
    <div class="icon iconfont icon-remove-col" on:click={removeCol} />
    <div class="icon iconfont icon-export" on:click={exportJson} />
</div>

<script>
    import { message } from '../../store/message'
    import { condition } from '../../store/condition'
    import { notification } from '../../store/notification'

    export let json
    export let colList

    function addRow() {
        if (colList.length < 1) {
            notification.set('请先添加列信息！')
            return
        }
        let data = {}
        colList.forEach(({ key, name, type }) => {
            data[key] = {
                name,
                type,
            }
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
        if (json.length < 1) {
            notification.set('请先添加行数据！')
            return
        }
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

    function removeRow() {
        if ($condition === 'remove-row') {
            condition.reset()
        } else {
            condition.set('remove-row')
        }
    }

    function removeCol() {
        if ($condition === 'remove-col') {
            condition.reset()
        } else {
            condition.set('remove-col')
        }
    }

    function exportJson() {
        console.log(JSON.stringify(json, null, 2))
    }
</script>
