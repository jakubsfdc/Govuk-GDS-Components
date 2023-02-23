import { LightningElement, api } from 'lwc';
import { publish, createMessageContext, MessageContext } from 'lightning/messageService';
import COOKIES_ACCEPT_CHANNEL from '@salesforce/messageChannel/CookiesAccept__c';

export default class GovCookieBanner extends  LightningElement {

    @api label;
    @api isVisible;
    @api cookiePageUrl;
    @api acceptLabel;
    @api rejectLabel;
    @api bannerContent;

    messageContext = createMessageContext();

    accept() {
        this.sendAcceptRecommendedMessage(true);
        
    }

    reject() {
        this.sendAcceptRecommendedMessage(false);
    }

    sendAcceptRecommendedMessage(accept){
        const payload = { 
            acceptRecommended: accept
          };
          publish(this.messageContext, COOKIES_ACCEPT_CHANNEL, payload);
    }
}