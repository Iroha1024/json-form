import { writable } from 'svelte/store'

function createNotification() {
    const { subscribe, set } = writable(null)

    let timer

    return {
        subscribe,
        set: value => {
            clearTimeout(timer)
            set(value)
            timer = setTimeout(() => {
                set(null)
            }, 3000)
        },
    }
}

export const notification = createNotification()
