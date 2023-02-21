import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class GovCookieBanner extends  NavigationMixin(LightningElement) {

    @api label;
    @api isVisible;
    @api cookiePageUrl;

    

}