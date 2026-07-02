// Video source management: webcam / OBS virtual camera via getUserMedia,
// or direct capture of the Desk View window via getDisplayMedia.

let currentStream = null;

function stopCurrentStream() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
}

async function attachStream(videoEl, stream) {
  stopCurrentStream();
  currentStream = stream;
  videoEl.srcObject = stream;
  await new Promise((resolve) => {
    if (videoEl.readyState >= 2) return resolve();
    videoEl.onloadeddata = () => resolve();
  });
  await videoEl.play();
  return stream;
}

export async function startCamera(videoEl, deviceId) {
  const constraints = {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  return attachStream(videoEl, stream);
}

export async function startWindowCapture(videoEl) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: false,
    video: { frameRate: { ideal: 30 } },
  });
  return attachStream(videoEl, stream);
}

// Device labels are only available after a permission grant.
export async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}

export function stopVideo(videoEl) {
  stopCurrentStream();
  videoEl.srcObject = null;
}

export function onStreamEnded(callback) {
  if (!currentStream) return;
  currentStream.getVideoTracks().forEach((t) => {
    t.addEventListener("ended", callback, { once: true });
  });
}
