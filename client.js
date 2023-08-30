import { CallClient } from "@azure/communication-calling";
import * as SDK from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
const config = require('./config.json');
import {} from'microsoft-cognitiveservices-speech-sdk';
//const fs = require("fs");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
// const { CallClient } = require("@azure/communication-calling");
// const { AzureCommunicationTokenCredential } = require('@azure/communication-common');
// const sdk = require("microsoft-cognitiveservices-speech-sdk");
 const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");
// const config = require('./config.json');




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

userToken.value = config.USER_TOKEN;

// // const captionsArea = document.getElementById("captions-area");
// const sentimentColors = [];
// function drawWavySineWave() {
//   const canvasWidth = sineWaveCanvas.width;
//   const canvasHeight = sineWaveCanvas.height;
//   canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

//   // Draw the wavy sine wave
//   canvasContext.beginPath();
//   for (let x = 0; x < canvasWidth; x += 5) {
//     const yOffset = Math.sin((x + Date.now() * 0.01) / 20) * 30; // Add animation to the wave
//     const y = canvasHeight / 2 + yOffset;

//     const color = sentimentColors[x] || "#FFFFFF"; // Use stored sentiment color or default to white
//     canvasContext.fillStyle = color;
//     canvasContext.fillRect(x, y, 5, 5); // Adjust the size of wave segments as needed
//   }
//   canvasContext.closePath();
// }

const sineWaveCanvas = document.getElementById("sineWaveCanvas");
const canvasContext = sineWaveCanvas.getContext("2d");

function updateSineWaveColor(sentiment) {
  // Choose colors based on sentiment
  let fillColor = "#FFFFFF"; // Default color (white)
  if (sentiment === "positive") {
    fillColor = "#00FF00"; // Green for positive sentiment
  } else if (sentiment === "neutral") {
    fillColor = "#FFFF00"; // Yellow for neutral sentiment
  } else if (sentiment === "negative") {
    fillColor = "#FF0000"; // Red for negative sentiment
  }

  // Clear canvas and draw colored sine wave
  canvasContext.clearRect(0, 0, sineWaveCanvas.width, sineWaveCanvas.height);
  canvasContext.beginPath();
  for (let x = 0; x < sineWaveCanvas.width; x += 5) {
    const y = sineWaveCanvas.height / 2 + Math.sin(x / 20) * 50; // Adjust the sine wave parameters as needed
    canvasContext.lineTo(x, y);
  }
  canvasContext.lineTo(sineWaveCanvas.width, sineWaveCanvas.height);
  canvasContext.lineTo(0, sineWaveCanvas.height);
  canvasContext.closePath();
  canvasContext.fillStyle = fillColor;
  canvasContext.fill();
}

submitToken.addEventListener("click", async () => {
  const callClient = new CallClient();
  const userTokenCredential = userToken.value;
    try {
      tokenCredential = new AzureCommunicationTokenCredential(userTokenCredential);
      callAgent = await callClient.createCallAgent(tokenCredential);
      callButton.disabled = false;
      submitToken.disabled = true;
      calleeInput.value = config.USER_IDENTITY_2;
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

  // const captionsHandler = (data) => {
  //   if (data.resultType === 'Final') {
  //     console.log(
  //       (data.speaker.identifier.id 
  //       ? data.speaker.identifier.id 
  //       : data.speaker.displayName 
  //       ? data.speaker.displayName 
  //       : data.speaker.identifier.communicationUserId 
  //       ? data.speaker.identifier.communicationUserId : 'Unknown') + ": " + data.spokenText
  //       )
  //   }

  // };

  const captionsHandler = async (data) => {
 //   if (data.resultType === 'Final') {
        const spokenText = data.spokenText;
        const sentiment = await performSentimentAnalysis(spokenText);
        console.log(
            (data.speaker.identifier.id 
            ? data.speaker.identifier.id 
            : data.speaker.displayName 
            ? data.speaker.displayName 
            : data.speaker.identifier.communicationUserId 
            ? data.speaker.identifier.communicationUserId : 'Unknown') + ": " + spokenText +
            "\nSentiment: " + sentiment
        );
   // }
};

  try {
    call.on('stateChanged', async () => { 
      if (call.state === 'Connected')
      {
        if (call.feature(SDK.Features.Captions)) {
          callCaptionsApi = await call.feature(SDK.Features.Captions);
          captionsStartButton.disabled = false;
          try {
            captionsStartButton.addEventListener("click", async () => {
              captionsStartButton.disabled = true;
              await callCaptionsApi.captions.startCaptions();
              if (callCaptionsApi.captions.kind === 'Captions') {
                callCaptionsApi.captions.on('CaptionsReceived', captionsHandler);
              }
            })
          } catch (e) {
            console.warn('failed to add event listener')
          }
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

// async function performSentimentAnalysis(transcribedText) {
//     const textAnalyticsClient = new sdk.TextAnalytics.TextAnalyticsClient(
//         textAnalyticsEndpoint,
//         new sdk.TextAnalytics.ApiKeyCredential(textAnalyticsApiKey)
//     );

//     const sentimentResult = await textAnalyticsClient.analyzeSentiment([transcribedText]);
//     const sentiment = sentimentResult[0].sentiment;

//     return sentiment;
// }
async function performSentimentAnalysis(text) {
  // const textAnalyticsClient = new TextAnalyticsClient(textAnalyticsEndpoint,);
  //     new AzureKeyCredential(textAnalyticsApiKey)

  const textAnalyticsClient = new TextAnalyticsClient(textAnalyticsEndpoint, new AzureKeyCredential(textAnalyticsApiKey));

  const sentimentResult = await textAnalyticsClient.analyzeSentiment([text]);
  const sentiment = sentimentResult[0].sentiment;
  updateSineWaveColor(sentiment);

}

animate(); 

function updateUI(sentiment) {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = `Sentiment: ${sentiment}`;
}
