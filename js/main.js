// Orchestration: video source -> HandPose detection -> gesture intents ->
// Leaflet map, plus all overlay rendering (ghost hands, PiP, camera view).

import { startCamera, startWindowCapture, listCameras, stopVideo, onStreamEnded } from "./videoSource.js";
import { loadModel, startDetection, stopDetection, drawHands } from "./handTracking.js";
import { GestureEngine } from "./gestures.js";
import { MapController } from "./mapController.js";

const el = (id) => document.getElementById(id);

const startScreen = el("start-screen");
const app = el("app");
const videoSource = el("video-source");
const videoPip = el("video-pip");
const videoMain = el("video-main");
const ghostCanvas = el("ghost-canvas");
const overlayPip = el("overlay-pip");
const overlayMain = el("overlay-main");
const cameraView = el("camera-view");
const hudGesture = el("hud-gesture");
const startStatus = el("start-status");
const cameraPicker = el("camera-picker");
const cameraSelect = el("camera-select");

const state = {
  mirrored: false,
  cameraViewMode: false,
  hands: [],           // mirrored-adjusted hands in video coords
  gesture: { gesture: "idle", pinchPoints: [] },
  markerFlashUntil: 0,
  prevGesture: "idle",
  running: false,
};

const gestureEngine = new GestureEngine();
let mapController = null;
let modelReady = null;

// ---------- Start screen / source selection ----------

function setStartStatus(msg, isError = false) {
  startStatus.textContent = msg;
  startStatus.classList.toggle("error", isError);
}

el("btn-capture-window").addEventListener("click", async () => {
  try {
    setStartStatus("Pick the Desk View window in the share dialog…");
    await startWindowCapture(videoSource);
    await enterApp();
  } catch (err) {
    setStartStatus(`Window capture failed: ${err.message}`, true);
  }
});

el("btn-use-camera").addEventListener("click", async () => {
  try {
    setStartStatus("Requesting camera permission…");
    await startCamera(videoSource);
    // Labels only populate after permission; offer a picker for OBS etc.
    const cams = await listCameras();
    if (cams.length > 1) {
      cameraPicker.classList.remove("hidden");
      cameraSelect.innerHTML = cams
        .map((c) => `<option value="${c.deviceId}">${c.label || "Camera"}</option>`)
        .join("");
      setStartStatus("Using default camera — switch below, or continue in 2s…");
      setTimeout(() => enterApp(), 2000);
    } else {
      await enterApp();
    }
  } catch (err) {
    setStartStatus(`Camera failed: ${err.message}`, true);
  }
});

cameraSelect.addEventListener("change", async () => {
  try {
    setStartStatus("Switching camera…");
    await startCamera(videoSource, cameraSelect.value);
    await enterApp();
  } catch (err) {
    setStartStatus(`Camera failed: ${err.message}`, true);
  }
});

// ---------- App lifecycle ----------

async function enterApp() {
  if (state.running) return;
  state.running = true;

  setStartStatus("Loading hand-tracking model…");
  await modelReady;

  // PiP and camera view render the same MediaStream without re-capturing.
  videoPip.srcObject = videoSource.srcObject;
  videoMain.srcObject = videoSource.srcObject;

  startScreen.classList.add("hidden");
  app.classList.remove("hidden");

  if (!mapController) mapController = new MapController("map");
  mapController.invalidateSize();

  gestureEngine.reset();
  startDetection(videoSource, onHands);
  onStreamEnded(handleSourceLost);
  requestAnimationFrame(renderLoop);
}

function handleSourceLost() {
  leaveApp("Video source ended — pick a new one.");
}

function leaveApp(message = "") {
  state.running = false;
  stopDetection();
  stopVideo(videoSource);
  videoPip.srcObject = null;
  videoMain.srcObject = null;
  app.classList.add("hidden");
  startScreen.classList.remove("hidden");
  cameraPicker.classList.add("hidden");
  setStartStatus(message);
}

// ---------- Detection -> gestures -> map ----------

function mirrorHands(hands, vw) {
  if (!state.mirrored) return hands;
  return hands.map((hand) => ({
    ...hand,
    keypoints: hand.keypoints.map((kp) => ({ ...kp, x: vw - kp.x })),
  }));
}

function onHands(rawHands) {
  const vw = videoSource.videoWidth;
  const vh = videoSource.videoHeight;
  if (!vw || !vh || !state.running) return;

  state.hands = mirrorHands(rawHands, vw);
  const result = gestureEngine.update(state.hands);
  state.gesture = result;

  // Zoom anchor bookkeeping across gesture transitions.
  if (result.gesture === "zoom" && state.prevGesture !== "zoom") {
    mapController.beginZoom();
  } else if (result.gesture !== "zoom" && state.prevGesture === "zoom") {
    mapController.endZoom();
  }
  state.prevGesture = result.gesture;

  if (state.cameraViewMode) return; // Crawl mode: tracking only, no map control

  if (result.pan) {
    mapController.pan(result.pan.dx, result.pan.dy, vw, vh);
  } else if (result.zoom) {
    mapController.zoomTo(result.zoom.scale, result.zoom.center, vw, vh);
  } else if (result.marker) {
    mapController.dropMarker(result.marker, vw, vh);
    state.markerFlashUntil = performance.now() + 1200;
  }
}

// ---------- Rendering ----------

function sizeCanvas(canvas, w, h) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

// Stretch video coords onto a w×h canvas (matches MapController mapping).
function stretchTransform(vw, vh, w, h) {
  return (kp) => ({ x: (kp.x / vw) * w, y: (kp.y / vh) * h });
}

// object-fit: cover mapping for the PiP overlay.
function coverTransform(vw, vh, w, h) {
  const scale = Math.max(w / vw, h / vh);
  const ox = (w - vw * scale) / 2;
  const oy = (h - vh * scale) / 2;
  return (kp) => ({ x: kp.x * scale + ox, y: kp.y * scale + oy });
}

function drawDwellRing(ctx, pt, progress) {
  ctx.save();
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 26, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPinchDots(ctx, points, transform) {
  ctx.save();
  ctx.fillStyle = "#facc15";
  for (const p of points) {
    const t = transform(p);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderLoop() {
  if (!state.running) return;

  const vw = videoSource.videoWidth || 1280;
  const vh = videoSource.videoHeight || 720;
  const { hands, gesture } = state;

  // Ghost hands over the map.
  sizeCanvas(ghostCanvas, window.innerWidth, window.innerHeight);
  const gctx = ghostCanvas.getContext("2d");
  gctx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
  if (!state.cameraViewMode) {
    const t = stretchTransform(vw, vh, ghostCanvas.width, ghostCanvas.height);
    drawHands(gctx, hands, t, { alpha: 0.35, lineWidth: 6, nodeRadius: 7 });
    drawPinchDots(gctx, gesture.pinchPoints, t);
    if (gesture.dwellPoint) drawDwellRing(gctx, t(gesture.dwellPoint), gesture.dwellProgress);
  }

  // PiP monitor overlay.
  const pipW = overlayPip.clientWidth, pipH = overlayPip.clientHeight;
  sizeCanvas(overlayPip, pipW, pipH);
  const pctx = overlayPip.getContext("2d");
  pctx.clearRect(0, 0, pipW, pipH);
  drawHands(pctx, hands, coverTransform(vw, vh, pipW, pipH), { lineWidth: 2, nodeRadius: 3 });

  // Full camera view (Crawl / debug mode).
  if (state.cameraViewMode) {
    const scale = Math.min(window.innerWidth / vw, window.innerHeight / vh);
    sizeCanvas(overlayMain, Math.round(vw * scale), Math.round(vh * scale));
    const mctx = overlayMain.getContext("2d");
    mctx.clearRect(0, 0, overlayMain.width, overlayMain.height);
    const t = (kp) => ({ x: kp.x * scale, y: kp.y * scale });
    drawHands(mctx, hands, t, { lineWidth: 3, nodeRadius: 5 });
    drawPinchDots(mctx, gesture.pinchPoints, t);
    if (gesture.dwellPoint) drawDwellRing(mctx, t(gesture.dwellPoint), gesture.dwellProgress);
  }

  updateHud();
  requestAnimationFrame(renderLoop);
}

function updateHud() {
  const g = state.gesture;
  let text;
  if (performance.now() < state.markerFlashUntil) {
    text = "📍 Marker dropped!";
  } else if (g.gesture === "pan") {
    text = "🤏 Panning";
  } else if (g.gesture === "zoom") {
    text = "🔍 Zooming";
  } else if (g.gesture === "point") {
    text = `👉 Hold to drop marker… ${Math.round((g.dwellProgress || 0) * 100)}%`;
  } else if (g.gesture === "hands") {
    text = "✋ Hands detected — pinch to pan, point to drop a marker";
  } else {
    text = "✋ Show your hands to the camera";
  }
  if (hudGesture.textContent !== text) hudGesture.textContent = text;
}

// ---------- Toolbar ----------

el("btn-mode").addEventListener("click", (e) => {
  state.cameraViewMode = !state.cameraViewMode;
  cameraView.classList.toggle("hidden", !state.cameraViewMode);
  e.target.textContent = state.cameraViewMode ? "🗺️ Map view" : "🎥 Camera view";
});

el("btn-mirror").addEventListener("click", (e) => {
  state.mirrored = !state.mirrored;
  videoPip.classList.toggle("flipped", state.mirrored);
  videoMain.classList.toggle("flipped", state.mirrored);
  gestureEngine.reset();
  e.target.textContent = `🪞 Mirror: ${state.mirrored ? "on" : "off"}`;
});

el("btn-clear-markers").addEventListener("click", () => {
  mapController.clearMarkers();
});

el("btn-change-source").addEventListener("click", () => {
  leaveApp("Pick a new video source.");
});

window.addEventListener("resize", () => {
  if (mapController) mapController.invalidateSize();
});

// ---------- Boot ----------

if (!navigator.mediaDevices?.getUserMedia) {
  setStartStatus("This browser doesn't support camera access.", true);
} else {
  modelReady = loadModel().catch((err) => {
    setStartStatus(`Failed to load hand-tracking model: ${err.message}`, true);
    throw err;
  });
}
