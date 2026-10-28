'use strict';

/* ===== Configuración ===== */
const API_URL = 'https://rickandmortyapi.com/api/character';
const SEARCH_DELAY = 400; // ms de espera (debounce) al escribir en el buscador
const FAVORITES_KEY = 'rm_favorites'; // clave de Local Storage

// Imagen de respaldo (SVG embebido) por si falla la imagen original
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
    '<rect width="300" height="300" fill="#1a1d33"/>' +
    '<text x="150" y="185" font-size="120" text-anchor="middle" fill="#a855f7" ' +
    'font-family="sans-serif">?</text></svg>'
  );

// Corazones del botón de favoritos
const HEART_FILLED = '\u2665'; // ♥
const HEART_EMPTY = '\u2661';  // ♡

/* ===== Traducciones al español ===== */
const TRANSLATIONS = {
  status: { Alive: 'Vivo', Dead: 'Muerto', unknown: 'Desconocido' },
  gender: {
    Male: 'Masculino',
    Female: 'Femenino',
    Genderless: 'Sin género',
    unknown: 'Desconocido'
  }
};

// Clase CSS del punto de color según el estado de la API
const STATUS_CLASSES = {
  Alive: 'status-alive',
  Dead: 'status-dead',
  unknown: 'status-unknown'
};

/* ===== Estado de la aplicación ===== */
const state = {
  page: 1,
  totalPages: 1,
  loading: false,
  requestId: 0,          // identifica la petición más reciente
  controller: null,      // AbortController de la petición en curso
  searchTimer: null,     // temporizador del debounce
  results: [],           // personajes de la página actual (para los favoritos)
  favorites: [],         // favoritos guardados (datos mínimos)
  filters: {             // filtros ya aplicados (los que se envían a la API)
    name: '',
    status: '',
    species: '',
    gender: ''
  }
};

/* ===== Referencias al DOM ===== */
const els = {
  grid: document.getElementById('charactersGrid'),
  statusMessage: document.getElementById('statusMessage'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  resultsTitle: document.getElementById('resultsTitle'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  speciesFilter: document.getElementById('speciesFilter'),
  genderFilter: document.getElementById('genderFilter'),
  clearFilters: document.getElementById('clearFilters'),
  favCount: document.getElementById('favCount'),
  favoritesGrid: document.getElementById('favoritesGrid'),
  favEmpty: document.getElementById('favEmpty')
};

/* ===== Utilidades ===== */

// Traduce un valor; si no existe en el diccionario, devuelve el original
function translate(type, value) {
  return TRANSLATIONS[type][value] || value;
}

// Muestra "Desconocido" cuando la API devuelve "unknown"
function displayText(value) {
  return value === 'unknown' ? 'Desconocido' : value;
}

// Construye la URL con página y solo los filtros que tengan valor
function buildUrl(page) {
  const params = new URLSearchParams({ page });
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `${API_URL}?${params.toString()}`;
}

/* ===== Favoritos: datos y Local Storage ===== */

// Deja solo los datos mínimos que se guardan de cada personaje
function pickFavoriteData(character) {
  return {
    id: character.id,
    name: character.name,
    image: character.image,
    status: character.status,
    species: character.species,
    gender: character.gender
  };
}

// Lee los favoritos guardados; si el contenido está dañado, devuelve []
function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    return parsed.reduce((list, item) => {
      const id = Number(item && item.id);
      // Descarta ids inválidos y duplicados
      if (!Number.isInteger(id) || id < 1 || seen.has(id)) return list;
      seen.add(id);
      list.push({
        id,
        name: String(item.name || 'Sin nombre'),
        image: String(item.image || ''),
        status: String(item.status || 'unknown'),
        species: String(item.species || 'unknown'),
        gender: String(item.gender || 'unknown')
      });
      return list;
    }, []);
  } catch (error) {
    console.warn('Favoritos dañados, se empieza con una lista vacía:', error);
    return [];
  }
}

// Guarda los favoritos (puede fallar si el almacenamiento está lleno o bloqueado)
function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  } catch (error) {
    console.warn('No se pudieron guardar los favoritos:', error);
  }
}

function isFavorite(id) {
  return state.favorites.some((fav) => fav.id === Number(id));
}

// Agrega el personaje si no es favorito; si ya lo es, lo quita
function toggleFavorite(character) {
  if (isFavorite(character.id)) {
    removeFavorite(character.id);
  } else {
    state.favorites.push(pickFavoriteData(character));
    refreshFavorites();
  }
}

function removeFavorite(id) {
  state.favorites = state.favorites.filter((fav) => fav.id !== Number(id));
  refreshFavorites();
}

// Guarda y actualiza toda la interfaz relacionada con favoritos
function refreshFavorites() {
  saveFavorites();
  renderFavorites();
  syncHearts();
}

/* ===== Mensajes de estado ===== */

// Muestra un mensaje; "type" puede ser loading, empty o error
function showMessage(type, text, withRetry = false) {
  const box = document.createElement('div');
  box.className = `message ${type}`;

  const span = document.createElement('span');
  span.textContent = text;
  box.appendChild(span);

  if (withRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn';
    retryBtn.textContent = 'Reintentar';
    retryBtn.addEventListener('click', () => loadCharacters(state.page));
    box.appendChild(retryBtn);
  }

  els.statusMessage.replaceChildren(box);
}

function clearMessage() {
  els.statusMessage.replaceChildren();
}

/* ===== Creación de tarjetas ===== */

// Crea un párrafo "Etiqueta: valor" para la información de la tarjeta
function createInfoLine(label, value) {
  const p = document.createElement('p');
  p.className = 'card-info';

  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;

  p.appendChild(strong);
  p.appendChild(document.createTextNode(value));
  return p;
}

function createCharacterImage(character) {
  const img = document.createElement('img');
  img.className = 'card-img';
  img.alt = character.name;
  img.loading = 'lazy';
  // Si la imagen falla, usa la de respaldo (sin crear un bucle infinito)
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK_IMAGE;
  };
  img.src = character.image || FALLBACK_IMAGE;
  return img;
}

function createStatusLine(character) {
  const p = document.createElement('p');
  p.className = 'card-status';

  const dot = document.createElement('span');
  dot.className = `status-dot ${STATUS_CLASSES[character.status] || 'status-unknown'}`;

  const statusText = translate('status', character.status);
  const speciesText = displayText(character.species);

  p.appendChild(dot);
  p.appendChild(document.createTextNode(`${statusText} - ${speciesText}`));
  return p;
}

// Aplica el aspecto (activo o no) al botón de corazón
function setFavButtonState(btn, name, active) {
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', String(active));
  btn.setAttribute(
    'aria-label',
    active ? `Quitar de favoritos a ${name}` : `Agregar a favoritos a ${name}`
  );
  btn.textContent = active ? HEART_FILLED : HEART_EMPTY;
}

// Botón de favoritos; nace activo si el personaje ya es favorito
function createFavButton(character) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fav-btn';
  btn.dataset.id = character.id;
  setFavButtonState(btn, character.name, isFavorite(character.id));
  return btn;
}

function createCard(character) {
  const card = document.createElement('article');
  card.className = 'card';

  const body = document.createElement('div');
  body.className = 'card-body';

  const name = document.createElement('h3');
  name.className = 'card-name';
  name.textContent = character.name;

  body.appendChild(name);
  body.appendChild(createStatusLine(character));
  body.appendChild(createInfoLine('Género', translate('gender', character.gender)));
  body.appendChild(createInfoLine('Origen', displayText(character.origin.name)));
  body.appendChild(createInfoLine('Ubicación', displayText(character.location.name)));
  body.appendChild(createFavButton(character));

  card.appendChild(createCharacterImage(character));
  card.appendChild(body);
  return card;
}

// Tarjeta compacta para la sección de favoritos (sin origen ni ubicación)
function createFavoriteCard(fav) {
  const card = document.createElement('article');
  card.className = 'card card-compact';

  const body = document.createElement('div');
  body.className = 'card-body';

  const name = document.createElement('h3');
  name.className = 'card-name';
  name.textContent = fav.name;

  body.appendChild(name);
  body.appendChild(createStatusLine(fav));
  body.appendChild(createInfoLine('Género', translate('gender', fav.gender)));
  body.appendChild(createFavButton(fav)); // siempre activo: ya es favorito

  card.appendChild(createCharacterImage(fav));
  card.appendChild(body);
  return card;
}

/* ===== Renderizado ===== */

// Dibuja la lista de personajes dentro de #charactersGrid
function renderCharacters(list) {
  const fragment = document.createDocumentFragment();
  list.forEach((character) => fragment.appendChild(createCard(character)));
  els.grid.replaceChildren(fragment);
}

function clearGrid() {
  els.grid.replaceChildren();
}

// Dibuja la sección de favoritos, el contador y el mensaje de vacío
function renderFavorites() {
  const fragment = document.createDocumentFragment();
  state.favorites.forEach((fav) => fragment.appendChild(createFavoriteCard(fav)));
  els.favoritesGrid.replaceChildren(fragment);

  els.favCount.textContent = state.favorites.length;
  // Se usa style.display porque .message ya define display: flex
  els.favEmpty.style.display = state.favorites.length ? 'none' : '';
}

// Actualiza los corazones de los resultados según los favoritos actuales
function syncHearts() {
  els.grid.querySelectorAll('.fav-btn').forEach((btn) => {
    const card = btn.closest('.card');
    const name = card.querySelector('.card-name').textContent;
    setFavButtonState(btn, name, isFavorite(btn.dataset.id));
  });
}

// Actualiza el texto y el estado de los botones de paginación
function updatePagination() {
  els.pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= state.totalPages;
}

/* ===== Comunicación con la API ===== */

// Pide una página a la API. Devuelve null si no hay resultados (404)
async function fetchCharacters(page, signal) {
  const response = await fetch(buildUrl(page), { signal });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

  return response.json();
}

// Carga una página completa: cancela la petición anterior, pide datos y renderiza
async function loadCharacters(page = 1) {
  // Cancela la petición anterior si sigue en curso
  if (state.controller) state.controller.abort();
  const controller = new AbortController();
  state.controller = controller;

  const currentRequest = ++state.requestId;

  state.page = page;
  state.loading = true;
  updatePagination();
  showMessage('loading', 'Cargando personajes...');

  try {
    const data = await fetchCharacters(page, controller.signal);

    // Seguridad extra: ignora respuestas que ya no son las más recientes
    if (currentRequest !== state.requestId) return;

    if (data === null) {
      handleEmpty();
    } else {
      handleSuccess(data);
    }
  } catch (error) {
    // Una petición cancelada no es un error: ya hay otra en marcha
    if (error.name === 'AbortError') return;
    if (currentRequest !== state.requestId) return;
    handleError(error);
  } finally {
    if (currentRequest === state.requestId) {
      state.loading = false;
      updatePagination();
    }
  }
}

/* ===== Manejo de resultados ===== */

function handleSuccess(data) {
  state.totalPages = data.info.pages;
  state.results = data.results;
  renderCharacters(data.results); // los favoritos salen con el corazón activo
  clearMessage();
}

function handleEmpty() {
  state.page = 1;
  state.totalPages = 1;
  state.results = [];
  clearGrid();
  showMessage('empty', 'No se encontraron personajes con esos criterios.');
}

function handleError(error) {
  console.error('Error al cargar personajes:', error);
  clearGrid();        // no dejar tarjetas de otra página
  state.results = [];
  showMessage(
    'error',
    'No se pudo cargar la información. Revisa tu conexión e inténtalo de nuevo.',
    true
  );
}

/* ===== Búsqueda y filtros ===== */

// Cancela el debounce pendiente (si lo hay)
function cancelPendingSearch() {
  clearTimeout(state.searchTimer);
  state.searchTimer = null;
}

// Copia los valores actuales de los controles al estado
function readFiltersFromControls() {
  state.filters.name = els.searchInput.value.trim();
  state.filters.status = els.statusFilter.value;
  state.filters.species = els.speciesFilter.value;
  state.filters.gender = els.genderFilter.value;
}

// Aplica búsqueda + filtros combinados y vuelve a la página 1
function applyFilters() {
  cancelPendingSearch();
  readFiltersFromControls();
  loadCharacters(1);
}

// Búsqueda con debounce: espera a que el usuario deje de escribir
function handleSearchInput() {
  cancelPendingSearch();
  state.searchTimer = setTimeout(applyFilters, SEARCH_DELAY);
}

// Limpia buscador y filtros, y recarga la página 1
function clearAllFilters() {
  cancelPendingSearch();
  els.searchInput.value = '';
  els.statusFilter.value = '';
  els.speciesFilter.value = '';
  els.genderFilter.value = '';
  readFiltersFromControls();
  loadCharacters(1);
}

/* ===== Navegación entre páginas ===== */

function goToPage(page) {
  if (state.loading || page < 1 || page > state.totalPages) return;
  loadCharacters(page); // buildUrl conserva los filtros activos

  // Lleva al usuario al inicio de los resultados (sin animación si lo prefiere)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  els.resultsTitle.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start'
  });
}

/* ===== Eventos ===== */

// Delegación: clic en un corazón dentro de los resultados
function handleGridClick(event) {
  const btn = event.target.closest('.fav-btn');
  if (!btn) return;

  const character = state.results.find((c) => c.id === Number(btn.dataset.id));
  if (character) toggleFavorite(character);
}

// Delegación: clic en un corazón dentro de la sección de favoritos
function handleFavoritesClick(event) {
  const btn = event.target.closest('.fav-btn');
  if (!btn) return;

  const index = state.favorites.findIndex((f) => f.id === Number(btn.dataset.id));
  removeFavorite(btn.dataset.id);

  // Devuelve el foco al siguiente favorito (o al mensaje de vacío)
  const buttons = els.favoritesGrid.querySelectorAll('.fav-btn');
  if (buttons.length) {
    buttons[Math.max(0, Math.min(index, buttons.length - 1))].focus();
  } else {
    els.favEmpty.setAttribute('tabindex', '-1');
    els.favEmpty.focus();
  }
}

function bindEvents() {
  els.prevPage.addEventListener('click', () => goToPage(state.page - 1));
  els.nextPage.addEventListener('click', () => goToPage(state.page + 1));

  els.searchInput.addEventListener('input', handleSearchInput);
  els.statusFilter.addEventListener('change', applyFilters);
  els.speciesFilter.addEventListener('change', applyFilters);
  els.genderFilter.addEventListener('change', applyFilters);
  els.clearFilters.addEventListener('click', clearAllFilters);

  // Un solo listener por contenedor (delegación de eventos)
  els.grid.addEventListener('click', handleGridClick);
  els.favoritesGrid.addEventListener('click', handleFavoritesClick);
}

/* ===== Inicio ===== */
function init() {
  state.favorites = loadFavorites();
  renderFavorites();
  bindEvents();
  readFiltersFromControls();
  loadCharacters(1);
}

init();
