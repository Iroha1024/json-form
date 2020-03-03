<label>
    <span>组件：</span>
    <select bind:value={type}>
        {#each compList as { type, componentName }}
            <option value={type}>{componentName}</option>
        {/each}
    </select>
</label>
<Input description="键值" ruleList={ruleList[0]} bind:value={key} bind:isValidated={validation[0]} />
<Input description="列名" ruleList={ruleList[1]} bind:value={name} bind:isValidated={validation[1]} />
<label>
    <span>初值：</span>
    <svelte:component
        this={getComponent(type)}
        class="data-component"
        options={mock.options}
        key="key"
        bind:data={mock.data} />
</label>

<script>
    import { getComponent } from '../dataArea/compImport'

    import Input from './input.svelte'

    export let msgValue
    export let json

    let type, key, name

    const keyList = Object.keys(json[0])

    const ruleList = [
        [
            { rule: /^[a-zA-Z]{1,12}$/, advice: '输入1-12位字母' },
            { rule: keyList, advice: '键值已存在' },
        ],
        [{ rule: /^.{1,12}$/, advice: '输入任意1-12位' }],
    ]
    const validation = new Array(2).fill(false)

    const compList = [
        { type: 'string', componentName: '文本' },
        { type: 'boolean', componentName: '选择框' },
        { type: 'color', componentName: '拾色器' },
    ]

    //创建新列时，调用数据组件的模拟数据
    $: mock = {
        options: {
            editable: true,
        },
        data: {
            key: {
                value: type === 'string' ? '' : type === 'boolean' ? false : '#000000',
            },
        },
    }

    $: {
        let isValidated = validation.every(i => i)
        msgValue = {
            isValidated,
            key,
            name,
            type,
            value: mock.data.key.value,
        }
    }
</script>
