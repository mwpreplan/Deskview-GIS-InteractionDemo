// ml5.js HandPose wrapper: detection lifecycle, keypoint smoothing,
// and skeleton drawing helpers shared by the overlay and ghost canvases.

// Standard 21-keypoint hand skeleton connections (MediaPipe Hands topology).
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],        // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],        // index
  [5, 9], [9, 10], [10, 11], [11, 12],   // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20],// pinky
  [0, 17],                               // palm base
];

// EMA smoothing factor; higher = snappier, lower = smoother.
const SMOOTHING = 0.55;

let handPose = null;
let latestHands = [];
let smoothedByHand = new Map(); // handedness -> keypoints[]

export function loadModel() {
  return new Promise((resolve, reject) => {
    try {
      handPose = ml5.handPose(
        { maxHands: 2, runtime: "tfjs", modelType: "full", flipped: false },
        () => resolve(handPose)
      );
    } catch (err) {
      reject(err);
    }
  });
}

export function startDetection(videoEl, onHands) {
  handPose.detectStart(videoEl, (results) => {
    latestHands = smoothHands(results || []);
    onHands(latestHands);
  });
}

export function stopDetection() {
  if (handPose) handPose.detectStop();
  latestHands = [];
  smoothedByHand.clear();
}

export function getHands() {
  return latestHands;
}

function smoothHands(hands) {
  const seen = new Set();
  const out = hands.map((hand) => {
    const key = hand.handedness || "unknown";
    seen.add(key);
    const prev = smoothedByHand.get(key);
    let keypoints;
    if (prev && prev.length === hand.keypoints.length) {
      keypoints = hand.keypoints.map((kp, i) => ({
        ...kp,
        x: prev[i].x + SMOOTHING * (kp.x - prev[i].x),
        y: prev[i].y + SMOOTHING * (kp.y - prev[i].y),
      }));
    } else {
      keypoints = hand.keypoints.map((kp) => ({ ...kp }));
    }
    smoothedByHand.set(key, keypoints);
    return { ...hand, keypoints };
  });
  // Drop smoothing state for hands that left the frame.
  for (const key of smoothedByHand.keys()) {
    if (!seen.has(key)) smoothedByHand.delete(key);
  }
  return out;
}

// Draw hands onto a canvas. `transform` maps video coords -> canvas coords.
export function drawHands(ctx, hands, transform, options = {}) {
  const {
    alpha = 1,
    lineWidth = 2,
    nodeRadius = 4,
    colorRight = "#38bdf8",
    colorLeft = "#f472b6",
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";

  for (const hand of hands) {
    const color = hand.handedness === "Left" ? colorLeft : colorRight;
    const pts = hand.keypoints.map(transform);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();

    ctx.fillStyle = color;
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
