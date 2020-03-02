<label>
    <span>{description}：</span>
    <input type="text" bind:value on:input={check} />
    {#if error}
        <p class="advice">{advice}</p>
    {/if}
</label>

<script>
    export let description
    export let regexp
    export let advice
    export let value
    export let isValidated

    $: error = !regexp.test(value)

    function check() {
        if (regexp.test(value)) {
            isValidated = true
        } else {
            isValidated = false
        }
    }
</script>
