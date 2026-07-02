// Gesture interpretation. Consumes smoothed hands (video coordinates) each
// detection frame and emits map intents: pan, zoom, and marker drops.
//
// Gestures:
//   - One hand pinching (thumb tip + index tip together) and moving = pan
//   - Two hands pinching, changing the distance between them = zoom
//   - One hand pointing (index extended, others curled), held still = marker

// Pinch thresholds are ratios of pinch distance to hand size, with
// hysteresis so the pinch doesn't flicker on/off at the boundary.
const PINCH_ON_RATIO = 0.38;
const PINCH_OFF_RATIO = 0.55;

const MARKER_HOLD_MS = 1000;   // dwell time before a marker drops
const MARKER_COOLDOWN_MS = 1500;
const MARKER_MAX_DRIFT = 40;   // px (video space) fingertip may wander while dwelling

const KP = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Reference hand size: wrist to middle-finger knuckle.
function handSize(hand) {
  return dist(hand.keypoints[KP.WRIST], hand.keypoints[KP.MIDDLE_MCP]);
}

function pinchRatio(hand) {
  const size = handSize(hand);
  if (size < 1) return Infinity;
  return dist(hand.keypoints[KP.THUMB_TIP], hand.keypoints[KP.INDEX_TIP]) / size;
}

// Pointing = index extended away from the wrist while the other three
// fingertips stay close to it, and thumb+index are not pinched.
function isPointing(hand) {
  const kps = hand.keypoints;
  const size = handSize(hand);
  if (size < 1) return false;
  const wrist = kps[KP.WRIST];
  const indexReach = dist(kps[KP.INDEX_TIP], wrist) / size;
  const curled =
    dist(kps[KP.MIDDLE_TIP], wrist) / size < 1.35 &&
    dist(kps[KP.RING_TIP], wrist) / size < 1.25 &&
    dist(kps[KP.PINKY_TIP], wrist) / size < 1.2;
  return indexReach > 1.7 && curled && pinchRatio(hand) > PINCH_OFF_RATIO;
}

export class GestureEngine {
  constructor() {
    this.pinchState = new Map(); // handedness -> bool
    this.lastPanPoint = null;
    this.zoomStartDist = null;
    this.dwell = null; // { x, y, startedAt }
    this.lastMarkerAt = 0;
  }

  reset() {
    this.pinchState.clear();
    this.lastPanPoint = null;
    this.zoomStartDist = null;
    this.dwell = null;
  }

  isPinching(hand) {
    const key = hand.handedness || "unknown";
    const ratio = pinchRatio(hand);
    const was = this.pinchState.get(key) || false;
    const now = was ? ratio < PINCH_OFF_RATIO : ratio < PINCH_ON_RATIO;
    this.pinchState.set(key, now);
    return now;
  }

  // Returns { gesture, pan?, zoom?, marker?, dwellProgress?, pinchPoints }
  update(hands, timestamp = performance.now()) {
    const result = { gesture: "idle", pinchPoints: [] };

    const pinching = [];
    for (const hand of hands) {
      if (this.isPinching(hand)) {
        const p = midpoint(
          hand.keypoints[KP.THUMB_TIP],
          hand.keypoints[KP.INDEX_TIP]
        );
        pinching.push({ hand, point: p });
        result.pinchPoints.push(p);
      }
    }

    if (pinching.length >= 2) {
      // Two-hand pinch: zoom around the midpoint of the two pinch points.
      this.dwell = null;
      this.lastPanPoint = null;
      const [a, b] = pinching;
      const d = dist(a.point, b.point);
      const center = midpoint(a.point, b.point);
      if (this.zoomStartDist == null) this.zoomStartDist = d;
      result.gesture = "zoom";
      result.zoom = { scale: d / this.zoomStartDist, center };
      return result;
    }
    this.zoomStartDist = null;

    if (pinching.length === 1) {
      // One-hand pinch drag: pan.
      this.dwell = null;
      const p = pinching[0].point;
      if (this.lastPanPoint) {
        result.pan = { dx: p.x - this.lastPanPoint.x, dy: p.y - this.lastPanPoint.y };
      }
      this.lastPanPoint = p;
      result.gesture = "pan";
      return result;
    }
    this.lastPanPoint = null;

    // Marker: pointing pose held still.
    const pointer = hands.find((h) => isPointing(h));
    if (pointer && timestamp - this.lastMarkerAt > MARKER_COOLDOWN_MS) {
      const tip = pointer.keypoints[KP.INDEX_TIP];
      if (!this.dwell || dist(this.dwell, tip) > MARKER_MAX_DRIFT) {
        this.dwell = { x: tip.x, y: tip.y, startedAt: timestamp };
      }
      const progress = (timestamp - this.dwell.startedAt) / MARKER_HOLD_MS;
      result.gesture = "point";
      result.dwellProgress = Math.min(progress, 1);
      result.dwellPoint = { x: tip.x, y: tip.y };
      if (progress >= 1) {
        result.marker = { x: tip.x, y: tip.y };
        this.lastMarkerAt = timestamp;
        this.dwell = null;
      }
      return result;
    }
    this.dwell = null;

    if (hands.length > 0) result.gesture = "hands";
    return result;
  }
}
