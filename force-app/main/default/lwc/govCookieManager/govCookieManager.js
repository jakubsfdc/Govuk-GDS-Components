import { track, wire, LightningElement } from 'lwc';
import { subscribe, createMessageContext, MessageContext } from 'lightning/messageService';
import COOKIES_ACCEPT_CHANNEL from '@salesforce/messageChannel/CookiesAccept__c';

export default class GovCookieManager extends LightningElement {

    @track acceptRecommended;

    messageContext  = createMessageContext();
    subscription    = null;

    subscribeToMessageChannel() {
        this.subscription = subscribe(
          this.messageContext,
          COOKIES_ACCEPT_CHANNEL,
          (message) => this.handleMessage(message)
        );
    }

    handleMessage(message) {
        this.acceptRecommended = message.acceptRecommended;
    }

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

}