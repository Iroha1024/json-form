<div class="json-form__top-bar">
    {#each colList as { name }}
        <div class="json-form__top-bar__col col">{name}</div>
    {/each}
</div>

<script>
    export let json

    $: colList = Object.entries(json[0]).map(([key, { name, type }]) => ({
        key,
        name,
        type,
    }))
</script>
