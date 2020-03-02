{#if $message.title}
    <div class="message-box__wrapper">
        <div class="message-box">
            <header>
                <div>{$message.title}</div>
            </header>
            <main>
                <svelte:component this={getComponent($message.type)} bind:msgValue />
            </main>
            <footer>
                <div class="button button--confirm" on:click={confirm}>确认</div>
                <div class="button button--cancel" on:click={cancel}>取消</div>
            </footer>
        </div>
    </div>
{/if}

<script>
    import { message } from '../../store'

    import addCol from './addCol.svelte'

    let msgValue

    function getComponent(type) {
        const map = new Map([['addCol', addCol]])
        return map.get(type)
    }

    function confirm() {
        if (msgValue.isValidated) {
            message.update(msgValue)
            $message.fn()
            message.reset()
        }
    }

    function cancel() {
        message.reset()
    }
</script>
