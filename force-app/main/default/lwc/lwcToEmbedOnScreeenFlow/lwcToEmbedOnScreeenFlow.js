import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
export default class LwcToEmbedOnScreeenFlow extends LightningElement {
    @api name;
    handleChange(event) {
        this.name = event.target.value;
        this.dispatchEvent(new FlowAttributeChangeEvent('grrname', this.name));
    }
}