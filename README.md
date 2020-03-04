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
jsonForm('#app') // or jsonForm(document.body)

//默认值，可覆盖单个属性
const defaultOptions = {
    editable: true,	
    width: 800,	//overridable
    height: 600,
}

jsonForm('#app', {editable: false})

//默认值，需保持合法json字符串格式（type VaildJson）
const defaultStr = '[{ "key": { "name": "键值", "type": "string", "value": "属性" } }]'
jsonForm('#app', defaultStr)

jsonForm('#app', defaultStr, {editable: false})
```

