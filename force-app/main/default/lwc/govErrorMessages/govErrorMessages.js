/**
 * Component Name: Gov UK Error Messages
 * Derived_From_Frontend_Version:v3.13.1
 * Created by: Simon Cook Updated by Neetesh Jain/Brenda Campbell
 **/
import { LightningElement, api, track, wire } from 'lwc';
import { MessageContext,publish, subscribe, unsubscribe } from 'lightning/messageService';
import VALIDATION_STATE_MC from '@salesforce/messageChannel/validationStateMessage__c';
import VALIDATE_MC from '@salesforce/messageChannel/validateMessage__c';
import SET_FOCUS_MC from '@salesforce/messageChannel/setFocusMessage__c';
import Error_summary_title from '@salesforce/label/c.uxg_Error_summary_title';
import './govErrorMessages.css';
import cookiesAccept from '@salesforce/messageChannel/cookiesAccept__c';

export default class ErrorMessages extends LightningElement {
    // static delegatesFocus = true;

    // static renderMode = 'light';
    // handle the on focus coloring
    @track highlightedLinkClass = '';
    handleLinkFocus() {
        this.highlightedLinkClass = 'highlighted-link';
    }
    handleLinkBlur() {
        this.highlightedLinkClass = '';
    }
    ///

    components = [];

    componentTypeName = "C-GOV-ERROR-MESSAGE";

    errorPrefix = Error_summary_title;

    // messaging attributes
    @wire(MessageContext) messageContext;
    errorSubscription;

     
    connectedCallback() {
        this.subscribeMCs();
    }

    disconnectedCallback() {
        this.unsubscribeMCs();
    }

    get hasErrors() {
        //console.log('inside hasErrors');
        // console('this.components::. '+this.components);
        return (this.components.filter(component => component.isValid === false).length > 0);
    }

    subscribeMCs() {
        // console.log('inside subscribeMCs')
        if (this.errorSubscription) {
            return;
        }
        this.errorSubscription = subscribe(
            this.messageContext,
            VALIDATION_STATE_MC, (message) => {
                this.handleValidationStateMessage(message);
            });
        if (this.validateSubscription) {
            return;
        }
        this.validateSubscription = subscribe (
            this.messageContext,
            VALIDATE_MC, (message) => {
                this.handleValidateMessage(message);
            });
    }

    unsubscribeMCs() {
        unsubscribe(this.errorSubscription);
        this.errorSubscription = null;
    }

    putFocusOnError(){
        
        
        //const myComponent = this.template.querySelector('div[class="govuk-width-container"]');
        const myComponent = this.template.querySelector('a[name="errorSummaryTitle"]');
        myComponent.focus();

        
        //const myComponentBox = this.template.querySelector('div[class="govuk-width-container"]');
//         const myComponentBox = this.template.querySelector('div[class="govuk-error-summary error-summary"]');
        
        // const myComponentBox = this.template.querySelector(`[data-module="govuk-error-summary"]`);
        // console.log('myComponentBox: '+ myComponentBox);
        // // myComponentBox.
        // myComponentBox.focus();


        // let myComponentDivBox = this.template.querySelector('div[class="govuk-width-container"]'); //.getElementById(this.textFieldId);
        // console.log('myCompId: '+ myCompId)
        
        // myComponentDivBox.addEventListener("focus", function(){
        //     this.classList.add("highlighted-link");
        // });

        // myComponentDivBox.addEventListener("blur", function(){
        //     this.classList.remove("highlighted-link");
        // });
        


         // console.log('inside handleValidationStateMessage');
// let myLink = this.template.querySelector('a[name="errorSummaryTitle"]');
// // console.log('Set up focus on a# myLink::. '+myLink);
// myLink.focus();
         
        //setTimeout(function(){
            // let myAnchor0 = this.template.querySelector(this.components[0].id);
            // myAnchor0.focus();
             // console.log('Set up focus on components'+ this.components);
            if (this.components && this.components.length>0){
                 // console.log('Set up focus on component id'+ this.components[0].id);

                // let myLinkA = this.template.getElementById(this.components[0].id);
                // myLinkA.focus();

                // this.template.getElementById(this.components[0].id).addEventListener("focus", function(){
                //     this.classList.add("highlighted-link");
                // });
        
                // this.template.getElementById(this.components[0].id).addEventListener("blur", function(){
                //     this.classList.remove("highlighted-link");
                // });

              
                
            }
    }
    // called during validation to update error states and messages
    handleValidationStateMessage(message) {
        // console.log('### message.componentId ::.'+message.componentId);
        // console.log('### message.isValid ::.'+message.isValid);
        // console.log('### message.error ::.'+message.error);
        // console.log('### message.componentType ::.'+message.componentType);
        // console.log('### message.componentSelect ::.'+message.componentSelect);

        const component = this.components.find(component => component.id === message.componentId);
        
        if(component) {
            // console.log('### component is not null');
            if(message.isValid === true) {
                // console.log('### message.isValid is true');
                this.components = this.components.filter(component => component.id !== message.componentId);
            } else {
                // console.log('### message.isValid is false.');
                // console.log('### Setting component.isValid to '+ message.isValid);
                // console.log('### Setting component.error to '+ message.error);
                component.isValid = message.isValid;
                component.error = message.error;
            }
        } else {
            // console.log('### component IS null');
            if(message.isValid === false) {
                // console.log('message.isValid = ::. '+ message.isValid);
                const component = {};
                component.id = message.componentId;
                component.isValid = message.isValid;
                component.error = message.error;
                component.componentType = message.componentType;
                component.componentSelect = message.componentSelect;
                // console.log('Component to push to array: ' + component);
                // console.log(component.id);
                // console.log(component.isValid);
                // console.log(component.error);
                // console.log(component.componentType);
                // console.log(component.componentSelect);
                // console.log('=========== // ');
                this.components.push(component);
            }
        }
    }

    // called at the start of validation to remove existing errors
    handleValidateMessage(message) {
        console.log('inside handleValidateMessage');
        this.putFocusOnError();
        this.components = [];
    }

    handleClick(event) {
          console.log('govErrorMessages.js');
          console.log('//////////////////// handleClick:');

          let targetId = event.target.dataset.targetId; // Component id, i.e. input-text-18, date-input-day-47, date-input-month-47
          console.log('targetId:' + targetId);
         
          console.log('about to call handleInputFieldFocus('+targetId+')');
          this.handleInputFieldFocus(targetId);
          console.log('handleInputFieldFocus('+targetId+') called');
    }

    handleInputFieldFocus(fieldId) {
        console.log('^^^^^^^^^ ');
        console.log('HELLOOOOOOO from govErrorMessage.handleInputFieldFocus after click!');
        console.log('inside handleInputFieldFocus + ' + fieldId)
            publish(this.messageContext, SET_FOCUS_MC, { componentId: fieldId });
        console.log('event dispatched to component with id. over and out.');
        console.log('^ ');
    }
}