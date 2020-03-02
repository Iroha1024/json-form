import { writable } from 'svelte/store'

function createMessage() {
    const data = {
        type: null,
        title: null,
        value: null,
        fn: null,
    }
    const { subscribe, set, update } = writable(data)

    return {
        subscribe,
        set: message => set(message),
        reset: () => set(data),
        update: value =>
            update(m => {
                m.value = value
                return m
            }),
    }
}

export const message = createMessage()
