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
        setOptions: options => jsonForm.$set({ options: override(jsonForm.options, options) }),
        getOptions: () => jsonForm.options,
    }
}

export function override(obj, overrideObj) {
    Object.entries(overrideObj).forEach(([key, val]) => {
        if (val !== undefined) {
            if (typeof val !== 'object') {
                obj[key] = overrideObj[key]
            } else {
                override(obj[key], overrideObj[key])
            }
        }
    })
    return obj
}
