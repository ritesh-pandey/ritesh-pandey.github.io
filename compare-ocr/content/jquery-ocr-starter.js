//Global
var filesToUpload = null;
var fileExtension = '';
var currentPage = 1;
var totalPagesOrImages = 0;
var imageGalleryData = [];
var imageDataSRCs = [];
var lastValue = '';
var isErroredOnParsing = false;
var isPartiallyErroredOnParsing = false;
var isEnablePopup = false;
var completeText = '';
var pdfFile = null;
var JsontextFormat = '';

$(document).ready(function () {
    // call initialization file
    if (window.File && window.FileList && window.FileReader) {
        Init();
    }
});


$("input[type=radio][name=OCREngine]").on("change", function () {

    $.ajax({
        type: "POST",
        url: "/OCR/GetLanguageList",
        data: '{engineType: "' + $("input[name=OCREngine]:checked").val() + '" }',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
            debugger
            //declare the variable 
            var select, index, option;
            //get the select element
            select = document.getElementById("ocrLanguage");

            //(28-June-2019): Changes for : https://github.com/teamdocs/ocr2017/issues/175
            //keep the selected language set when switching between the OCR engines
            //get the selected option
            var selectedOption = $("#ocrLanguage option:selected").val();

            //remove all option 
            $('#ocrLanguage').empty();

            //loop through the supported language for set option 
            for (index = 0; index < response.length; index++) {
                //create option 
                option = document.createElement('option');
                option.value = response[index].LanguageCode;//set value
                option.text = response[index].LanguageName; // set text
                select.add(option);
            }

            //set the selected language
            $("#ocrLanguage option[value='" + selectedOption + "']").prop('selected', 'selected');
        },
        failure: function (response) {
        },
        error: function (response) {
        }
    });
})

// file drag hover
function FileDragHover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = (e.type == "dragover" ? "hover" : "");
}

// file selection
function FileSelectHandler(e) {

    // cancel event and hover styling
    FileDragHover(e);

    // fetch FileList object
    var files = e.target.files || e.dataTransfer.files;
    filesToUpload = files;

    if (ReadFiles(files)) {
        imageGalleryData = [];
        isEnablePopup = false;
        $("#filedrag").hide();
        $("#previewImage").show();
        $("#previewText").html("File loaded successfully. For PDFs, only the first page will be shown in preview.");
        resetFormElement($("#imageFile"));
        resetFormElement($("#imageUrl"));
        $("#txtAreaParsedResult").val("");
        resetFormElement($("#ocrLanguage"));
        ClearError();
        ClearSucc();
        ClearWar();
        ClearDownloadURL();
    }
    else {
        ShowError("<strong>Error:</strong> Invalid image! Either the file is not an image <strong>OR</strong> the size of the image exceeds 5 MB");
        ClearDownloadURL();
    }
}

//
// initialize
function Init() {

    var filedrag = $id("filedrag");

    // file drop
    if (filedrag) {
        filedrag.addEventListener("dragover", FileDragHover, false);
        filedrag.addEventListener("dragleave", FileDragHover, false);
        filedrag.addEventListener("drop", FileSelectHandler, false);
    }
}

//Input["file"] type change handler - called when user chooses a file
$("#imageFile").change(function () {

    if (ReadFiles(this.files)) {
        imageGalleryData = [];
        isEnablePopup = false;
        $("#filedrag").hide();
        $("#FileTypeDiv").hide();
        $("#previewImage").show();
        $("#previewText").html("File loaded successfully. For PDFs, only the first page will be shown in preview.");
        resetFormElement($("#imageUrl"));
        $("#txtAreaParsedResult").val("");
        //resetFormElement($("#ocrLanguage"));
        ClearError();
        ClearSucc();
        ClearWar();
        ClearDownloadURL();
    }
    else {
        ShowError("<strong>Error:</strong> Invalid file! Either the file is not an image (.png or .jpg) <strong>OR</strong> PDF <strong>OR</strong> the size of the file exceeds 5 MB");
        resetFormElement($("#imageFile"));
        ClearDownloadURL();
    }
})

//Image url change
$("#imageUrl").on('change keyup paste mouseup', function () {
    if ($(this).val() != lastValue) {
        lastValue = $(this).val();
        $("#FileTypeDiv").show();
        resetFormElement($("#FileTypeDiv"));
        LoadFileFromURL();
    }
});

function DownloadCrossDomainPDF(data) {
    console.log('DownloadCrossDomainPDF');
    console.log(data);
}

//Load the file from specified URL
function LoadFileFromURL() {

    imageDataSRCs = [];
    if ($("#imageUrl").val() == '' || $("#imageUrl").val() == null || $("#imageUrl").val() == 'undefined') {
        //|| !ValidateImageExtension($("#imageUrl").val())) { //REMOVED THE EXTENSION VALIDATION

        //show error message
        ShowError("Invalid URL! Please provide url of only an image (.png or .jpg) <strong>OR</strong> a PDF file");

        //set parsed text
        $("#txtAreaParsedResult").val("");

        resetFormElement($("#imageUrl"));
        return;
    }

    fileExtension = GetFileExtension($("#imageUrl").val());

    if (fileExtension == 'pdf') {

        //Reset other elements and clear error
        $("#filedrag").hide();
        $("#previewImage").show();
        $("#previewImage").attr("src", "/Content/Images/PDF_Image.png");
        $("#previewText").html("File loaded successfully. No preview possible for PDF files. Document downloads starts with OCR.");
        resetFormElement($("#imageFile"));
        $("#txtAreaParsedResult").val("");
        // resetFormElement($("#ocrLanguage"));//commented for the issue of #100
        ClearError();
        ClearSucc();
        ClearWar();
        ClearDownloadURL();
    }
    else {

        $("#previewImage").attr("src", $("#imageUrl").val());
        $("#previewText").html("File loaded successfully. Note: TIFF files are not displayed, but OCR works");
        $("#filedrag").hide();
        $("#previewImage").show();

        //Reset other elements and clear erro        
        resetFormElement($("#imageFile"));
        $("#txtAreaParsedResult").val("");
        // resetFormElement($("#ocrLanguage"));//commented for the issue of #100
        ClearError();
        ClearSucc();
        ClearWar();
        ClearDownloadURL();

        //Push the image URL to later use for overlay
        imageDataSRCs.push($("#imageUrl").val());
    }

}



//Read files from the provided files object
function ReadFiles(files) {

    imageDataSRCs = [];
    resetFormElement($("#txtAreaParsedResult"));

    if (files && files[0]) {

        var fileName = files[0].name;

        if (ValidateImageExtension(fileName)) {

            //If file size is greater than 5 MB return false
            if (files[0].size > (1024 * 1024 * 11)) {
                return false;
            }

            fileExtension = GetFileExtension(files[0].name);

            if (fileExtension == 'pdf') {
                $("#animatedProgress").show();
                pdfFile = null;

                var tempReader = new FileReader();
                tempReader.onload = function (e) {
                    //console.log(e);

                    var arrayBuffer = tempReader.result;

                    //console.log(arrayBuffer.byteLength);

                    var uint8Array = new Uint8Array(arrayBuffer);

                    //console.log(uint8Array);
                    PDFJS.getDocument(uint8Array).then(function (pdf) {

                        //console.log(pdf);

                        pdfFile = pdf;
                        totalPagesOrImages = pdf.numPages;
                        //console.log("Number of pages: " + numOfPages);

                        pdfFile.getPage(1).then(handleFirstPage);

                    }).catch(function (error) {

                        if (error["name"] != null && error["name"] != undefined && error["name"] == "InvalidPDFException") {
                            ShowError("<strong>Error: </strong>The PDF file is corrupt. Please choose a valid PDF file");
                            resetFormElement($("#imageFile"));
                            $("#animatedProgress").hide();
                        }
                    });

                };

                filesToUpload = files;
                tempReader.readAsArrayBuffer(files[0]);

                return true;
            }
            else { //If an image file                

                var reader = new FileReader();

                reader.onload = function (e) {
                    $("#previewImage").attr("src", e.target.result);
                    $("#previewText").html("File loaded successfully. Note: TIFF files are not displayed, but OCR works");

                    imageDataSRCs.push(e.target.result);
                };

                reader.readAsDataURL(files[0]);
                filesToUpload = files;
                totalPagesOrImages = 1;

                return true;
            }
        }
        else {
            return false;
        }
    }
    else {
        $("#previewImage").attr("src", "");

        filesToUpload = null;
        return false;
    }
}

//Show PDF opening error
function ShowPDFError(e) {
    ShowError("<strong>Error occurred when opening PDF.</strong> Message: " + e.message);
    ResetAllFormElements();
}

//handle only first page of PDF
function handleFirstPage(page) {

    var scale = 1.5;
    var viewport = page.getViewport(scale);

    var canvas = $('<canvas/>').get(0);
    var context = canvas.getContext('2d');
    canvas.height = viewport.height; // * 1.2;
    canvas.width = viewport.width; // * 1.2;

    var renderingContext = {
        canvasContext: context,
        viewport: viewport
    };

    page.render(renderingContext).then(function () {

        var dataURL = canvas.toDataURL();

        //if (currentPage == 1) {
        $("#previewImage").attr("src", dataURL);
        $("#previewText").html("File loaded successfully. For PDFs, only the first page will be shown in preview.");
        //}

        $("#animatedProgress").hide();
    });

}

//Fill the image data src array with images from the PDF file
function FillImageDataSRCsFromPDFFile() {
    currentPage = 1;
    totalPagesOrImages = 0;

    if (filesToUpload) {

        var fileToScan = filesToUpload[0];
        pdfFile = null;

        var tempReader = new FileReader();
        tempReader.onload = function (e) {

            $("#animatedProgress").show();

            var arrayBuffer = tempReader.result;

            var uint8Array = new Uint8Array(arrayBuffer);

            PDFJS.getDocument(uint8Array).then(function (pdf) {

                pdfFile = pdf;
                totalPagesOrImages = pdf.numPages;

                pdfFile.getPage(1).then(handlePages);

                $("#animatedProgress").hide();

            }).catch(function (error) {

                if (error["name"] != null && error["name"] != undefined && error["name"] == "InvalidPDFException") {
                    ShowError("<strong>Error: </strong>The PDF file is corrupt. Please choose a valid PDF file");
                    resetFormElement($("#imageFile"));
                }

                $("#animatedProgress").hide();
            });

        };

        tempReader.readAsArrayBuffer(fileToScan);
    }
    else if ($("#imageUrl").val() != undefined && $("#imageUrl").val() != '' && $("#imageUrl").val() != null) {

        PDFJS.getDocument($("#imageUrl").val()).then(function (pdf) {
            pdfFile = pdf;
            totalPagesOrImages = pdf.numPages;

            pdfFile.getPage(1).then(handlePages);

            $("#animatedProgress").hide();

        }).catch(function (error) {

            if (error["name"] != null && error["name"] != undefined) {

                if (error["name"] == "InvalidPDFException") {
                    ShowError("<strong>Error: </strong>The PDF file is corrupt. Please choose a valid PDF file");
                }
                else if (error["name"] == "UnexpectedResponseException") {
                    ShowError("<strong>Error: </strong>Unable to load the PDF file for showing images for overlay. Please check if the PDF URL allows cross-origin requests");
                }

                resetFormElement($("#imageFile"));
            }

            $("#animatedProgress").hide();
        });
    }
}

function PDFFileDataURLExtractionCompleted() {
    $.each(imageGalleryData, function (index, value) {

        var $thisImageGalleryData = value;

        var divTag = $thisImageGalleryData["src"];

        var imageTag = divTag.find('img');

        imageTag.attr('src', imageDataSRCs[index]);
    });

    //Enable Overlay popup
    enablePopup();
}

//handle all pdf pages
function handlePages(page) {
    try {
        var scale = 1.35; //2.55;//1.35;
        var viewport = page.getViewport(scale);

        var canvas = $('<canvas/>').get(0);
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        var renderingContext = {
            canvasContext: context,
            viewport: viewport
        };

        page.render(renderingContext).then(function () {
            var dataURL = canvas.toDataURL();
            imageDataSRCs.push(dataURL);

            currentPage++;

            if (pdfFile != null) {
                if (currentPage <= totalPagesOrImages) {
                    pdfFile.getPage(currentPage).then(handlePages);
                }
                else {
                    PDFFileDataURLExtractionCompleted();
                }
            }
        });
    }
    catch (e) {
        ShowError("<strong>Error occurred when opening PDF.</strong> Message: " + e.message);
        resetFormElement($("#imageFile"));
    }
}

// getElementById
function $id(id) {
    return document.getElementById(id);
}

//Clear the page
function Clear() {
    //Reset all form elements 
    ResetAllFormElements();

    //Clear error messages, if any
    $("#FileTypeDiv").hide();
    ClearError();
    ClearSucc();
    ClearWar();
    //clear the download url
    ClearDownloadURL();
}

//Reset all form elements
function ResetAllFormElements() {    
    $("#filedrag").show();
    $("#previewImage").attr("src", "");
    $("#previewImage").height("100%");
    $("#previewImage").hide();
    resetFormElement($("#imageFile"));
    resetFormElement($("#imageUrl"));
    //resetFormElement($("#ocrLanguage")); //Not resetting language as its persisted using cookies
    resetFormElement($("#txtAreaParsedResult"));
    $("#txtAreaParsedResult").height("100%");
    resetFormElement($("#jsonResult"));// reset the json text when clear the image
    $("#jsonResult").height("100%");
    filesToUpload = null;
    lastValue = '';
    isErroredOnParsing = false;
    isPartiallyErroredOnParsing = false;
    imageGalleryData = [];
    currentPage = 1;
    isEnablePopup = false;
    $("#animatedProgress").hide();
    $("#previewText").html("");
    completeText = '';
    $("#btnShowOverlay").removeAttr("disabled");
    $("#btnDownloadText").removeAttr("disabled");
    $("#btnStartOCR").removeAttr("disabled");
    $("#SearchableFileDownloadMainDiv").hide();//hide the searchable pdf url 
}

//Clear just the error box
function ClearSucc() {
    //empty success message
    document.getElementById("sucOrErrMessage").innerHTML = "";
    $("#sucOrErrMesgMainDiv").removeClass("alert-success");
    $("#sucOrErrMesgMainDiv").hide();
}

//set empty error message
function ClearError() {
    document.getElementById("ErrorMessage").innerHTML = "";
    $("#ErrMessageMainDiv").removeClass("alert-danger");
    $("#ErrMessageMainDiv").hide();
}
function ClearWar() {
    //set empty warning message
    document.getElementById("WarningMessage").innerHTML = "";
    $("#WarMessageDiv").removeClass("alert-warning");
    $("#WarMessageMainDiv").hide();
}

//Show error
function ShowError(errorMessage) {
    //show error message
    document.getElementById("ErrorMessage").innerHTML = errorMessage;

    //(28-June-2019): Remove other alert classes before applying alert-success class
    $("#ErrMessageDiv").removeClass("alert-danger");
    $("#ErrMessageDiv").removeClass("alert-warning");

    $("#ErrMessageDiv").addClass("alert-danger");
    $("#ErrMessageMainDiv").show();
}

//Show success
function ShowSuccess(successMessage) {
    document.getElementById("sucOrErrMessage").innerHTML = successMessage;

    //(28-June-2019): Remove other alert classes before applying alert-success class
    $("#sucOrErrMesgDiv").removeClass("alert-danger");
    $("#sucOrErrMesgDiv").removeClass("alert-warning");

    $("#sucOrErrMesgDiv").addClass("alert-success");
    $("#sucOrErrMesgMainDiv").show();
}

//Show warning
function ShowWarning(warningMessage) {
    document.getElementById("WarningMessage").innerHTML = warningMessage;

    //(28-June-2019): Remove other alert classes before applying alert-success class
    $("#WarMessageDiv").removeClass("alert-danger");
    $("#WarMessageDiv").removeClass("alert-success");

    $("#WarMessageDiv").addClass("alert-warning");
    $("#WarMessageMainDiv").show();
}

//Reset a form element
function resetFormElement(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

//Start OCR
function StartOCR() {
    var erroredPagesOrImages = 0;
    var totalPagesOrImages = 0;

    const engineTypeSelected = $("input[name=OCREngine]:checked").val();
    if (engineTypeSelected == 0) {
        (async () => {
            $("#animatedProgress").show();
            $("#btnStartOCR").attr("disabled", 'disabled');
            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(filesToUpload[0]);
            console.log(ret, ret.data.text);
            const pageText = ret.data.text;
            completeText += "\r\n****** Result for Image/Page " + 1 + " ******\r\n" + pageText;
            
            JsontextFormat = {
                ParsedResults: [],
                OCRExitCode: 1,
                IsErroredOnProcessing: false,
                ProcessingTimeInMilliseconds: "",
                SearchablePDFURL: ""
            }
            
            JsontextFormat.ParsedResults = [{
                Overlay: {
                    Lines: ret.data.lines.map(line => {
                        return {
                            LineText: line.text,
                            Words: line.words.map(word => {
                                return {
                                    WordText: word.text,
                                    Left: word.bbox.x0,
                                    Top: word.bbox.y0,
                                    Height: Math.abs(word.bbox.y0 - word.bbox.y1),
                                    Width: Math.abs(word.bbox.x0 - word.bbox.x1)
                                }
                            }),
                            MaxHeight: Math.abs(line.bbox.y0 - line.bbox.y1),
                            MinTop: line.bbox.y0
                        }
                    }),
                    HasOverlay: true,
                    Message: `Total lines: ${ret.data.lines.length}`
                },
                "FileParseExitCode": 1,
                "TextOrientation": "0",
                "ParsedText": ret.data.text,
                "ErrorDetails": "",
                "ErrorMessage": "",
            }];

            var imageDataURL = imageDataSRCs[0];
            var imageElement = $("<div style='text-align:center;'><div style='position: relative; display: inline-block;'><img style='position: relative; vertical-align: central;' src='" + imageDataURL + "' /></div></div>");
            var isSetOverlay = true
            var textOverlay = JsontextFormat.ParsedResults[0]["Overlay"];
            
            //Set text overlay for this image
            if (isSetOverlay && textOverlay && textOverlay["HasOverlay"] == true)
                SetOverlay(imageElement, textOverlay);

            //Create the image source that will come in the gallery view
            var imageSourceToReplace = { src: imageElement };

            //push the image source to the image gallery data array - this array will be used to show the gallery of images with overlay
            imageGalleryData = [imageSourceToReplace];

            $("#txtAreaParsedResult").val(completeText);
            $("#txtAreaParsedResult").height($("#previewImage").height());
            $("#jsonResult").val(JSON.stringify(JsontextFormat, null, 2));
            $("#jsonResult").height($("#previewImage").height());
            enablePopup()
            $("#btnStartOCR").removeAttr("disabled");
            $("#animatedProgress").hide();
            ShowSuccess("<strong>Parsed Successfully!</strong> All images / pages were parsed successfully.");
                    
            await worker.terminate();
            completeText = '';
        })();
    } else {

    //If Validated
    if (Validate()) {
        $("#animatedProgress").show();
        $("#btnStartOCR").attr("disabled", "disabled");
        $("#btnDownloadText").attr("disabled", "disabled");
        $("#btnShowOverlay").attr("disabled", "disabled");

        /****************** PREPARE FORM DATA START ******************/
        var formData = new FormData();

        //Comment this when uploading multiple files - currently using for single file
        if (filesToUpload && filesToUpload.length > 0)
            formData.append("file", filesToUpload[0]);

        formData.append("url", $("#imageUrl").val());
        formData.append("language", $("#ocrLanguage option:selected").val())
        //formData.append("apikey", "5a64d478-9c89-43d8-88e3-c65de9999580");
        formData.append("isOverlayRequired", "true");
        formData.append("FileType", $("#ocrFiletype option:selected").val())  //append the file type in form data
        //get the checked radio button value 
        var checkval = $("input[name=OutputType]:checked").val();
        switch (checkval) {
            case '1':
                formData.append("IsCreateSearchablePDF", true);
                formData.append("isSearchablePdfHideTextLayer", false);
                break;
            case '2':
                formData.append("IsCreateSearchablePDF", true);
                formData.append("isSearchablePdfHideTextLayer", true);
                break;
            case '3':
                formData.append("IsCreateSearchablePDF", false);
                formData.append("isSearchablePdfHideTextLayer", true);
        }        
        
        //03-07-2018: Set the detect orientation value from the web app as selected by user
        formData.append("detectOrientation", $("#chkIsDetectOrientation").prop('checked'));

        //20-10-2018: Set the 'is one column only' true or false
        formData.append("isTable", $("#chkIsOneColumnOnly").prop('checked'));

        //06-05-2019: set the "Enginge type"       
        var engineType = $("input[name=OCREngine]:checked").val();
        if (engineType == "" || engineType == undefined)
            engineType = 1;
        
        //28-June-2019: Set the image scale mode as selected by the user
        formData.append("scale", $("#chkIsScaleImage").prop('checked'));

        //set value in formdata
        formData.append("OCREngine", engineType);

        //13-05-2019: Set the detect check box value from the web app as selected by user
        formData.append("detectCheckbox", $("#chkIsChkDetect").length > 0 ? $("#chkIsChkDetect").prop('checked') : 'false');

        
        //check and set the detect checkbox value and template value 
        formData.append("checkboxTemplate", $("#dropchkTemplete").length > 0 ? $("#dropchkTemplete option:selected").val() : '0');

        /****************** PREPARE FORM DATA END ******************/


        //Clear error
        ClearError();
        ClearSucc();
        ClearWar();
        ClearDownloadURL();
        //add "Right To left" in textarea for the arabic language
        if ($("#ocrLanguage option:selected").val() == "ara") {
            $("#txtAreaParsedResult").attr("dir", "rtl");
        }
        else {
            $("#txtAreaParsedResult").attr("dir", "");
        }

        //Reset text area, complete text and the image gallery
        $("#txtAreaParsedResult").val("");
        $("#jsonResult").val("");

        //(10-July-2019): Changed the JSON from text format to a JSON objec that will be later on stringified
        JsontextFormat = {
            ParsedResults:[],
            OCRExitCode:"",
            IsErroredOnProcessing:"",
            ErrorMessage:"",
            ErrorDetails: "",
            ProcessingTimeInMilliseconds: "",
            SearchablePDFURL: ""
        };

        completeText = '';
        imageGalleryData = [];

        //Send OCR Parsing request asynchronously
        jQuery.ajax({
            url: webApiBaseURL + webApiParseImageRelativeURL,
            data: formData,
            dataType: 'json',
            cache: false,
            contentType: false,
            headers: {
                'apikey': 'donotstealthiskey_ip1'
            },
            processData: false,
            type: 'POST',
            success: function (ocrParsedResult) {
                
                $("#btnDownloadText").removeAttr("disabled");
                var parsedResults = ocrParsedResult["ParsedResults"];
                var ocrExitCode = ocrParsedResult["OCRExitCode"];
                var isErroredOnProcessing = ocrParsedResult["IsErroredOnProcessing"];
                var errorMessage = ocrParsedResult["ErrorMessage"];
                var errorDetails = ocrParsedResult["ErrorDetails"];
                var processingTimeInMilliseconds = ocrParsedResult["ProcessingTimeInMilliseconds"];
                var processingTimeInSeconds = (+processingTimeInMilliseconds) / 1000;
                var SearchablePDF_URL = ocrParsedResult["SearchablePDFURL"];



                if (parsedResults != null) {
                    var imageOrPageCount = 0;

                    if (fileExtension == 'pdf') FillImageDataSRCsFromPDFFile();

                    $.each(parsedResults, function (index, value) {

                        var OverlayObj = value["TextOverlay"];
                        var exitCode = value["FileParseExitCode"];
                        var parsedText = value["ParsedText"];
                        var errorMessage = value["ErrorMessage"];
                        var errorDetails = value["ErrorDetails"];
                        var textOverlay = value["TextOverlay"];
                        var textOrientation = value["TextOrientation"];

                        var pageText = '';
                        var isSetOverlay = false;

                        switch (+exitCode) {
                            case 1:
                                pageText = parsedText;
                                isSetOverlay = true;
                                break;
                            case 0:
                            case -10:
                            case -20:
                            case -30:
                            case -99:
                            default:
                                pageText += "Error: " + errorMessage;
                                break;
                        }

                        imageOrPageCount++;
                        completeText += "\r\n****** Result for Image/Page " + imageOrPageCount + " ******\r\n" + pageText
                        var imageDataURL = imageDataSRCs[index];

                        //(10-July-2019): Commented this block of code and now getting the values in a JSON object itself that will be later on stringified.
                        //Convert Json object to Json format for show result in json 
                        //var Jsontext = JSON.stringify(OverlayObj, null, '\t');                        
                        //JsontextFormat += "\r\n****** JSON for Image/Page " + imageOrPageCount + " ******\r\n" + Jsontext + ",\r\n";
                        //JsontextFormat += "\"FileParseExitCode\":" + exitCode + ",\r\n";
                        //JsontextFormat += "\"TextOrientation\":" + textOrientation + ",\r\n";
                        //JsontextFormat += "\"ParsedText\":" + pageText + ",";
                        //JsontextFormat += "\"ErrorMessage\":\"" + errorMessage + "\",\r\n";
                        //JsontextFormat += "\"ErrorDetails\":\"" + errorDetails + "\"\r\n";
                        //JsontextFormat += "},\r\n";

                        //create parsed json object
                        var parsedJSON = {
                            Overlay: OverlayObj,
                            FileParseExitCode: exitCode,
                            TextOrientation: textOrientation,
                            ParsedText: pageText,
                            ErrorMessage: errorMessage,
                            ErrorDetails: errorDetails
                        };

                        //add the parsed json object to the array of json result
                        JsontextFormat.ParsedResults.push(parsedJSON);

                        //Create the element for displaying this image in 'overlay' popup
                        var imageElement = $("<div style='text-align:center;'><div style='position: relative; display: inline-block;'><img style='position: relative; vertical-align: central;' src='" + imageDataURL + "' /></div></div>");

                        //Set text overlay for this image
                        if (isSetOverlay && textOverlay && textOverlay["HasOverlay"] == true)
                            SetOverlay(imageElement, textOverlay);

                        //Create the image source that will come in the gallery view
                        var imageSourceToReplace = { src: imageElement };

                        //push the image source to the image gallery data array - this array will be used to show the gallery of images with overlay
                        imageGalleryData.push(imageSourceToReplace);
                    });

                    //(10-July-2019): Commented this custom formatting code and now adding to a JSOn object itself that will be later on stringfied
                    //add the text overlay details with error code and searchable PDF url
                    //JsontextFormat += "],\r\n";
                    //JsontextFormat += "\"OCRExitCode\":\"" + ocrExitCode + "\",\r\n";
                    //JsontextFormat += "\"IsErroredOnProcessing\":\"" + isErroredOnProcessing + "\",\r\n";
                    //JsontextFormat += "\"ErrorMessage\":\"" + errorMessage + "\",\r\n";
                    //JsontextFormat += "\"ErrorDetails\":\"" + errorDetails + "\",\r\n";
                    //JsontextFormat += "\"ProcessingTimeInMilliseconds\":\"" + processingTimeInSeconds + "\",\r\n";
                    //JsontextFormat += "\"SearchablePDFURL\":\"" + SearchablePDF_URL + "\"\r\n";
                    //JsontextFormat += "}";
                    JsontextFormat.OCRExitCode = ocrExitCode;
                    JsontextFormat.IsErroredOnProcessing = isErroredOnProcessing;
                    JsontextFormat.ErrorMessage = errorMessage;
                    JsontextFormat.ErrorDetails = errorDetails;
                    JsontextFormat.ProcessingTimeInMilliseconds = processingTimeInSeconds;
                    JsontextFormat.SearchablePDFURL = SearchablePDF_URL;
                }
                else if (isErroredOnProcessing) {
                    completeText = errorMessage;
                }

                switch (ocrExitCode) {
                    case 1:
                        ShowSuccess("<strong>Parsed Successfully!</strong> All images / pages were parsed successfully. (Processing time: " + processingTimeInSeconds + " seconds)");
                        if (fileExtension != 'pdf')
                            enablePopup();
                        else
                            disablePopup();
                        //   if (checkval == '1' || checkval == '2')
                        ShowSearchablePDFURL(checkval, SearchablePDF_URL);
                        //  else
                        //    $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 2:
                        ShowWarning("<strong>Warning: Image / PDF pages parsed with errors.</strong> One or more image / pages gave error on conversion. Please check the errors in result area.");
                        //disablePopup();
                        // if (checkval == '1' || checkval == '2')
                        ShowSearchablePDFURL(checkval, SearchablePDF_URL);
                        // else
                        //    $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 3:
                        ShowError("<strong>Error: All images / PDF pages gave error.</strong> None of the image / page was successfully converted. Please check the errors in result area.");
                        disablePopup();
                        $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 4:
                        ShowWarning("<strong>Warning: Maximum page limit was reached.</strong> The maximum page limit for parsing was reached. However, all the pages up to the limit have been parsed successfully.");
                        //disablePopup();
                        // if (checkval == '1' || checkval == '2')
                        ShowSearchablePDFURL(checkval, SearchablePDF_URL);
                        // else
                        //     $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 5:
                        ShowWarning("<strong>Warning: Maximum page limit was reached.</strong> The maximum page limit for parsing was reached. Also, only a partial number of pages up to the limit was successfully parsed.");
                        //disablePopup();
                        // if (checkval == '1' || checkval == '2')
                        ShowSearchablePDFURL(checkval, SearchablePDF_URL);
                        // else
                        //    $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 6:
                        ShowError("<strong>Error: Time out!.</strong> Timed out while waiting for the images/pages. Please try again.");
                        disablePopup();
                        $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    case 99:
                        ShowError("<strong>Error: </strong>" + errorMessage);
                        disablePopup();
                        $("#SearchableFileDownloadMainDiv").hide();
                        break;
                    default:
                        ShowError("<strong>Error: Something went wrong! Please try again.");
                        disablePopup();
                        $("#SearchableFileDownloadMainDiv").hide();
                        break;
                }

                //set parsed text and Json formated result
                if (completeText != null && completeText != undefined && completeText != "") {
                    $("#txtAreaParsedResult").val(completeText);
                    $("#txtAreaParsedResult").height($("#previewImage").height());
                    $("#jsonResult").val(JSON.stringify(JsontextFormat, null, 2));
                    $("#jsonResult").height($("#previewImage").height());
                }

                $("#btnStartOCR").removeAttr("disabled");
                $("#animatedProgress").hide();

                //persist last language selection
                persistLastLanguageSelection();
            },
            error: function (error) {
                $("#btnStartOCR").removeAttr("disabled");
                $("#animatedProgress").hide();
                console.log(error);

                var responseText = error["responseText"];

                //show error message
                ShowError("<strong>Error when processing image.</strong> " + responseText);

                //set parsed text
                $("#txtAreaParsedResult").val("");
            }
        });
    }
}
}

//show the searchable PDF URL for download file
function ShowSearchablePDFURL(CheckedValue, SearchablePDF_URL) {

    //set the searchable PDF URL for download the file
    if ((CheckedValue == '1' || CheckedValue == '2') && SearchablePDF_URL != "" && SearchablePDF_URL != null) {
        //show the searchable pdf url
        $("#SearchableFileDownloadMainDiv").show();
        document.getElementById("SearchablePDF").innerHTML = "<strong>Download Searchable PDF: </strong> " + "<a href=" + SearchablePDF_URL + " target='_blank'>" + SearchablePDF_URL + "</a>";
        $("#SearchableFileDownloadDiv").addClass("alert-success");

    }
    else {//show only the text 
        $("#SearchableFileDownloadMainDiv").show();
        document.getElementById("SearchablePDF").innerHTML = "<strong>Download Searchable PDF: </strong>" + SearchablePDF_URL;
        $("#SearchableFileDownloadDiv").addClass("alert-success");
    }
}
// Close the Download file URl Div
$(".closePDFURL").click(function () {
    ClearDownloadURL();
});
//clear the download url
function ClearDownloadURL() {

    $("#SearchableFileDownloadMainDiv").hide();
    $("#SearchableFileDownloadDiv").removeClass("alert-success");
    document.getElementById("SearchablePDF").innerHTML = "";
}


//Validation
function Validate() {
    isValidated = true;

    var message = "";
    if ((filesToUpload == null || filesToUpload == 'undefined') && ($("#imageUrl").val() == null || $("#imageUrl").val() == 'undefined' || $("#imageUrl").val() == '')) {
        message += "* Select an image or image url or drag and drop an image file to be uploaded for OCR Parsing<br /><br />";
    } else if (filesToUpload != null && filesToUpload.length > 1)
        message += "* Please select only one file at a time<br /><br />";

    if ($("#ocrLanguage option:selected").val() == "" || $("#ocrLanguage option:selected").val() == 'undefined' || $("#ocrLanguage option:selected").val() == "-- Select --") {
        message += "* Select language of image<br /><br />";
    }

    if ($("input[name=OutputType]:checked").length == "0") {
        message += "* Select result condition.<br /><br />";
    }

    //get if create searchable PDF is checked
    var createSearchablePDFValue = $("input[name='OutputType']:checked").val();

    //(10-July-2019): if searchable PDF creation is selected, then check if the image is a TIFF file and show error message
    if (createSearchablePDFValue == '1' || createSearchablePDFValue == '2') {

        var isTiffFile = false;
        if (filesToUpload != null && filesToUpload != 'undefined' && filesToUpload.length > 0) {
            isTiffFile = IsTIFFFile(filesToUpload[0].name);
        }
        else if ($("#imageUrl").length > 0) {
            isTiffFile = IsTIFFFile($("#imageUrl").val());
        }

        if (isTiffFile == true)
            message += "* Searchable PDF option is not yet supported for TIFF files<br /><br />";
    }

    //(06-June-2019): Added validations for engine 2
    var ocrEngineSelected = $("input[name='OCREngine']:checked").val()
    if (ocrEngineSelected == '2') {        
     //   if (createSearchablePDFValue == '1' || createSearchablePDFValue == '2')
     //       message += "* Searchable PDF option is not yet supported for Engine 2<br /><br />";

        //(25-June-2019): Commented. Removed the validation for detect orientation for engine 2
        //var isDetectOrientation = $("input[id='chkIsDetectOrientation']").prop('checked');
        //if (isDetectOrientation == true)
        //    message += "* Detect orientation option is not yet supported for Engine 2<br /><br />";

        //(16-July-2019): Commented. Removed the validation for one column only for the engine 2.
        //var isOneColumnOnly = $("input[id='chkIsOneColumnOnly']").prop('checked');
        //if (isOneColumnOnly == true)
        //    message += "* One column only option is not yet supported for Engine 2<br /><br />";

        var isDetectCheckbox = $("#chkIsChkDetect").length > 0 ? $("#chkIsChkDetect").prop('checked') : false;
        if (isDetectCheckbox == true)
            message += "* Detect checkboxes option is not yet supported for Engine 2<br /><br />";
    }

    if (message != '') {
        message = "<strong>Please correct the following:</strong> <br /><br />" + message;

        //show error message
        document.getElementById("sucOrErrMessage").innerHTML = message;
        $("#sucOrErrMesgDiv").addClass("alert-danger");
        $("#sucOrErrMesgMainDiv").show();

        isValidated = false;
    }

    return isValidated;
}

//Close the error/success box
$(".close").click(function (e) {
    //$("#sucOrErrMesgMainDiv").hide();
    var id = $(this).attr("id");// get the id of close div if the success or error div then call "ClearError"
    if (id == "Error") {//check for error message
        ClearError();
    }
    else if (id == "Warning") {//chechk for warning message
        ClearWar();
    } else if (id == "sucOrErr") {//chehck for success message
        ClearSucc();
    }
    // e.stopPopagation();
    // ClearError();
});

//Validate an image extension
function ValidateImageExtension(fileNameOrUrl) {
    var extension = GetFileExtension(fileNameOrUrl);
    
    var allowedExtensions = ["jpg", "tiff", "png", "jpeg", "tif", "gif", "bmp", "pdf", "webp"];
     
    var indexOfExt = $.inArray(extension.toLowerCase(), allowedExtensions);

    if (indexOfExt >= 0)
        return true;
    else
        return false;
}

/**
 * Is the file a TIFF file
 * @param {any} fileNameOrUrl File name or URL
 */
function IsTIFFFile(fileNameOrUrl) {

    //get the file extension
    var extension = GetFileExtension(fileNameOrUrl);

    //tiff extension list
    var tiffExtensions = ["tiff", "tif"];

    //get the index of extension in the file path or url
    var indexOfExt = $.inArray(extension.toLowerCase(), tiffExtensions);

    //if the extension is found, then return 'true'
    if (indexOfExt >= 0)
        return true;
    else
        return false;
}

//Get a file extension from name or URL
function GetFileExtension(fileNameOrUrl) {
    var a = fileNameOrUrl.split(".");
    if (a.length === 1 || (a[0] === "" && a.length === 2)) {
        return "";
    }
    return a.pop();
}

function findWords(wordList, searchList) {
    wordList = wordList || [];
    searchList = searchList || [];
    const searchListLength = searchList.length;
    const foundAt = [];
    wordList.forEach( (word, index) => {
        const subList = wordList.slice(index, index + searchListLength);
        console.log('sublist', subList)
        if (_.isEqual(subList, searchList)) {
            foundAt.push(index);
        }
    })
    console.log(`foundAt - `, foundAt)
    return foundAt;
}

//Set overlay on image
function SetOverlay(imageElement, textOverlay) {

    var divElement = imageElement.find('div');

    var divContent = '';
    var lines = textOverlay["Lines"];
    console.log('textOverlay ====', textOverlay);
    // const searchList = ['for', 'your'];
    const searchList = $('#searchText').val().trim().split(' ');
    let searchTextoccurenceCounter = 0

    //Loop through each line to show words
    $.each(lines, function () {

        var $thisLine = $(this)[0];
        var maxLineHeight = $thisLine["MaxHeight"];
        var minLineTopDist = $thisLine["MinTop"];

        const words = $thisLine['Words'];
        const wordTextList = words.map( word => word.WordText );
        console.log(wordTextList, searchList);
        const foundAt = findWords(wordTextList, searchList);
        const indicesOfFoundWords = foundAt.map( index => {
            const res = [];
            for (let i=0; i<searchList.length; i++) {
                res.push(index+i);
            }
            return res;
        }).flat();
        console.log('indicesOfFoundWords - ', indicesOfFoundWords)

        //Loop through each word to show on top of the text
        $.each($thisLine["Words"], function (currentWordIndex) {
            $thisWord = $(this)[0];
            if (indicesOfFoundWords.indexOf(currentWordIndex) != -1) {
                if (foundAt.indexOf(currentWordIndex) != -1) {
                    searchTextoccurenceCounter++;
                    divContent = divContent +
                    "<span style=\"position:absolute; left:" + $thisWord["Left"] + "px; top:" + minLineTopDist + "px; height:" + maxLineHeight + "px; width:" + $thisWord["Width"] + "px; text-align:center; font-size: " + ((+maxLineHeight) * 0.8) + "px; font-weight: bold; color: blue; background: lightblue;\">" + `<sup>${searchTextoccurenceCounter}</sup>` + $thisWord["WordText"] + "</span>&nbsp;";
                } else {
                divContent = divContent +
                    "<span style=\"position:absolute; left:" + $thisWord["Left"] + "px; top:" + minLineTopDist + "px; height:" + maxLineHeight + "px; width:" + $thisWord["Width"] + "px; text-align:center; font-size: " + ((+maxLineHeight) * 0.8) + "px; font-weight: bold; color: blue; background: lightblue;\">" + $thisWord["WordText"] + "</span>&nbsp;";
                }
            } else {
                divContent = divContent +
                    "<span style=\"position:absolute; left:" + $thisWord["Left"] + "px; top:" + minLineTopDist + "px; height:" + maxLineHeight + "px; width:" + $thisWord["Width"] + "px; text-align:center; font-size: " + ((+maxLineHeight) * 0.8) + "px; font-weight: bold; color: red; background: linear-gradient(" +
                    "rgba(255, 215, 15, 0.5)," +
                    "rgba(255, 215, 15, 0.5)" +
                    ");\">" + $thisWord["WordText"] + "</span>&nbsp;";
            }
        });

        divContent = divContent + "<br/>";
    });

    //Append the original 'div' tag with the 'spans' so that it contains the image as well as its overlay
    divElement.append(divContent);
}

//Download OCR'ed Text
function DownloadText() {
    if (completeText) {
        saveTextAsFile(completeText);
    }
    else
        ShowError("<strong>Error: </strong>Please parse an image or PDF to download its text. If already parsed then no text for this image or pdf exists.");
}

//Saves the text in textbox as a file
function saveTextAsFile(textToWrite) {
    var textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
    var fileNameToSaveAs = "ParsedResult.txt";

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);

    downloadLink.click();
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
}

//Show overlay function
function ShowOverlay() {
    if (isEnablePopup) {
        $("#previewImage").trigger('click')
    }
    else {
        ShowError("<strong>No overlay text available to show.</strong> Please <strong>'successfully'</strong> parse an image or PDF file to see its overlay results.");
    }
}

//Submit the contact us form
function submitContactForm() {
    $("#ocrContactForm").submit();
}

//Persists user's chosen language using cookies
function persistLastLanguageSelection() {
    var selectedLanguage = $("#ocrLanguage option:selected").val();

    setCookie("selectedLanguage", selectedLanguage, 30);
}

//Set a cookie with the given name, value and expiry period
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

//Get cookie with the provided name
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

//Disable the overlay popup
function disablePopup() {
    //Disable 'overlay' popup
    isEnablePopup = false;
    $("#btnShowOverlay").attr("disabled", "disabled");
}

//Enable the overlay popup
function enablePopup() {
    //Enable 'overlay' popup
    isEnablePopup = true;
    $("#btnShowOverlay").removeAttr("disabled");
    $("#previewImage").magnificPopup({
        items: imageGalleryData,
        enableEscapeKey: true,
        type: 'inline',
        showCloseBtn: true,
        closeOnContentClick: true,
        inline: {
            markup: '<a class="mfp-src"></a>',
        },
        disableOn: function () {
            if (isEnablePopup) {
                return true;
            }
            return false;
        },
        gallery: {
            enabled: true,
            preload: [0, 2]
        }
    });
}

//Smooth Scrolling
$(function () {
    $('a[href*=#]:not([href=#])').click(function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html,body').animate({
                    scrollTop: target.offset().top
                }, 1000);
                return false;
            }
        }
    });
});