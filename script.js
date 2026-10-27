'use strict';

/* ===== Configuración ===== */
const API_URL = 'https://rickandmortyapi.com/api/character';

// Imagen de respaldo (SVG embebido) por si falla la imagen original
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
    '<rect width="300" height="300" fill="#1a1d33"/>' +
    '<text x="150" y="185" font-size="120" text-anchor="middle" fill="#a855f7" ' +
    'font-family="sans-serif">?</text></svg>'
  );

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
  requestId: 0,        // evita que una respuesta vieja pise a una más reciente
  filters: {           // se usarán más adelante para búsqueda y filtros
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
  resultsTitle: document.getElementById('resultsTitle')
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

// Construye la URL de la API con página y filtros activos
function buildUrl(page) {
  const params = new URLSearchParams({ page });
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `${API_URL}?${params.toString()}`;
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
  img.src = character.image;
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

// Botón de favoritos (todavía sin funcionalidad)
function createFavButton(character) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fav-btn';
  btn.dataset.id = character.id;
  btn.setAttribute('aria-label', `Agregar a favoritos a ${character.name}`);
  btn.setAttribute('aria-pressed', 'false');
  btn.textContent = '\u2665';
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

// Actualiza el texto y el estado de los botones de paginación
function updatePagination() {
  els.pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;
  els.prevPage.disabled = state.loading || state.page <= 1;
  els.nextPage.disabled = state.loading || state.page >= state.totalPages;
}

/* ===== Comunicación con la API ===== */

// Pide una página a la API. Devuelve null si no hay resultados (404)
async function fetchCharacters(page) {
  const response = await fetch(buildUrl(page));

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

  return response.json();
}

// Carga una página completa: pide datos, muestra estados y renderiza
async function loadCharacters(page = 1) {
  const currentRequest = ++state.requestId;

  state.page = page;
  state.loading = true;
  updatePagination();
  showMessage('loading', 'Cargando personajes...');

  try {
    const data = await fetchCharacters(page);

    // Ignora respuestas antiguas si ya se lanzó otra petición
    if (currentRequest !== state.requestId) return;

    if (data === null) {
      handleEmpty();
    } else {
      handleSuccess(data);
    }
  } catch (error) {
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
  renderCharacters(data.results);
  clearMessage();
}

function handleEmpty() {
  state.page = 1;
  state.totalPages = 1;
  clearGrid();
  showMessage('empty', 'No se encontraron personajes con esos criterios.');
}

function handleError(error) {
  console.error('Error al cargar personajes:', error);
  showMessage(
    'error',
    'No se pudo cargar la información. Revisa tu conexión e inténtalo de nuevo.',
    true
  );
}

/* ===== Navegación entre páginas ===== */

function goToPage(page) {
  if (state.loading || page < 1 || page > state.totalPages) return;
  loadCharacters(page);
  // Lleva al usuario al inicio de los resultados
  els.resultsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindEvents() {
  els.prevPage.addEventListener('click', () => goToPage(state.page - 1));
  els.nextPage.addEventListener('click', () => goToPage(state.page + 1));
}

/* ===== Inicio ===== */
function init() {
  bindEvents();
  loadCharacters(1);
}

init();
