# Desk View GIS — Interaction Demo

A personal portfolio demo: control an OpenStreetMap interface with hand
gestures detected on Apple's **Desk View** camera feed. Hands are tracked with
[ml5.js HandPose](https://docs.ml5js.org/#/reference/handpose) and drive a
[Leaflet](https://leafletjs.com/) map — pinch to pan, two-hand pinch to zoom,
point-and-hold to drop a marker.

Inspired by [map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/ol/examples),
but driven by the top-down Desk View of your hands on your desk.

## Running it

No build step. Serve the folder over localhost (camera APIs require a secure
context):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Feeding Desk View into the browser

Two options, pick either on the start screen:

1. **Capture the Desk View window (recommended, no OBS).** Open the macOS
   Desk View app (or start Desk View from FaceTime video effects), click
   *"Capture the Desk View window"*, and pick the Desk View window in the
   browser's share dialog. This pipes the window straight in via
   `getDisplayMedia`.
2. **OBS Virtual Camera.** Capture the Desk View window in OBS, start the
   Virtual Camera, click *"Use a camera"*, and pick *OBS Virtual Camera* from
   the dropdown.

## Gestures

| Gesture | Action |
| --- | --- |
| 🤏 Pinch (one hand) + drag | Pan the map |
| 🤏🤏 Pinch with both hands, move apart/together | Zoom in/out |
| 👉 Point (index only) + hold ~1s | Drop a marker at the fingertip |

A picture-in-picture monitor (bottom right) shows the live feed with tracking
overlay, and translucent "ghost hands" are drawn over the map so you always
know where your hands are. The 🎥 *Camera view* button switches to a
full-screen tracking view for debugging; 🪞 *Mirror* flips the feed if
movement feels backwards.

## Project phases (Crawl → Walk → Run)

- **Crawl** — live feed with permission flow + HandPose tracking nodes/lines ✅
- **Walk** — OSM map, PiP monitor, pinch pan/zoom, ghost hands ✅
- **Run** — marker-drop gesture ✅

Project docs live in Notion:
[Deskview-GIS-InteractionDemo](https://app.notion.com/p/391c909262f980e18cebfb58c7b2c03a)
