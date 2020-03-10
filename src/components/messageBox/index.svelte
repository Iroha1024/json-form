{#if $message.title}
    <div class="message-box__wrapper">
        <div class="message-box">
            <header>
                <div>{$message.title}</div>
            </header>
            <main>
                <svelte:component this={getComponent($message.type)} bind:msgValue {json} />
            </main>
            <footer>
                <div
                    class="button button--confirm {msgValue && !msgValue.isValidated ? 'disabled' : ''}"
                    on:click={confirm}>
                    确认
                </div>
                <div class="button button--cancel" on:click={cancel}>取消</div>
            </footer>
        </div>
    </div>
{/if}

<script>
    import { message } from '../../store/message'

    import AddCol from './addCol.svelte'
    import UpdateCol from './updateCol.svelte'

    export let json

    let msgValue

    function getComponent(type) {
        const map = new Map([
            ['addCol', AddCol],
            ['updateCol', UpdateCol],
        ])
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
