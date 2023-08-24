import { CallClient, CallFeature } from "@azure/communication-calling";
//import * as SDK from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
//import {} from'microsoft-cognitiveservices-speech-sdk';
//const fs = require("fs");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

let call;
let callAgent;
let tokenCredential;
const userToken = document.getElementById("token-input"); 
const calleeInput = document.getElementById("callee-id-input");
const submitToken = document.getElementById("token-submit");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");

submitToken.addEventListener("click", async () => {
  const callClient = new CallClient();
  const userTokenCredential = userToken.value;
    try {
      tokenCredential = new AzureCommunicationTokenCredential(userTokenCredential);
      callAgent = await callClient.createCallAgent(tokenCredential);
      callButton.disabled = false;
      submitToken.disabled = true;
    } catch(error) {
      window.alert("Please submit a valid token!");
    }
})

callButton.addEventListener("click", async () => {
  // start a call
  const userToCall = calleeInput.value;
  call = callAgent.startCall(
      [{ id: userToCall }],
      {}
  );

  const captionsHandler = (data) => {console.log(data)};
try {
  console.log('*****start******') 
  call.on('stateChanged', () => { 
    console.log('state changed to: ' + call.state);
    if (call.state === 'Connected')
     {
      console.log('inside if');
    //const callCaptionsApi = call.feature(SDK.Features.Captions);
    const callCaptionsApi = call.feature(CallFeature.Features.Captions);
    console.log('hitcaption')
  }
    
    } )
    //callCaptionsApi.on('captionsReceived', captionsHandler);
    //if (!callCaptionsApi.isCaptionsActive) {
      //  await callCaptionsApi.startCaptions({ spokenLanguage: 'en-us' });
    //}
    //console.log('****end******') 
} 
catch (e) {
    console.log('Internal error occurred when Starting Captions')
    console.log (e)
}

  // toggle button states
  hangUpButton.disabled = false;
  callButton.disabled = true;
});

hangUpButton.addEventListener("click", () => {
  // end the current call
  call.hangUp({ forEveryone: true });

  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
  submitToken.disabled = false;
});
//const{TextAnalysisClient, AzureKeyCredential } =require("@azure/ai-language-text");
const textAnalyticsEndpoint = " *****";
const textAnalyticsApiKey = "*****";

const speechApiKey = "****";
const speechEndpoint = "****";

document.getElementById("analyzeButton").addEventListener("click", async () => {
    const audioFile = document.getElementById("audioFile").files[0];
    if (!audioFile) {
        alert("Please select an audio file.");
        return;
    }

    try {
        // Convert call recording to transcribed text
        const transcribedText = await convertAudioToTranscription(audioFile);

        // Perform sentiment analysis
        const sentiment = await performSentimentAnalysis(transcribedText);

        // Update UI with sentiment
        updateUI(sentiment);
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        alert("An error occurred while analyzing sentiment.");
    }
});

async function convertAudioToTranscription(audioFile) {
    const audioBlob = new Blob([audioFile], { type: "audio/wav" });
    const audioStream = audioBlob.stream();

    const speechClient = new sdk.SpeechSDK.SpeechServiceClient(
        sdk.SpeechSDK.SpeechConfig.fromEndpoint(speechEndpoint, speechApiKey)
    );

    const audioConfig = sdk.SpeechSDK.AudioConfig.fromStreamInput(audioStream);
    const recognizer = new sdk.SpeechSDK.SpeechRecognizer(speechClient, audioConfig);

    return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(result => {
            if (result.reason === sdk.SpeechSDK.ResultReason.RecognizedSpeech) {
                resolve(result.text);
            } else {
                reject(new Error("Speech recognition failed."));
            }
        });
    });
}

async function performSentimentAnalysis(transcribedText) {
    const textAnalyticsClient = new sdk.TextAnalytics.TextAnalyticsClient(
        textAnalyticsEndpoint,
        new sdk.TextAnalytics.ApiKeyCredential(textAnalyticsApiKey)
    );

    const sentimentResult = await textAnalyticsClient.analyzeSentiment([transcribedText]);
    const sentiment = sentimentResult[0].sentiment;

    return sentiment;
}

function updateUI(sentiment) {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = `Sentiment: ${sentiment}`;
}



