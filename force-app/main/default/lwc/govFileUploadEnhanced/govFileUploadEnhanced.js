import { LightningElement, track, api, wire} from 'lwc';
import uploadUiOverride from '@salesforce/resourceUrl/uploadUiOverride';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadStyle } from 'lightning/platformResourceLoader';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { MessageContext, publish, subscribe, unsubscribe } from 'lightning/messageService';
import getKey from '@salesforce/apex/FileUploadAdvancedHelper.getKey';
import encrypt from '@salesforce/apex/FileUploadAdvancedHelper.encrypt';
import createContentVers from '@salesforce/apex/FileUploadAdvancedHelper.createContentVers';
import appendDataToContentVersion from '@salesforce/apex/FileUploadAdvancedHelper.appendDataToContentVersion';
import createContentDocLink from '@salesforce/apex/FileUploadAdvancedHelper.createContentDocLink';
import deleteContentDoc from '@salesforce/apex/FileUploadAdvancedHelper.deleteContentDoc';
import getExistingFiles from '@salesforce/apex/FileUploadAdvancedHelper.getExistingFiles';
import updateFileName from '@salesforce/apex/FileUploadAdvancedHelper.updateFileName';

//message channels
import REGISTER_MC from '@salesforce/messageChannel/registrationMessage__c';
import VALIDATION_MC from '@salesforce/messageChannel/validateMessage__c';
import VALIDATION_STATE_MC from '@salesforce/messageChannel/validationStateMessage__c';

export default class GovFileUploadEnhanced extends LightningElement {

    @track hasErrors        = false;
    @track displayFileList  = false; 
    @track docIds           = [];
    @track fileNames        = [];
    @track objFiles         = [];
    @track versIds          = [];
    @api errorMessage       = '';
    @api label;
    @api acceptedFormats;
    @api allowMultiple;
    @api overriddenFileName;    
    @api uploadedlabel;
    @api required;
    @api requiredMessage;
    @api sessionKey;
    @api uploadedFileNames;
    @api contentDocumentIds;
    @api contentVersionIds;
    @api recordId;
    numberOfFilesToUpload = 0;
    loading = false;
    disabled = false;

    // messaging attributes
    @wire(MessageContext) messageContext;
    validateSubscription;

    key;
    @wire(getKey)
    wiredKey({error,data}){
        if(data){
            this.key = data;
        }
        else if (error){
            this.showErrors(this.reduceErrors(error).toString());
        }
    }

    value;
    @wire(encrypt,{recordId: '$recordId', encodedKey: '$key'})
    wiredValue({error,data}){
        if(data){
            this.value = data;
        }
        else if (error){
            this.showErrors(this.reduceErrors(error).toString());
        }
    }

    get formGroupClass() {
        let groupClass = "govuk-form-group ";
        groupClass = (this.hasErrors) ? groupClass + " govuk-form-group--error" : groupClass;
        return groupClass;
    }

    renderedCallback() {

        this.displayExistingFiles();
        
                if(this.isCssLoaded) return
                this.isCssLoaded = true;
                
                loadStyle(this,uploadUiOverride).then(()=>{
                    
                })
                .catch(error=>{
                    this.showErrors(this.reduceErrors(error).toString());
                });
        
               
        
    }

    connectedCallback(){

        let cachedSelection = sessionStorage.getItem(this.sessionKey);
        if(cachedSelection){
            this.processFiles(JSON.parse(cachedSelection));
        } else if(this.recordId && this.renderExistingFiles) {
            getExistingFiles({recordId: this.recordId})
                .then((files) => {
                    if(files != undefined && files.length > 0){
                        this.processFiles(files);
                    } else {
                        this.communicateEvent(this.docIds,this.versIds,this.fileNames,this.objFiles);
                    }
                })
                .catch((error) => {
                    this.showErrors(this.reduceErrors(error).toString());
                })
        } else {
            this.communicateEvent(this.docIds,this.versIds,this.fileNames,this.objFiles);
            
        }

        this.displayExistingFiles();

        // subscribe to the message channels
        this.subscribeMCs();

        // publish the registration message after 0.1 sec to give other components time to initialise
        setTimeout(() => {
            publish(this.messageContext, REGISTER_MC, {componentId:this.fieldId});
        }, 100);
    }

    disconnectedCallback() {
        this.unsubscribeMCs();
    }

    displayExistingFiles(){
        console.log('this.renderExistingFiles: ' + this.renderExistingFiles);
        console.log('this.objFiles: ' + this.objFiles);
        console.log('this.objFiles.length: ' + this.objFiles.length);
        
        if(this.objFiles.length > 0){ // FIX
            this.displayFileList = true;
        } else {
            this.displayFileList = false;
        }
    }

    handleUpload_lightningFile(event){

        let files = event.detail.files;
        this.handleUploadFinished(files);
    }

    handleUploadFinished(files) {
        

        let objFiles = [];
        let versIds = [];

        console.log('handleUploadFinished files', files);
        files.forEach(file => {
            if(file.contentVersionId){
                 console.log('file.contentVersionId:' + file.contentVersionId);
            } else {
                 console.log('NOT AVAILABLE file.contentVersionId:');   
            }

            console.log('file.documentId:' + file.documentId);
            console.log('file.name:' + file.name);
            let name;
            if(this.overriddenFileName){
                name = this.overriddenFileName.substring(0,255) +'.'+ file.name.split('.').pop();
            } else {
                name = file.name;
            }
            
            let objFile = {
                name: name,
                documentId: file.documentId,
                contentVersionId: file.contentVersionId
            }
            objFiles.push(objFile);

            versIds.push(file.contentVersionId);

        })

        if(this.overriddenFileName){
            updateFileName({versIds: versIds, fileName: this.overriddenFileName.substring(0,255)})
                .catch(error => {
                    console.log('Err overrideFileName' + error);
                    this.showErrors(this.reduceErrors(error).toString());
                });
        }
        if(this.recordId){
            // console.log('============================');
            // console.log('versIds:'+versIds);
            // console.log('this.key:'+this.key);
            // console.log('this.visibleToAllUsers:'+this.visibleToAllUsers);
            // console.log('============================');
            createContentDocLink({versIds: versIds, encodedKey: this.key, visibleToAllUsers: this.visibleToAllUsers})
                .catch(error => {
                    this.showErrors(this.reduceErrors(error).toString());
                });
        }

        this.processFiles(objFiles);

        this.displayExistingFiles();
    }

    processFiles(files){
        
        files.forEach(file => {
            let filetype;
            if(this.icon == null){
                filetype = getIconSpecs(file.name.split('.').pop());
            }
            else{
                filetype = this.icon;
            }
            let objFile = {
                name: file.name,
                filetype: filetype,
                documentId: file.documentId,
                contentVersionId: file.contentVersionId
            };
            this.objFiles.push(objFile);
            this.docIds.push(file.documentId);
            this.versIds.push(file.contentVersionId);
            this.fileNames.push(file.name);
        });

        this.checkDisabled();

        this.communicateEvent(this.docIds,this.versIds,this.fileNames,this.objFiles);

        function getIconSpecs(docType){
            switch(docType){
                case 'csv':
                    return 'doctype:csv';
                case 'pdf':
                    return 'doctype:pdf';
                case 'pps':
                case 'ppt':
                case 'pptx':
                    return 'doctype:ppt';
                case 'xls':
                case 'xlsx':
                    return 'doctype:excel';
                case 'doc':
                case 'docx':
                    return 'doctype:word';
                case 'txt':
                    return 'doctype:txt';
                case 'png':
                case 'jpeg':
                case 'jpg':
                case 'gif':
                    return 'doctype:image';
                default:
                    return 'doctype:unknown';
            }
        }
    }

    deleteDocument(event){
        this.loading = true;
        event.target.blur();

        let contentVersionId = event.target.dataset.contentversionid;    

        if(this.disableDelete){
            this.removeFileFromUi(contentVersionId);
        } else {
            deleteContentDoc({versId: contentVersionId})
            .then(() => {
                this.removeFileFromUi(contentVersionId);
            })
            .catch((error) => {
                this.showErrors(this.reduceErrors(error).toString());
                this.loading = false;
            })
        }
        
    }

    reduceErrors(errors) {
        if (!Array.isArray(errors)) {
            errors = [errors];
        }
    
        return (
            errors
                // Remove null/undefined items
                .filter((error) => !!error)
                // Extract an error message
                .map((error) => {
                    // UI API read errors
                    if (Array.isArray(error.body)) {
                        return error.body.map((e) => e.message);
                    }
                    // Page level errors
                    else if (
                        error?.body?.pageErrors &&
                        error.body.pageErrors.length > 0
                    ) {
                        return error.body.pageErrors.map((e) => e.message);
                    }
                    // Field level errors
                    else if (
                        error?.body?.fieldErrors &&
                        Object.keys(error.body.fieldErrors).length > 0
                    ) {
                        const fieldErrors = [];
                        Object.values(error.body.fieldErrors).forEach(
                            (errorArray) => {
                                fieldErrors.push(
                                    ...errorArray.map((e) => e.message)
                                );
                            }
                        );
                        return fieldErrors;
                    }
                    // UI API DML page level errors
                    else if (
                        error?.body?.output?.errors &&
                        error.body.output.errors.length > 0
                    ) {
                        return error.body.output.errors.map((e) => e.message);
                    }
                    // UI API DML field level errors
                    else if (
                        error?.body?.output?.fieldErrors &&
                        Object.keys(error.body.output.fieldErrors).length > 0
                    ) {
                        const fieldErrors = [];
                        Object.values(error.body.output.fieldErrors).forEach(
                            (errorArray) => {
                                fieldErrors.push(
                                    ...errorArray.map((e) => e.message)
                                );
                            }
                        );
                        return fieldErrors;
                    }
                    // UI API DML, Apex and network errors
                    else if (error.body && typeof error.body.message === 'string') {
                        return error.body.message;
                    }
                    // JS errors
                    else if (typeof error.message === 'string') {
                        return error.message;
                    }
                    // Unknown error shape so try HTTP status text
                    return error.statusText;
                })
                // Flatten
                .reduce((prev, curr) => prev.concat(curr), [])
                // Remove empty strings
                .filter((message) => !!message)
        );
    }

    removeFileFromUi(contentVersionId){
        let objFiles = this.objFiles;
        let removeIndex;
        for(let i=0; i<objFiles.length; i++){
            if(contentVersionId === objFiles[i].contentVersionId){
                removeIndex = i;
            }
        }

        this.objFiles.splice(removeIndex,1);
        this.docIds.splice(removeIndex,1);
        this.versIds.splice(removeIndex,1);
        this.fileNames.splice(removeIndex,1);

        this.checkDisabled();

        this.communicateEvent(this.docIds,this.versIds,this.fileNames,this.objFiles);

        this.loading = false;
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

    handleValidateMessage(message) {
        this.handleValidate()
    }

    @api handleValidate() {
        this.hasErrors = false;

        if(this.docIds.length === 0 && this.required === true){ 
            this.hasErrors = true;
        } else {
            this.hasErrors = false;
        }

        //console.log('CHECKBOX: Sending validation state message');
        publish(this.messageContext, VALIDATION_STATE_MC, {
            componentId: this.fieldId,
            isValid: !this.hasErrors,
            error: this.errorMessage
        });
    }

    @api clearError() {
        this.hasErrors = false;
    }

    // @api
    // validate(){
    //     if(this.docIds.length === 0 && this.required === true){ 
    //         let errorMessage;
    //         if(this.requiredMessage == null){
    //             errorMessage = 'Upload at least one file.';
    //         }
    //         else{
    //             errorMessage = this.requiredMessage;
    //         }
    //         return { 
    //             isValid: false,
    //             errorMessage: errorMessage
    //          }; 
    //     } 
    //     else {
    //         return { isValid: true };
    //     }
    // }

    checkDisabled(){
        if(!this.allowMultiple && this.objFiles.length >= 1){
            this.disabled = true;
        } else {
            this.disabled = false;
        }
    }

    showErrors(errors){
        console.log('errors', errors);
        if(this.embedExternally){
            this.showAlert(errors);
        } else {
            this.showToast(errors);
        }
    }

    showAlert(errors){
        window.alert(errors);
    }

    showToast(errors){
        let message = new ShowToastEvent({
            title: 'We hit a snag.',
            message: errors,
            variant: 'error',
        });
        this.dispatchEvent(message);
    }

    communicateEvent(docIds, versIds, fileNames, objFiles){
        this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentIds', [...docIds]));
        this.dispatchEvent(new FlowAttributeChangeEvent('contentVersionIds', [...versIds]));
        this.dispatchEvent(new FlowAttributeChangeEvent('uploadedFileNames', [...fileNames]));

        sessionStorage.setItem(this.sessionKey, JSON.stringify(objFiles));
    }
}