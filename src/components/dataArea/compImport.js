import ContentEdit from './contentEdit.svelte'
import ChoiceBox from './choiceBox.svelte'
import ColorPicker from './colorPicker.svelte'

export function getComponent(type) {
    const map = new Map([
        ['string', ContentEdit],
        ['boolean', ChoiceBox],
        ['color', ColorPicker],
    ])
    return map.get(type)
}
