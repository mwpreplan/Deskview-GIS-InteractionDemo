# Deskview-GIS-InteractionDemo

Personal portfolio demo: gesture control of an OpenStreetMap UI from Apple
Desk View video, using ml5.js HandPose + Leaflet. Static site, no build step,
no dependencies beyond CDN scripts (Leaflet 1.9.4, ml5 v1).

## Source-of-truth docs (Notion)

- Database: https://app.notion.com/p/391c909262f980e18cebfb58c7b2c03a
- "Project Information" (background, inspiration): page `391c9092-62f9-80b9-b25b-cccb412b2dbf`
- "Project Approach and Claude Instructions" (Crawl/Walk/Run phases): page `391c9092-62f9-8057-ba21-e9af022f0833`

Consult these before changing scope; the phases (Crawl → Walk → Run) define
the feature checkpoints.

Docs in the database with Category = "Agents" are Claude Code agent designs
(see the "Agent Template" page). Lifecycle is tracked in the database's
"Agent Status" select property: when a doc is `Ready`, sync it into this
repo as `.claude/agents/<agent-name>.md`, then set the property to `Synced`.
If a sync fails or the doc is inconsistent, set it to `Issue` and write a
short blurb in the "Sync note" property explaining what went wrong.

The "Ideas & Feedback" doc (Category "Ideas") is the single idea-capture
inbox. On "triage the ideas doc": move each Inbox item to Now (clear, worth
it, next), Later (needs thinking), the owning agent doc's Backlog, or delete
it — and sharpen each item's "why/intent" line while triaging (the user
wants the reasoning preserved for portfolio documentation). Images backing
an implementable idea get copied into design/inspo/ at triage. When work
ships, move its item to the doc's Shipped section with why + outcome.

## Architecture

- `index.html` — start screen (source picker), map, PiP, HUD, toolbar
- `js/videoSource.js` — getUserMedia (webcam/OBS virtual cam) and
  getDisplayMedia (direct Desk View window capture)
- `js/handTracking.js` — ml5 handPose lifecycle, EMA keypoint smoothing,
  skeleton drawing
- `js/gestures.js` — pure gesture interpretation (video coords in, intents
  out): one-hand pinch = pan, two-hand pinch = zoom, point-and-hold = marker
- `js/mapController.js` — Leaflet wrapper; converts video coords → container
  px → latlng; fractional zoom (`zoomSnap: 0`)
- `js/main.js` — orchestration and all canvas rendering (ghost hands over the
  map, PiP overlay, full camera view)

Coordinate convention: gesture logic runs in **video pixel space**; mirroring
is applied to keypoints before gestures so map/ghost/PiP stay consistent.

## Run / verify

Serve statically over localhost (secure context needed for camera):
`python3 -m http.server 8080`. Camera/hand features need a real camera and
hands — verify structure and console errors headlessly, gestures manually.
