// map_display.js

// 1) Map init (locked view; SVG renderer)
const map = L.map('map', {
  dragging: false,
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  touchZoom: false,
  renderer: L.svg()
}).setView([41.88, -87.63], 11);

// 2) Plain no-labels basemap with adjustable opacity
let BASE_OPACITY = 0; // tweak 0.1–1
// Plain no-labels basemap (starts hidden at opacity 0)
if (L.tileLayer && L.tileLayer.provider) {
  window.BASE_LAYER = L.tileLayer.provider('CartoDB.PositronNoLabels', { opacity: 0 }).addTo(map);
} else {
  window.BASE_LAYER = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
    { subdomains: 'abcd', opacity: 0, attribution: '© OpenStreetMap contributors © CARTO' }
  ).addTo(map);
}

// 3) Data state
let ALL = null;
let currentLayer = null;

// 4) Draw the chosen (target) route and fit
function drawRoute(routeId) {
  if (!ALL) return;
  if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }

  let matchCount = 0;
  currentLayer = L.geoJSON(ALL, {
    // ⬇️ Adjust keys if your GeoJSON uses different property names
    filter: f => {
      const ok = String(f.properties.route) === String(routeId);
      if (ok) matchCount++;
      return ok;
    },
    style: {
      color: '#2A518A',
      weight: 5,
      lineCap: 'round',
      lineJoin: 'round'
    }
  }).addTo(map);

  const b = currentLayer.getBounds && currentLayer.getBounds();
  if (b && b.isValid()) {
    map.fitBounds(b, { padding: [5, 5] });
  } else {
    console.warn('No valid geometry for route', routeId, '(matched:', matchCount, ')');
  }
}

const DATA_URL = new URL('./CTA_-_Bus_Routes_20251006.geojson', window.location.href);

// 5) Load routes, pick ONE random target, draw it once
fetch(DATA_URL)
  .then(r => r.json())
  .then(geo => {
    ALL = geo;

    // Build unique route list from properties (change keys if needed)
    const routes = Array.from(
      new Map(
        geo.features.map(f => [
          String(f.properties.route), // <- route id key
          { id: String(f.properties.route), name: String(f.properties.name) } // <- display name key
        ])
      ).values()
    );

    // Expose a single target for this page load and draw it
    if (routes.length) {
      const choice = routes[Math.floor(Math.random() * routes.length)];
      window.TARGET_ROUTE = { id: choice.id, name: choice.name };
      drawRoute(choice.id);
      if (typeof window.updateMapOpacity === 'function') window.updateMapOpacity();
      console.log('Target route:', choice.name);
      const debugBox = document.getElementById('debug-target');
if (debugBox) debugBox.textContent = `Target route (debug): ${choice.name}`;
    } else {
      console.error('No routes found in GeoJSON.');
    }

    // If you added game_logic.js, wire up autocomplete
    if (typeof setupGameRoutes === 'function') setupGameRoutes(routes);
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));

// Update basemap opacity based on how many guesses have been made
window.updateMapOpacity = function () {
  if (!window.BASE_LAYER) return;
  // `guesses` is managed by game logic; if absent, treat as 0
  const n = (Array.isArray(window.guesses) ? window.guesses.length : 0);
  const op = Math.max(0, Math.min(1, n * 0.2)); // 0, .2, .4, .6, .8, 1
  window.BASE_LAYER.setOpacity(op);
};