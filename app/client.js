import { CallClient, CallFeature } from "@azure/communication-calling";
import * as SDK from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
const config = require('./config.json');
//import {} from'microsoft-cognitiveservices-speech-sdk';
//const fs = require("fs");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

let call;
let callAgent;
let tokenCredential;
let callCaptionsApi;
const userToken = document.getElementById("token-input"); 
const calleeInput = document.getElementById("callee-id-input");
const submitToken = document.getElementById("token-submit");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const captionsStartButton = document.getElementById("captions-start-button");
const captionsArea = document.getElementById("captions-area");

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

  const captionsHandler = (data) => {
    if (data.resultType === 'final') {
      console.log('Speaker: ' + data.speaker)
      console.log('Only Finalized: ' + data.resultType)
      console.log('Caption: ' + data.spokenText)
    }

  };
  try {
    call.on('stateChanged', () => { 
      if (call.state === 'Connected')
      {
        console.log("Connected State");
        if (call.feature(SDK.Features.Captions)) {
          callCaptionsApi = call.feature(SDK.Features.Captions);
          console.log("Captions Initialized");
          captionsStartButton.disabled = false;
          try {
            captionsStartButton.addEventListener("click", async () => {
              callCaptionsApi.captions.startCaptions();
            })
          } catch (e) {
            console.log('failed to add event listener')
          }
          console.log('attempting to add captions received handler');
          
          if (callCaptionsApi.captions.kind === 'Captions') {
            callCaptionsApi.captions.on('CaptionsReceived', captionsHandler);
          }
          console.log("End of Connected state handler");
        }
      }
    })
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
const textAnalyticsEndpoint = config.TEXT_ANALYTICS_ENDPOINT;
const textAnalyticsApiKey = config.TEXT_ANALYTICS_API_KEY;

const speechApiKey = config.SPEECH_API_KEY;
const speechEndpoint = config.SPEECH_ENDPOINT;

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



