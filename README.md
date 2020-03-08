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
import { createForm } from "@iroha1024/json-form"

const jsonForm = createForm('#app') // or createForm(document.body)

//默认值，可覆盖单个属性
const defaultOptions = {
    editable: true,	
    width: 800,	//overridable
    height: 600,
}

createForm('#app', { editable: false })

//默认值，需保持合法json字符串格式（type VaildJson）
const defaultStr = '[{ "key": { "name": "键值", "type": "string", "value": "属性" } }]'

createForm('#app', defaultStr)

createForm('#app', defaultStr, { editable: false })
```

## Instance method

通过实例方法可访问和修改jsonForm相关数据

| method       | description            | argument    |
| ------------ | ---------------------- | ----------- |
| `setJson`    | 修改表格展示的json数据 | `VaildJson` |
| `getJson`    | 获取json数据           |             |
| `setOptions` | 修改设置               | `Options`   |
| `getOptions` | 获取设置               |             |

