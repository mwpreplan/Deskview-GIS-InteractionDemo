// Leaflet map wrapper: applies gesture intents (pan/zoom/marker) and
// converts video-space coordinates to map container coordinates.

const START_CENTER = [40.7128, -74.006]; // NYC — dense area, good for demos
const START_ZOOM = 13;

export class MapController {
  constructor(containerId) {
    this.map = L.map(containerId, {
      zoomSnap: 0,        // allow fractional zoom for smooth pinch scaling
      zoomAnimation: false,
      inertia: false,
    }).setView(START_CENTER, START_ZOOM);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.markers = [];
    this.zoomAnchor = null; // { zoom } captured at zoom-gesture start
  }

  // Map a point in video space to container (screen) pixel space.
  videoToContainer(pt, videoW, videoH) {
    const size = this.map.getSize();
    return {
      x: (pt.x / videoW) * size.x,
      y: (pt.y / videoH) * size.y,
    };
  }

  pan(dxVideo, dyVideo, videoW, videoH) {
    const size = this.map.getSize();
    const dx = (dxVideo / videoW) * size.x;
    const dy = (dyVideo / videoH) * size.y;
    // Grab metaphor: hand moves right, the map content follows it.
    this.map.panBy([-dx, -dy], { animate: false });
  }

  beginZoom() {
    this.zoomAnchor = { zoom: this.map.getZoom() };
  }

  endZoom() {
    this.zoomAnchor = null;
  }

  zoomTo(scale, centerVideo, videoW, videoH) {
    if (!this.zoomAnchor) this.beginZoom();
    const target = this.zoomAnchor.zoom + Math.log2(Math.max(scale, 0.01));
    const clamped = Math.max(this.map.getMinZoom(), Math.min(this.map.getMaxZoom(), target));
    const c = this.videoToContainer(centerVideo, videoW, videoH);
    this.map.setZoomAround(L.point(c.x, c.y), clamped, { animate: false });
  }

  dropMarker(ptVideo, videoW, videoH) {
    const c = this.videoToContainer(ptVideo, videoW, videoH);
    const latlng = this.map.containerPointToLatLng(L.point(c.x, c.y));
    const marker = L.marker(latlng).addTo(this.map);
    marker.bindPopup(
      `📍 ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`
    );
    this.markers.push(marker);
    return latlng;
  }

  clearMarkers() {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}
