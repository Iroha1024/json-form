import { render } from './renderer'

type ColType = 'string' | 'boolean' | 'color'

interface Col {
    name: string
    type: ColType
    value: string | boolean
}

function isCol(val: object): val is Col {
    const keys = ['name', 'type', 'value']
    return keys.every(key => val.hasOwnProperty(key))
}

interface Row {
    [key: string]: Col
}

export type VaildJson = Row[]

export interface Options {
    editable: boolean
    width: number
    height: number
}

export function jsonForm(container: Element | string, options?: Partial<Options>): void
export function jsonForm(container: Element | string, str?: string): void
export function jsonForm(container: Element | string, str: string, options: Partial<Options>): void
export function jsonForm(container: Element | string, param?: string | Partial<Options>, param2?: Partial<Options>) {
    const json = setDefaultJson(param)
    const options = setDefaultOptions(param, param2)
    if (typeof container === 'string') {
        const element = document.querySelector(container)
        element && render(element, json, options)
    } else {
        render(container, json, options)
    }
}

function isObject(val: unknown): val is object {
    return Object.prototype.toString.call(val) === '[object Object]'
}

function isVaildJson(json: unknown): json is VaildJson {
    return (
        Array.isArray(json) &&
        json.length > 0 &&
        json.every(row => isObject(row) && Object.values(row).every(col => isObject(col) && isCol(col)))
    )
}

function setDefaultJson(str: string | Partial<Options> | undefined) {
    const defaultJson: VaildJson = [{ key: { name: '键值', type: 'string', value: '属性' } }]
    let json
    if (typeof str === 'string') {
        try {
            json = JSON.parse(str)
            if (!isVaildJson(json)) {
                json = defaultJson
            }
        } catch {
            json = defaultJson
        }
    } else {
        json = defaultJson
    }
    return json
}

function setDefaultOptions(param: string | Partial<Options> | undefined, param2: Partial<Options> | undefined) {
    const defaultOptions: Options = {
        editable: true,
        width: 800,
        height: 600,
    }
    let options = {}
    if (typeof param !== 'string' && param !== undefined) {
        options = param
    }
    if (param2 !== undefined) {
        options = param2
    }
    for (const key in defaultOptions) {
        if (!options.hasOwnProperty(key)) {
            ;(options as any)[key] = defaultOptions[key as keyof Options]
        }
    }
    return options as Options
}
