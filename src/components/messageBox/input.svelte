<label>
    <span>{description}：</span>
    <input type="text" bind:value on:input={check} />
    {#if error}
        <p class="advice">{suggestion}</p>
    {/if}
</label>

<script>
    export let description
    export let ruleList
    export let value
    export let isValidated

    let suggestion, error

    function isRegExp(val) {
        return Object.prototype.toString.call(val) === '[object RegExp]'
    }

    function check() {
        for (const { rule, advice } of ruleList) {
            if (isRegExp(rule)) {
                isValidated = rule.test(value)
            } else if (Array.isArray(rule)) {
                isValidated = !rule.includes(value)
            }
            error = !isValidated
            if (error) {
                suggestion = advice
                return
            }
        }
    }
</script>
