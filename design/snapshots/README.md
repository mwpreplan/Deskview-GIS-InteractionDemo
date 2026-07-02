# UI Snapshots

Date-stamped screenshots of the key screens, for tracking design evolution
over time. Capture a new set before/after any visual change (the design
agent should treat this as part of its definition of done).

Screens, captured at 1280×800:

- `*-start-screen.png` — splash / camera-source picker
- `*-map-view.png` — map with HUD, toolbar, and PiP monitor
- `*-camera-view.png` — full-screen tracking (Crawl/debug) mode

Note: the camera content in these shots is Chrome's synthetic test-pattern
device (green pattern), not a real Desk View feed — the UI chrome is what's
being tracked here, not the video.

## Recapture

```sh
# 1. serve the app
python3 -m http.server 8080 --bind 127.0.0.1
# 2. from a folder with puppeteer-core installed (npm i puppeteer-core):
node capture.js <path-to-this-folder> $(date +%Y-%m-%d)
```

Or just ask Claude Code to "recapture the UI snapshots".
