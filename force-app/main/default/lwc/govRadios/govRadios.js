/**
 * Component Name: Gov UK Radios
 * Derived_From_Frontend_Version:v3.13.1
 * Created by: Simon Cook Updated by Neetesh Jain/Brenda Campbell
 **/
import {LightningElement, api, track, wire} from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import getPicklistValuesMapByObjectField from '@salesforce/apex/GovComponentHelper.getPicklistValuesMapByObjectField';
import { MessageContext, publish, subscribe, unsubscribe } from 'lightning/messageService';
import REGISTER_MC from '@salesforce/messageChannel/registrationMessage__c';
import VALIDATION_MC from '@salesforce/messageChannel/validateMessage__c';
import VALIDATION_STATE_MC from '@salesforce/messageChannel/validationStateMessage__c';

export default class GovRadios extends LightningElement {

    @api uniqueFieldId = "radioField";
    @api radioFieldId = "picklist-value";
    @api questionLabel;
    @api questionFontSize;
    @api questionHint;
    @api requiredQuestion;
    @api inlineRadios;
    @api smallerRadios;
    @api radioPicklistField;
    @api radioLabels = "";
    @api radioValues = "";
    @api selectedValue = "";  
    @api selectedValueAPIName = "";  
    @api errorMessage;
    
    @track isInitialised = false;
    @track hasErrors = false;
    @track radioOptions = [];

    get groupClass() {
        let groupClass = "govuk-form-group";
        groupClass = (this.hasErrors) ? groupClass + " govuk-form-group--error" : groupClass;
        return groupClass;
    }

    get questionLabelClass() {
        let questionLabelClass;
        switch(this.questionFontSize.toLowerCase()) {
            case "small":
                questionLabelClass = "govuk-label govuk-label--s";
                break;
            case "medium":
                questionLabelClass = "govuk-label govuk-label--m";
                break;
            case "large":
                questionLabelClass = "govuk-label govuk-label--l";
                break;
            default:
                questionLabelClass = "govuk-label govuk-label--s";
        }
        return questionLabelClass;
    }

    get radioClass() {
        let radioClass = "govuk-radios";
        radioClass = (this.inlineRadios) ? radioClass + " govuk-radios--inline" : radioClass;
        radioClass = (this.smallerRadios) ? radioClass + " govuk-radios--small" : radioClass;
        return radioClass;
    }
    
    // messaging attributes
    @wire(MessageContext) messageContext;
    validateSubscription;

    connectedCallback() {
        if(this.radioPicklistField !== '' && this.radioPicklistField !== undefined && this.radioPicklistField !== null) {
            // get picklist field values
            getPicklistValuesMapByObjectField({
                strSObjectFieldName: this.radioPicklistField
            })
                .then(result => {
                    
                    this.radioOptions = [];
                    
                    let i=0;

                    for(const label in result) {
                        let radioOption = {};
                        radioOption.key = `picklist-value-${i}`;
                        radioOption.value = label; 
                        radioOption.label = label;
                        radioOption.APIName = result[label];
                        
                        radioOption.checked = (this.selectedValue === label); 
                        
                        this.radioOptions.push(radioOption);
                        if (i==0) {
                            this.radioFieldId = radioOption.key;
                        }
                        i++;
                    }
                    this.isInitialised = true;
                })
                .catch(error => {
                    console.error(`Select:connectedCallback - could not get picklist values due to ${error.message}`);
                })
        } else {
            // user provided values
            const radioLabelsArray = this.radioLabels.split(',');
            const radioValuesArray = this.radioValues.split(',');
            this.radioOptions = [];
            for(let i=0; i<radioLabelsArray.length;i++) {
                let radioOption = {};
                radioOption.key = `csv-value-${i}`;
                radioOption.label = radioLabelsArray[i];
                radioOption.value = radioValuesArray[i];
                radioOption.checked = (this.selectedValue === radioValuesArray[i]);
                this.radioOptions.push(radioOption);
                if (i==0) {
                    this.radioFieldId = radioOption.key;
                }
            }
            this.isInitialised = true;
        }

        // subscribe to the message channels
        this.subscribeMCs();

        // publish the registration message after 0.1 sec to give other components time to initialise
        setTimeout(() => {
            publish(this.messageContext, REGISTER_MC, { componentId: this.uniqueFieldId });
        }, 100);
    }

    disconnectedCallback() {
        this.unsubscribeMCs();
    }

    handleValueChanged(event) {

        this.selectedValue = event.target.value;

        this.radioOptions.forEach(radioOption => {
           if(radioOption.value === this.selectedValue) {
               radioOption.checked = true;
               this.selectedValueAPIName = radioOption.APIName;

           } else {
               radioOption.checked = false;
           }
        });
        this.dispatchRadioEvent();
    }

    @api 
    setValue(newValue) {
        this.selectedValue = newValue;
        this.radioOptions.forEach( option => {
            if(option.value === newValue) {
                option.checked = true;
                this.selectedValueAPIName = option.APIName;
            } else {
                option.checked = false;
            }
        })
    }

    handleValidateMessage(message) {
        this.handleValidate();
    }

    @api 
    handleValidate() {
        this.hasErrors = false;
        if(this.requiredQuestion && (this.selectedValue === '' || this.selectedValue === undefined)) {
            this.hasErrors = true;
        }
        publish(this.messageContext, VALIDATION_STATE_MC, {
            componentId: this.uniqueFieldId,
            isValid: !this.hasErrors,
            error: this.errorMessage
        });
        return !this.hasErrors;
    }

    @api 
    clearError() {
        this.hasErrors = false;
    }

    dispatchRadioEvent() {
        // tell the flow engine about the change (label value)
        const attributeChangeEvent = new FlowAttributeChangeEvent('selectedValue', this.selectedValue);
        this.dispatchEvent(attributeChangeEvent);

        const attributeChangeEventAPIName = new FlowAttributeChangeEvent('selectedValueAPIName', this.selectedValueAPIName);
        this.dispatchEvent(attributeChangeEventAPIName);

        console.log('dispatched FlowAttributeChangeEvent',attributeChangeEventAPIName);

        // tell any parent components about the change
        const valueChangedEvent = new CustomEvent('valuechanged', {
            detail: {
                id: this.uniqueFieldId,
                value: this.selectedValue,
                valueAPIName: this.selectedValueAPIName
            }
        });
        this.dispatchEvent(valueChangedEvent);
    }

    // LMS functions
    subscribeMCs() {
        if (this.validateSubscription) {
            return;
        }
        this.validateSubscription = subscribe (
            this.messageContext,
            VALIDATION_MC, (message) => {
                this.handleValidateMessage(message);
            });
    }

    unsubscribeMCs() {
        unsubscribe(this.validateSubscription);
        this.validateSubscription = null;
    }

}