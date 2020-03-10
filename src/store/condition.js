import { writable } from 'svelte/store'

function createCondition() {
    const { subscribe, set } = writable(null)

    return {
        subscribe,
        set: value => set(value),
        reset: () => set(null),
    }
}

export const condition = createCondition()
