# json-form

> 转换json与form，可编辑json的svelte ui组件
> 



## Installation

Install via npm:
```bash
npm i @iroha1024/json-form
```

Install via yarn:
```bash
yarn add @iroha1024/json-form
```

## Usage

```javascript
import { createForm, VaildJson } from "@iroha1024/json-form"

const jsonForm = createForm('#app') // or createForm(document.body)

createForm('#app', options)

const json: VaildJson = [{ key: { name: "键值", type: "string", value: "属性" } }]
const str = JSON.stringify(json)

createForm('#app', str)

createForm('#app', str, options)
```

## Options

```javascript
const options = {
    editable: true,	
    width: 800,		//number
    height: 600,	//number or 'auto'
    background: 'none'	// 'none' or 'stripe'
}
```



## Instance method

通过实例方法可访问和修改jsonForm相关数据

| method       | description            | argument    |
| ------------ | ---------------------- | ----------- |
| `setJson`    | 修改表格展示的json数据 | `VaildJson` |
| `getJson`    | 获取json数据           |             |
| `setOptions` | 修改设置               | `Options`   |
| `getOptions` | 获取设置               |             |

