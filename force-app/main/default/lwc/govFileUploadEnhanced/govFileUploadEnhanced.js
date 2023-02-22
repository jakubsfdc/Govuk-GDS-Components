import { LightningElement, track, api, wire} from 'lwc';
import encrypt from '@salesforce/apex/FileUploadAdvancedHelper.encrypt';
import uploadUiOverride from '@salesforce/resourceUrl/uploadUiOverride';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadStyle } from 'lightning/platformResourceLoader';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

import deleteContentDoc from '@salesforce/apex/FileUploadAdvancedHelper.deleteContentDoc';
import getExistingFiles from '@salesforce/apex/FileUploadAdvancedHelper.getExistingFiles';
import updateFileName from '@salesforce/apex/FileUploadAdvancedHelper.updateFileName';

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

    disabled = false;
    
    


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

    // get allowMultiple() {
    //     return cbToBool(this.cb_allowMultiple);
    // }

    get formGroupClass() {
        let groupClass = "govuk-form-group ";
        groupClass = (this.hasErrors) ? groupClass + " govuk-form-group--error" : groupClass;
        return groupClass;
    }

    renderedCallback() {

        this.displayExistingFiles();
               
                // loading uploadUiOverride
                // Promise.all([
                //     loadStyle(this, uploadUiOverride)
                // ])
        
        
                if(this.isCssLoaded) return
                this.isCssLoaded = true;
                loadStyle(this,uploadUiOverride).then(()=>{
                    // console.log('loaded');
                })
                .catch(error=>{
                    // console.log('error to load');
                });
        
               
        
    }

    displayExistingFiles(){
        console.log('this.renderExistingFiles: ' + this.renderExistingFiles);
        console.log('this.objFiles: ' + this.objFiles);
        console.log('this.objFiles.length: ' + this.objFiles.length);
        
        

        if(this.objFiles.length > 0){ // FIX
            this.displayFileList = true;
            console.log(' this.objFiles.length this.displayFileList: ' + this.displayFileList);
        } else {
            this.displayFileList = false;
        }
    }

    handleUpload_lightningFile(event){
        let files = event.detail.files;
        this.handleUploadFinished(files);
    }

    handleUploadFinished(files) {
        // console.log('Inside handleUploadFinished');
        let objFiles = [];
        let versIds = [];


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

            // var reader = new FileReader();
            // reader.onload = function(event) {
            // var dataURL = event.target.result;
            // var mimeType = dataURL.split(",")[0].split(":")[1].split(";")[0];
            // alert(mimeType);
            // };
            // reader.readAsDataURL(objFile);
        })
        console.log('objFiles:' + objFiles + ' count:' + objFiles.length);
        console.log('versIds:' + versIds + ' count:' + versIds.length);

        if(this.overriddenFileName){
            updateFileName({versIds: versIds, fileName: this.overriddenFileName.substring(0,255)})
                .catch(error => {
                    console.log('Err overrideFileName' + error);
                    this.showErrors(this.reduceErrors(error).toString());
                });
        }
        // console.log('this.recordId:'+this.recordId);
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

    checkDisabled(){
        if(!this.allowMultiple && this.objFiles.length >= 1){
            this.disabled = true;
        } else {
            this.disabled = false;
        }
    }

    showErrors(errors){
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