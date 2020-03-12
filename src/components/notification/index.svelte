{#if $notification}
    <div class="notification__wrapper" in:fly={{ x: 200, duration: 1500 }} out:fade>
        <div class="notification">
            <span class="notification__content">{$notification}</span>
        </div>
    </div>
{/if}

<script>
    import { fade, fly } from 'svelte/transition'

    import { notification } from '../../store/notification'
</script>
