/**
 * Component Name: Gov UK Navigation Buttons
 * Derived_From_Frontend_Version:v3.13.1
 * Created by: Simon Cook Updated by Harshpreet Singh Chhabra/Brenda Campbell, Jakub Szelagowski
 **/
import {LightningElement, api, track, wire} from 'lwc';
import { FlowNavigationBackEvent, FlowNavigationNextEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';
import { MessageContext, publish, subscribe, unsubscribe } from 'lightning/messageService';
import REGISTER_MC from '@salesforce/messageChannel/registrationMessage__c';
import UNREGISTER_MC from '@salesforce/messageChannel/unregistrationMessage__c';
import VALIDATE_MC from '@salesforce/messageChannel/validateMessage__c';
import VALIDATION_STATE_MC from '@salesforce/messageChannel/validationStateMessage__c';

export default class GovNavigationButtons extends LightningElement {
    // flow actions
    @api availableActions = [];

    // messaging attributes
    @wire(MessageContext) messageContext;
    registrationSubscription;
    unRegistrationSubscription;
    validationStateSubscription;

    // flow inputs and outputs
    @api buttonLabelsString;
    @api buttonActionsString;
    @api buttonVariantsString;
    @api buttonAlignmentsString;
    @api action;
    @api fieldId = 'NavigationButtons';
    @api useFlowStyling;
    @api fullWidth = false;

    // tracked attributes
    @track leftButtons = [];
    @track centerButtons = [];
    @track rightButtons = [];

    // other attributes
    components = [];

    // Lifecycle listeners

    connectedCallback() {
        // console.log(`NAVIGATION_BUTTONS: Connected callback START components are ${JSON.stringify(this.components)}`);
        // subscribe to registration events
        this.subscribeMCs();

        // bug out if no configuration string
        if(!this.buttonActionsString ||
            !this.buttonLabelsString ||
            !this.buttonVariantsString ||
            !this.buttonAlignmentsString) {
            return;
        }

        // create the object base on the csv
        const buttonAlignments = this.buttonAlignmentsString.split(',');
        const buttonLabels = this.buttonLabelsString.split(',');

        const buttonActions = this.buttonActionsString.split(',');
        const buttonVariant = this.buttonVariantsString.split(',');

        // create the button definition
        this.leftButtons = [];
        this.centerButtons = [];
        this.rightButtons = [];
        // console.log(`NAVIGATION_BUTTONS: buttonAlignments.length: ${buttonAlignments.length}`);
        // console.log(`NAVIGATION_BUTTONS: buttonLabels.length: ${buttonLabels.length}`);
        // console.log(`NAVIGATION_BUTTONS: buttonActions.length: ${buttonActions.length}`);
        // console.log(`NAVIGATION_BUTTONS: buttonVariant.length: ${buttonVariant.length}`);
        // console.log(`NAVIGATION_BUTTONS: buttonAlignments: ${buttonAlignments}`);
        // console.log(`NAVIGATION_BUTTONS: buttonLabels: ${buttonLabels}`);
        // console.log(`NAVIGATION_BUTTONS: buttonActions: ${buttonActions}`);
        // console.log(`NAVIGATION_BUTTONS: buttonVariant: ${buttonVariant}`);
        // console.log("this.leftButtons" + this.leftButtons);
        // console.log("this.centerButtons" + this.centerButtons);
        // console.log("this.rightButtons" + this.rightButtons);
        


        for(let i=0; i<buttonAlignments.length; i++) {
            let button = {};
            button.key = i;
            button.label = buttonLabels[i];
            button.action = buttonActions[i];
            button.variant = buttonVariant[i];

            // console.log("button.label:" + button.label);
            // console.log("button.action:" + button.action);
            // console.log("button.variant:" + button.variant);

            if(button.variant.toUpperCase() === 'BRAND') {
                button.class = 'govuk-button govuk-!-margin-1';
            } else if(button.variant.toUpperCase() === 'SECONDARY') {
                button.class = 'govuk-button govuk-button--secondary govuk-!-margin-1';
            } else if(button.variant.toUpperCase() === 'WARNING') {
                button.class = 'govuk-button govuk-button--warning govuk-!-margin-1';
            } else if(button.variant.toUpperCase() === 'DISABLED'){
                button.class = 'govuk-button govuk-button--disabled govuk-!-margin-1';
            } else {
                button.class = 'govuk-button govuk-!-margin-1';
            }
            if(buttonAlignments[i].toUpperCase() === 'LEFT') {
                this.leftButtons.push(button);
            } else if(buttonAlignments[i].toUpperCase() === 'CENTER') {
                this.centerButtons.push(button);
            } else if(buttonAlignments[i].toUpperCase() === 'RIGHT') {
                this.rightButtons.push(button);
            } else {
                this.rightButtons.push(button);
            }
        }
        // console.log(`NAVIGATION_BUTTONS: Rendered callback END components are ${JSON.stringify(this.components)}`);
    }

    renderedCallback() {
        // console.log(`NAVIGATION_BUTTONS: Rendered callback components are ${JSON.stringify(this.components)}`);
    }

    disconnectedCallback() {
        this.unsubscribeMCs();
    }

    // class related functions
    get containerWidthClass() {
        return (this.fullWidth) ? "" : "govuk-grid-column-two-thirds";
    }

    // Event handlers functions
    handleClick(event) {
        // get the action for the data-action attribute
        //var elementToSelect = null;
        this.action = event.target.getAttribute('data-action').toUpperCase();


        // console.log('handleClick:: ' + this.action);
        // console.log('Registered Components count: ' + this.components.length);
        // console.dir(this.components);
        // if(this.components.length === 0){ // REMOVED LOGIC
        //     console.log('No input components, progress to next.');
        //     const event = new FlowNavigationNextEvent();
        //     this.dispatchEvent(event);
        // }

        // check to see if next or finish was selected and we have components to validate
        if( (this.action === 'NEXT' || this.action === 'FINISH') && this.components.length > 0 ) {
            // console.log('*** Click Handle - 1 NEXT OR FINISH pressed');
            this.components.forEach(component => {
                component.isValid = false;
                //this.focusOnErroBox();
            })
            // console.log('NAVIGATION_BUTTONS: Sending validation message ' + this.fieldId );
            publish(this.messageContext, VALIDATE_MC, { componentId: this.fieldId });
        } else if(this.action === 'NEXT' && this.availableActions.find(action => action === 'NEXT')) {
                // console.log('*** Click Handle - 1 NEXT pressed');
                // console.log('About to dispatch FlowNavigationNextEvent');
            const event = new FlowNavigationNextEvent();
            this.dispatchEvent(event);
        } else if(this.action === 'FINISH' && this.availableActions.find(action => action === 'FINISH')) {
                // console.log('*** Click Handle - 1 FINISH pressed');
            const event = new FlowNavigationFinishEvent();
            this.dispatchEvent(event);
            this.clearSessionStorage();
        } else if (this.action === 'CANCEL' &&
            (this.availableActions.find(action => action === 'NEXT'))) {
                // console.log('*** Click Handle - 1 CANCEL pressed - action NEXT');
                // console.log('About to dispatch FlowNavigationNextEvent');
            const event = new FlowNavigationNextEvent();
            this.dispatchEvent(event);
            console.log('FlowNavigationNextEvent dispatched');
        } else if (this.action === 'CANCEL' &&
            (this.availableActions.find(action => action === 'FINISH'))) {
                // console.log('*** Click Handle - 1 CANCEL pressed - action FINISH');
            const event = new FlowNavigationFinishEvent();
            this.clearSessionStorage();
            this.dispatchEvent(event);
        } else if (this.action === 'BACK' &&
            this.availableActions.find(action => action === 'BACK')) {
                // console.log('*** Click Handle - 1 BACK pressed - finds action BACK');
            const event = new FlowNavigationBackEvent();
            this.dispatchEvent(event);
        } else {
                // console.log('*** Click Handle - Kick in Validation');
            if(this.components.length > 0){
                this.components.forEach(component => {
                    component.isValid = false;
                    // console.log('NAVIGATION_BUTTONS: Set isValid to false for comp ID: ' + this.fieldId );
                })
                publish(this.messageContext, VALIDATE_MC, { componentId: this.fieldId });
            }
            
        }
    }


    // Messaging related functions
    subscribeMCs() {
        if (this.registrationSubscription) {
            return;
        }
        this.registrationSubscription = subscribe (
            this.messageContext,
            REGISTER_MC, (message) => {
                this.handleRegistrationMessage(message);
        });

        if (this.unRegistrationSubscription) {
            return;
        }

        this.unRegistrationSubscription = subscribe (
            this.messageContext,
            UNREGISTER_MC, (message) => {
                this.handleUnRegistrationMessage(message);
            });
        if (this.validationStateSubscription) {
            return;
        }
        this.validationStateSubscription = subscribe (
            this.messageContext,
            VALIDATION_STATE_MC, (message) => {
                this.handleValidationUpdate(message);
            });
    }

    unsubscribeMCs() {
        unsubscribe(this.registrationSubscription);
        this.registrationSubscription = null;
        unsubscribe(this.unRegistrationSubscription);
        this.unRegistrationSubscription = null;
        unsubscribe(this.validationStateSubscription);
        this.validationStateSubscription = null;
    }


    handleRegistrationMessage(message) {
            // console.log(`NAVIGATION_BUTTONS: Component BEFORE adding are ${JSON.stringify(this.components)}`);
            // console.log('  ');
            // console.log(`NAVIGATION_BUTTONS: Received registration message from component ${JSON.stringify(message)}`);
        const component = {};
        component.id = message.componentId;
        component.isValid = true;
        component.error = "";
        this.components.push(component);
            // console.log(`NAVIGATION_BUTTONS: Component are ${JSON.stringify(this.components)}`);
    }

    handleUnRegistrationMessage(message) {
        
            // console.log(`NAVIGATION_BUTTONS: Received unregistration message from component ${JSON.stringify(message)}`);
        
        //remove component from this.components array
        for(let i=0; i<this.components.length; i++ ){
            if(this.components[i].id == message.componentId){
                console.log('found component to remove: ' + this.components[i].id);
                this.components.splice(i,1);
            }
        }
    }

    handleValidationUpdate(message) {
            // console.log(`NAVIGATION_BUTTONS: Received validation state message from component ${JSON.stringify(message)}`);
        // update the component that sent the message
        // filtering components to find the one that matches the id
        const component = this.components.find(component => component.id === message.componentId);

            // console.log('handleValidationUpdate: message ' + JSON.stringify(message));
            // console.log('handleValidationUpdate: component ' + JSON.stringify(component));
            // console.log('handleValidationUpdate: components ' + JSON.stringify(this.components));
        
        if(component) {
             // console.log(`NAVIGATION_BUTTONS: Setting component ${component.id} to ${message.isValid}`);
            component.isValid = message.isValid;
        } // else {
        //      console.log(`NAVIGATION_BUTTONS: This shouldn't really happen but creating new component ${message.componentId} with status ${message.isValid}`);
        //     this.components.push({id:message.componentId,isValid:message.isValid});
        // }
        // console.log(`NAVIGATION_BUTTONS: components are ${JSON.stringify(this.components)}`);
        for(let i=0; i<this.components.length; i++ ){
                // console.log(`NAVIGATION_BUTTONS: Component ${this.components[i].id} is valid? ${this.components[i].isValid}`);
                // console.log(`NAVIGATION_BUTTONS: Component ${this.components[i].id} error is ${this.components[i].error}`);
            if(this.components[i].id == undefined){
                // remove empty component form array
                // console.log('have component with empty id: + ' + this.components[i].id);
                // console.log('... componentId: + ' + this.components[i].componentId);
                this.components.splice(i,1);
            }
        }
         
        // check to see if we have all valid components
        const invalidComponents = this.components.filter(component => component.isValid === false);
    

        if(invalidComponents.length === 0) {
                // console.log(`NAVIGATION_BUTTONS: All components are valid, moving along, action is ${this.action}`);
            if (this.action === 'NEXT' &&
                this.availableActions.find(action => action === 'NEXT')) {
                    // console.log('1 Next pressed - action NEXT');
                const event = new FlowNavigationNextEvent();
                this.dispatchEvent(event);
            } else if (this.action === 'NEXT' &&
                this.availableActions.find(action => action === 'FINISH')) {
                    // console.log('2 Next pressed - action FINISH');
                const event = new FlowNavigationFinishEvent();
                this.dispatchEvent(event);
            } else if (this.action === 'FINISH' &&
                this.availableActions.find(action => action === 'FINISH')) {
                    // console.log('3 Finish pressed - acton FINISH');
                const event = new FlowNavigationFinishEvent();
                this.dispatchEvent(event);
            } else {
                // catch all for actions other than NEXT and FINISH to progress forward
                // console.log('4 Else - other pressed - action NEXT ');
                const event = new FlowNavigationNextEvent();
                this.dispatchEvent(event);
            }
        } else {
                // console.log('5 ELSE - there are invalid components');
                // console.log(`NAVIGATION_BUTTONS: There are invalid components.`);
            for(let i=0; i<invalidComponents.length; i++ ){
                 let myComp = invalidComponents[i];
                 // console.log(`NAVIGATION_BUTTONS: Component ${myComp.id} is invalid.`);
            }
        }
    }

    clearSessionStorage() {
        // console.log('clearSessionStorage');
        sessionStorage.clear();
    }
}