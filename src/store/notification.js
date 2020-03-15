import { tick } from 'svelte'
import { writable } from 'svelte/store'

function createNotification() {
    const { subscribe, set } = writable(null)

    let timer

    return {
        subscribe,
        set: async value => {
            clearTimeout(timer)
            set(null)
            await tick()
            set(value)
            timer = setTimeout(() => {
                set(null)
            }, 3000)
        },
    }
}

export const notification = createNotification()
