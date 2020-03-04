type ColType = 'string' | 'boolean' | 'color'

interface Col {
    name: string
    type: ColType
    value: string | boolean
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
