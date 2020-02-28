<script>
    export let options
    export let key
    export let data

    let div
    let { editable } = options

    function input() {
        data[key].value = div.textContent
    }
</script>

<div class={$$props.class} bind:this={div} contenteditable={editable} on:input={input}>{data[key].value}</div>
