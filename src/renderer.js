import App from './App.svelte'

export function render(container, json, options) {
    const jsonForm = new App({
        target: container,
        props: {
            json,
            options,
        },
    })
    return {
        setJson: json => jsonForm.$set({ json }),
        getJson: () => jsonForm.json,
        setOptions: options => jsonForm.$set({ options }),
        getOptions: () => jsonForm.options,
    }
}
