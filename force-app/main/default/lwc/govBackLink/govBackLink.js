/**
 * Component Name: Gov UK Back Link
 * Derived_From_Frontend_Version:v3.13.1
 * Created by: Simon Cook Updated by Neetesh Jain/Brenda Campbell, Jakub Szelagowski
 **/
import { LightningElement, api } from 'lwc';
import { FlowNavigationBackEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';

export default class GovBackLink extends NavigationMixin(LightningElement) {

    @api availableActions = [];
    @api backLinkLabel = 'Back';
    @api backAction  = false;
    @api destinationPageName = '';
    
    backAvailable = false;

    connectedCallback() {
        if (this.availableActions.find(action => action === 'BACK')) {
            this.backAvailable = true;
        }
    }

    setBacklinkAttributeToZero(){
        console.log("renderedCallBack");
        var codes = this.template.querySelector('.govuk-back-link')
        console.log('*** codes: ' + codes);
        console.dir(codes);
        console.log('*** after dir *** ');
            

        // set tabindex of codes to 0 to make it accessible by tabbing
        if (codes) {
            codes.setAttribute('tabindex', '0');
        }
        console.log('*** after setAttribute *** ');
        console.dir(codes);
        
        console.log('*** after setAttribute tabindex dir *** ');
         // console.log('Index set to 0 on govuk-back-link:' + codes[0].getAttribute['tabindex']);
    }

    renderedCallback(){

        // listen for Tab button being pressed on keyboard for BackLink
        // TODO: may have to remove the listener at some point so it doesn’t fire on every tab
        document.addEventListener('keydown', (event) => { 
            if (event.key === 'Tab') {
                console.log('*** TAB Pressed *** ');
                this.setBacklinkAttributeToZero();
                console.log('*** after setBacklinkAttributeToZero run *** ');
            }
        });
         

       
       
    }

    handleBack(event) {
        event.preventDefault();
        if(this.backAvailable && this.backAction) {
            if (this.availableActions.find(action => action === 'BACK')) {
                const navigateBackEvent = new FlowNavigationBackEvent();
                this.dispatchEvent(navigateBackEvent);
            }
        } else {
            if(this.destinationPageName) {
                this[NavigationMixin.Navigate]({
                    type: 'comm__namedPage',
                    attributes: {
                        name: this.destinationPageName
                    },
                    state: {
                    }
                });
            }
        }
    }

    get isVisible() {
        if(this.backAvailable && this.backAction) {
            return true;
        } else if(this.destinationPageName) {
            return true;
        } 
        return false;
    }

}