<div class={$$props.class} on:click={click}>
    <div class="choice-box">
        {#if data[key].value}
            <div class="check-mark show" out:fade />
        {/if}
    </div>
</div>

<script>
    import { fade } from 'svelte/transition'

    export let key
    export let data

    function click() {
        data[key].value = !data[key].value
    }
</script>
