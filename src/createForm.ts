import { render, override } from './renderer'

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
    style: {
        width: number
        height: number | 'auto'
        fontSize: number
        lineHeight: number
        padding: {
            top: number
            right: number
        }
        background: 'none' | 'stripe'
    }
}

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }

interface JsonForm {
    setJson: (json: VaildJson) => any
    getJson: () => VaildJson
    setOptions: (options: DeepPartial<Options>) => any
    getOptions: () => Options
}

export function createForm(container: Element | string, options?: DeepPartial<Options>): JsonForm
export function createForm(container: Element | string, str?: string): JsonForm
export function createForm(container: Element | string, str: string, options: DeepPartial<Options>): JsonForm
export function createForm(
    container: Element | string,
    param?: string | DeepPartial<Options>,
    param2?: DeepPartial<Options>
) {
    const json = setDefaultJson(param)
    const options = setDefaultOptions(param, param2)
    if (typeof container === 'string') {
        const element = document.querySelector(container)
        return element && render(element, json, options)
    } else {
        return render(container, json, options)
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

function setDefaultJson(str: string | DeepPartial<Options> | undefined) {
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

function setDefaultOptions(param: string | DeepPartial<Options> | undefined, param2: DeepPartial<Options> | undefined) {
    const defaultOptions: Options = {
        editable: true,
        style: {
            width: 800,
            height: 600,
            fontSize: 25,
            lineHeight: 1.6,
            padding: {
                top: 10,
                right: 8,
            },
            background: 'none',
        },
    }
    let options = {}
    if (typeof param !== 'string' && param !== undefined) {
        options = param
    }
    if (param2 !== undefined) {
        options = param2
    }
    options = override(defaultOptions, options)
    return options as Options
}
