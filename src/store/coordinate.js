import { writable } from 'svelte/store'

function createCoordinate() {
    const data = {
        x: null,
        y: null,
    }
    const { subscribe, set } = writable(data)

    return {
        subscribe,
        set: value => set(value),
        reset: () => set(data),
    }
}

export const coordinate = createCoordinate()
