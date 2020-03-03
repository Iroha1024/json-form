<div class={$$props.class}>
    <div class="choice-box" on:click={click}>
        {#if data[key].value}
            <div class="check-mark show" out:fade|local />
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
