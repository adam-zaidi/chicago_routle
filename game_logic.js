// --- Wordle-style game state + helpers ---
const GUESSES_MAX = 5;
// make guesses available to map_display.js
if (!Array.isArray(window.guesses)) window.guesses = [];
const guesses = window.guesses; // keep a reference to the same array
let routeIndexByName = new Map();       // name -> id
let routeIndexById = new Map();         // id   -> name

// game end flag
if (typeof window.GAME_OVER === 'undefined') window.GAME_OVER = false;

function showPopup(message, isSuccess) {
  // remove any existing popup
  const old = document.getElementById('routle-popup');
  if (old) old.remove();

  // anchor over the map
  const mapEl = document.getElementById('map');
  const popup = document.createElement('div');
  popup.id = 'routle-popup';
  popup.textContent = message;
  // inline styles so we don't touch CSS file
  Object.assign(popup.style, {
    position: 'fixed',
    left: '50%',
    top: '20%',
    transform: 'translate(-50%, -50%)',
    padding: '12px 16px',
    background: '#ffffff',
    color: isSuccess ? '#0f7a28' : '#7a0f0f',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    fontWeight: '700',
    zIndex: '2000'
  });
  document.body.appendChild(popup);
}

function setGuessBars() {
  const bars = document.querySelectorAll('.guess-bar');
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const g = guesses[i];
    if (g) {
      bar.textContent = g.name;
      bar.style.opacity = 1; // bars always visible
      // color by correctness
      if (g.correct === true) {
        bar.style.color = '#0f7a28'; // green
      } else if (g.correct === false) {
        bar.style.color = '#b91c1c'; // light red
      } else {
        bar.style.color = '';
      }
    } else {
      bar.textContent = '';
      bar.style.opacity = 1;
      bar.style.color = '';
    }
  }
}

function handleGuessSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('routeSearch');
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;

  // accept either a route name or an exact route id
  let id = routeIndexByName.get(raw);
  let name = raw;
  if (!id && routeIndexById.has(raw)) {
    id = raw; name = routeIndexById.get(raw);
  }
  if (!id) {
    // case-insensitive name match
    const lowered = raw.toLowerCase();
    for (const [k, v] of routeIndexByName.entries()) {
      if (k.toLowerCase() === lowered) { id = v; name = k; break; }
    }
  }
  if (!id) {
    input.setCustomValidity('Pick a route from the list');
    input.reportValidity();
    setTimeout(() => input.setCustomValidity(''), 1200);
    return;
  }

  if (guesses.length >= GUESSES_MAX || window.GAME_OVER) return;  // already finished

  // Record the guess and update the opacity bars — do NOT redraw the map
  if (!Array.isArray(window.guesses)) window.guesses = [];
  const isCorrect = (window.TARGET_ROUTE && String(id) === String(window.TARGET_ROUTE.id));
  window.guesses.push({ id, name, correct: isCorrect });
  setGuessBars();
  input.value = '';
  if (typeof window.updateMapOpacity === 'function') {
    window.updateMapOpacity();
  }

  // Winning / losing logic
  if (isCorrect) {
    window.GAME_OVER = true;
    const correctName = window.TARGET_ROUTE ? window.TARGET_ROUTE.name : name;
    showPopup(`You got it! "${correctName}" was correct!`, true);
    return;
  }

  if (window.guesses.length >= GUESSES_MAX) {
    window.GAME_OVER = true;
    const correctName = window.TARGET_ROUTE ? window.TARGET_ROUTE.name : '(unknown)';
    showPopup(`Oops, the correct answer was "${correctName}".`, false);
  }
}

// called once after GeoJSON loads (see map_display.js)
function setupGameRoutes(routes) {
  const dataList = document.getElementById('routesList');
  routeIndexByName.clear();
  routeIndexById.clear();
  if (dataList) {
    dataList.innerHTML = routes.map(r => {
      routeIndexByName.set(r.name, r.id);
      routeIndexById.set(r.id, r.name);
      return `<option value="${r.name}"></option>`;
    }).join('');
  }

  const form = document.getElementById('guessForm');
  if (form) form.addEventListener('submit', handleGuessSubmit);

  setGuessBars();

  // reset end state on page load
  window.GAME_OVER = false;
}