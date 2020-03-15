import { createForm } from '@iroha1024/json-form'

const row1 = {
    name: {
        name: "名字",
        type: "string",
        value: "iroha"
    },
    learning: {
        name: "学习中",
        type: "boolean",
        value: false
    },
    color: {
        name: "颜色",
        type: "color",
        value: "#f45838"
    },
    addressCode: {
        name: "邮编",
        type: "string",
        value: "200333"
    },
    description: {
        name: "描述",
        type: "string",
        value: "这是一段描述语句...\n这是一段描述语句"
    },
    address: {
        name: "地址",
        type: "string",
        value: "上海市普陀区金沙江路 1518 弄"
    }
}
const row2 = {
    name: {
        name: "名字",
        type: "string",
        value: "iroha1024"
    },
    learning: {
        name: "学习中",
        type: "boolean",
        value: true
    },
    color: {
        name: "颜色",
        type: "color",
        value: "#ccc"
    },
    addressCode: {
        name: "邮编",
        type: "string",
        value: "200333"
    },
    description: {
        name: "描述",
        type: "string",
        value: "这是一段描述语句"
    },
    address: {
        name: "地址",
        type: "string",
        value: "上海市普陀区金沙江路 1518 弄"
    }
}
const json = [
    row1,
    row2,
    row1,
    row2,
]
const jsonForm = createForm('#app', JSON.stringify(json), { style: { background: 'stripe' } })

const btn = document.getElementById('switch')
btn.addEventListener('click', () => {
    let condition = jsonForm.getOptions().editable
    jsonForm.setOptions({ editable: !condition })
    console.log(jsonForm.getOptions());
})