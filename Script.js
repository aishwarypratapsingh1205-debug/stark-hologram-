import {
  FilesetResolver,
  HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const video = document.querySelector("#video");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");

const output = document.querySelector("#output");
const start = document.querySelector("#start");
const stop = document.querySelector("#stop");
const clear = document.querySelector("#clear");

const status = document.querySelector("#status");
const gestureEl = document.querySelector("#gesture");
const keyboard = document.querySelector("#keyboard");

const rows = [
  ["1","2","3","4","5","6","7","8","9","0","-","=","BACKSPACE"],
  ["Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],
  ["A","S","D","F","G","H","J","K","L",";","'","ENTER"],
  ["Z","X","C","V","B","N","M",",",".","/"],
  ["SPACE"]
];

const keys = [];

// Keyboard create
rows.forEach(rowData => {

  const row = document.createElement("div");
  row.className = "row";

  rowData.forEach(label => {

    const button = document.createElement("button");

    button.className = "key";
    button.textContent = label;
    button.dataset.key = label;

    if (label === "SPACE") {
      button.classList.add("space");
    }

    if (label === "BACKSPACE") {
      button.classList.add("wide");
    }

    if (label === "ENTER") {
      button.classList.add("enter");
    }

    button.addEventListener("click", () => {
      pressKey(label, button);
    });

    row.appendChild(button);
    keys.push(button);

  });

  keyboard.appendChild(row);

});


// Key press
function pressKey(key, button = null) {

  if (button) {
    button.classList.add("pressed");

    setTimeout(() => {
      button.classList.remove("pressed");
    }, 160);
  }

  if (key === "BACKSPACE") {

    output.value = output.value.slice(0, -1);

  } else if (key === "ENTER") {

    output.value += "\n";

  } else if (key === "SPACE") {

    output.value += " ";

  } else {

    output.value += key;

  }

  output.focus();
}


// Physical keyboard support
document.addEventListener("keydown", event => {

  if (event.key === "Backspace") {
    pressKey("BACKSPACE");
    return;
  }

  if (event.key === "Enter") {
    pressKey("ENTER");
    return;
  }

  if (event.key === " ") {
    pressKey("SPACE");
    return;
  }

  const key = event.key.toUpperCase();

  const found = keys.find(
    button => button.dataset.key === key
  );

  if (found) {
    pressKey(key, found);
  }

});


// Clear text
clear.addEventListener("click", () => {
  output.value = "";
});


// Camera + AI
let stream = null;
let handLandmarker = null;
let running = false;
let lastVideoTime = -1;

let lastHover = null;
let pinchDown = false;


// Load MediaPipe
async function setupHandTracking() {

  const vision =
    await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
    );

  handLandmarker =
    await HandLandmarker.createFromOptions(
      vision,
      {

        baseOptions: {

          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

          delegate: "GPU"

        },

        runningMode: "VIDEO",

        numHands: 1,

        minHandDetectionConfidence: 0.55,

        minHandPresenceConfidence: 0.55,

        minTrackingConfidence: 0.55

      }
    );
}


// Start camera
async function startCamera() {

  try {

    if (!handLandmarker) {
      await setupHandTracking();
}
