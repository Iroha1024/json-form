import App from './App.svelte'

export function render(container, json, options) {
    new App({
        target: container,
        props: {
            json,
            options,
        },
    })
}
