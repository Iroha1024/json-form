<Input description="键值" ruleList={ruleList[0]} bind:value={key} bind:isValidated={validation[0]} />
<Input description="列名" ruleList={ruleList[1]} bind:value={name} bind:isValidated={validation[1]} />

<script>
    import { message } from '../../store/message'

    import Input from './input.svelte'

    export let msgValue
    export let json

    let { oldKey, oldName } = $message.value
    let key = oldKey,
        name = oldName

    const keyList = Object.keys(json[0]).filter(item => item !== oldKey)

    const ruleList = [
        [
            { rule: /^[a-zA-Z]{1,12}$/, advice: '输入1-12位字母' },
            { rule: keyList, advice: '键值已存在' },
        ],
        [{ rule: /^.{1,12}$/, advice: '输入任意1-12位' }],
    ]

    const validation = new Array(2).fill(true)

    $: {
        let isValidated = validation.every(i => i)
        msgValue = {
            isValidated,
            key,
            name,
        }
    }
</script>
