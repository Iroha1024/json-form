<div class="json-form__top-bar">
    {#each colList as { name }}
        <div class="col">{name}</div>
    {/each}
</div>

<script>
    export let json

    const colList = Object.entries(json[0]).map(([key, { name, type }]) => ({
        key,
        name,
        type,
    }))
</script>
