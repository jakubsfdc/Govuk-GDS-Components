/**
 * Component Name: Gov UK Select
 * Derived_From_Frontend_Version:v3.13.1
 * Created by: Simon Cook Updated by Harshpreet Singh Chhabra/Brenda Campbell
 **/
import {LightningElement, api, track, wire} from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import getPicklistValuesByObjectField from '@salesforce/apex/GovComponentHelper.getPicklistValuesByObjectField';
import { MessageContext, publish, subscribe, unsubscribe } from 'lightning/messageService';
import REGISTER_MC from '@salesforce/messageChannel/registrationMessage__c';
import VALIDATION_MC from '@salesforce/messageChannel/validateMessage__c';
import VALIDATION_STATE_MC from '@salesforce/messageChannel/validationStateMessage__c';
import SET_FOCUS_MC from '@salesforce/messageChannel/setFocusMessage__c';

export default class GovSelect extends LightningElement {
    @api fieldId = "selectField";
    fieldIdToFocus;
    @api label;
    @api fontSize;
    @api hintText;
    @api picklist;
    @api value = "";
    @api isInset;
    @api required;
    @api errorMessage;
    @api optionLabels;
    @api optionValues;

    @api h1Size = false;
    @api h2Size = false;
    @api h3Size = false;

    @track selectOptions;

    hasErrors;

    // messaging attributes
    @wire(MessageContext) messageContext;
    validateSubscription;
    setFocusSubscription;

    connectedCallback() {
        // sets the H value for template based on labele font size  
        this.getHSize(); 
        
        if(this.picklist !== '' && this.picklist !== undefined && this.picklist !== null) {
            //call the apex to get the values
            getPicklistValuesByObjectField({
                strSObjectFieldName: this.picklist
            })
            .then(result => {
                    this.selectOptions = [];
                    let selectOption = {};
                    selectOption.key = `csv-value-no-value`;
                    selectOption.label = "Please select";
                    selectOption.value = "";
                    this.selectOptions.push(selectOption);

                    for(let i=0; i<result.length; i++) {
                        let selectOption = {};
                        selectOption.key = `picklist-value-${i}`;
                        selectOption.value = result[i];
                        selectOption.label = result[i];
                        selectOption.selected = (this.value === result[i]);
                        this.selectOptions.push(selectOption);
                    }
                })
                .catch(error => {
                    console.error(`Select:connectedCallback - could not get picklist values due to ${error.message}`);
                })
        } else {
            // use the option labels and option values
            const optionLabelsArray = this.optionLabels.split(',');
            const optionValuesArray = this.optionValues.split(',');
            this.selectOptions = [];
            let selectOption = {};
            selectOption.key = `csv-value-no-value`;
            selectOption.label = "Please select";
            selectOption.value = "";
            this.selectOptions.push(selectOption);

            for(let i=0; i<optionLabelsArray.length;i++) {
                let selectOption = {};
                selectOption.key = `csv-value-${i}`;
                selectOption.label = optionLabelsArray[i];
                selectOption.value = optionValuesArray[i];
                selectOption.selected = (this.value === optionValuesArray[i]);
                this.selectOptions.push(selectOption);
            }
        }

        // subscribe to the message channels
        this.subscribeMCs();

        // publish the registration message after 0.1 sec to give other components time to initialise
        setTimeout(() => {
            publish(this.messageContext, REGISTER_MC, {componentId:this.fieldId});
        }, 100);
    }

    renderedCallback(){
        this.fieldIdToFocus = this.template.querySelector('select').getAttribute('id'); 
    }

    disconnectedCallback() {
        this.unsubscribeMCs();
    }

    get groupClass() {
        let groupClass = "govuk-form-group";
        groupClass = (this.hasErrors) ? groupClass + " govuk-form-group--error" : groupClass;
        return groupClass;
    }

    get labelClass() {
        var labelClass;

        switch(this.fontSize) {
            case "Small":
                labelClass = "govuk-label govuk-label--s";
                break;
            case "Medium":
                labelClass = "govuk-label govuk-label--m";
                break;
            case "Large":
                labelClass = "govuk-label govuk-label--l";
                break;
            default:
                labelClass = "govuk-label govuk-label--s";
        }
        return labelClass;
    }

    getHSize(){
        if(this.fontSize) {
            switch(this.fontSize.toLowerCase()) {
                case "small":
                    this.h3Size = true;
                    // labelClass = "govuk-label govuk-label--s";
                    break;
                case "medium":
                    this.h2Size = true;
                    // labelClass = "govuk-label govuk-label--m";
                    break;
                case "large":
                    this.h1Size = true;
                    // labelClass = "govuk-label govuk-label--l";
                    break;
                default:
                    this.h3Size = true;
                    // labelClass = "govuk-label govuk-label--s";
            }
        } else {
            this.h3Size = true;
            // labelClass = "govuk-label govuk-label--s";
        }
        //return labelClass;
    }

    handleOnChange(event) {
        this.value = event.target.value;

        this.selectOptions.forEach(selectOption => {
            if(selectOption.value === this.value) {
                selectOption.selected = true;
            } else {
                selectOption.selected = false;
            }
        });

        this.dispatchSelectEvent();
    }

    dispatchSelectEvent() {
        // tell the flow engine about the change
        const attributeChangeEvent = new FlowAttributeChangeEvent('value', this.value);
        this.dispatchEvent(attributeChangeEvent);

        // tell any parent components about the change
        const valueChangedEvent = new CustomEvent('valuechanged', {
            detail: {
                id: this.fieldId,
                value: this.value,
            }
        });
        this.dispatchEvent(valueChangedEvent);
    }

    @api setValue(newValue) {
        this.value = newValue;
        this.selectOptions.forEach( option => {
            if(option.value === newValue) {
                option.selected = true;
            } else {
                option.selected = false;
            }
        })
    }


    // LMS functions

    subscribeMCs() {
        if (this.validateSubscription) {
            return;
        }
        this.validateSubscription = subscribe (
            this.messageContext,
            VALIDATION_MC, (message) => {
                console.log('message form validation '+ message);
                console.log('message form validation '+ message.isValid);
                console.log('message form validation '+ message.error);
                console.log('message form validation '+ message.componentSelect);
                console.log('message form validation '+ message.componentType);
                console.log('message form validation '+ message.componentId);
                console.dir(message);
                this.handleValidateMessage(message);
            });

        // Receive focus request with message.componentId
        this.setFocusSubscription = subscribe (
            this.messageContext,
            SET_FOCUS_MC, (message) => {
                this.handleSetFocusMessage(message);
            }
        )
    }

    unsubscribeMCs() {
        unsubscribe(this.validateSubscription);
        this.validateSubscription = null;
        unsubscribe(this.setFocusSubscription);
        this.setFocusSubscription = null;
    }

    handleSetFocusMessage(message){
        // filter message to check if our component (id) needs to set focus
        let myComponentId = message.componentId;
        console.log('myComponentId: ' + myComponentId);
        if(myComponentId == this.fieldIdToFocus){
            console.dir(message);
            let myComponent = this.template.querySelector('select');
            console.log('myComponent: '+ myComponent);
            console.log('myComponent: '+ myComponent.id);
            console.log('myComponent: '+ myComponent.innerHTML);
            console.log('myComponent: '+ myComponent.value);
            myComponent.focus();
        }
    }

    handleValidateMessage(message) {
        this.handleValidate();
    }

    @api handleValidate() {
        this.hasErrors = false;

        if(this.required && this.value === "") {
            this.hasErrors = true;
        } else {
            this.hasErrors = false;
        }

        console.log('SELECT: Sending validation state message');
        publish(this.messageContext, VALIDATION_STATE_MC, {
            componentId: this.fieldIdToFocus, //this.fieldId,
            isValid: !this.hasErrors,
            error: this.errorMessage
        });

        return !this.hasErrors;
    }

    @api clearError() {
        this.hasErrors = false;
    }
}