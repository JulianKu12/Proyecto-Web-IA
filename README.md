# Rick and Morty Explorer

Aplicación web para explorar los personajes de la serie *Rick and Morty*. Permite buscar por nombre, filtrar por estado, especie y género, navegar entre páginas, guardar personajes favoritos y cambiar entre modo claro y oscuro. Los datos se obtienen en tiempo real de la API pública [rickandmortyapi.com](https://rickandmortyapi.com).

El proyecto está hecho solo con HTML, CSS y JavaScript puro (sin frameworks ni librerías) y se desarrolló con ayuda de un asistente de IA (Claude). Los prompts usados y lo que aprendí se documentan más abajo.

## Aplicación publicada

**Ver la app:** https://julianku12.github.io/Proyecto-Web-IA/

**Repositorio:** https://github.com/julianku12/Proyecto-Web-IA

## Tecnologías usadas

| Tecnología | Para qué se usó |
|---|---|
| HTML5 | Estructura semántica de la página (`header`, `main`, `section`, `nav`, `footer`) y accesibilidad (`alt`, `aria-label`) |
| CSS3 | Variables CSS, CSS Grid responsive, media queries (600px y 900px), animaciones y tema claro/oscuro |
| JavaScript (ES6+) | `async/await`, creación de elementos con `createElement`, delegación de eventos, debounce y `AbortController` |
| Fetch API | Consumir la API de Rick and Morty |
| Local Storage | Guardar los favoritos (`rm_favorites`) y el tema elegido (`rm_theme`) |
| GitHub Pages | Publicar la aplicación en internet |
| Google Fonts | Fuentes Orbitron (títulos) e Inter (texto) |

## Funcionalidades

- Listado de personajes con tarjetas que muestran imagen, nombre, estado (con punto de color), especie, género, origen y ubicación. Los valores se traducen al español (Vivo, Muerto, Desconocido, Masculino, Femenino, Sin género).
- Búsqueda por nombre con *debounce*: espera a que dejes de escribir antes de consultar la API.
- Filtros por estado, especie y género, que se pueden combinar entre sí y con la búsqueda.
- Botón "Limpiar filtros" que restablece el buscador y los tres filtros.
- Paginación ("Página X de Y") que conserva los filtros activos; los botones se deshabilitan cuando no hay página anterior o siguiente.
- Mensajes de estado: "Cargando personajes...", "No se encontraron personajes con esos criterios." y error de conexión con botón "Reintentar".
- Cancelación de peticiones anteriores con `AbortController`, para que una respuesta vieja no sobrescriba una nueva.
- Sección "Mis favoritos" con contador, tarjetas compactas y almacenamiento en Local Storage (se conservan al recargar la página).
- Imagen de respaldo si una imagen del personaje no carga.
- Modo claro/oscuro con preferencia guardada.
- Diseño responsive y accesible: foco visible, botones táctiles de al menos 44 px, etiquetas para lectores de pantalla y respeto a la preferencia de "reducir movimiento".

## Instrucciones de uso

1. **Abre la aplicación** en el enlace de GitHub Pages. Al entrar se cargan automáticamente los primeros 20 personajes.
2. **Buscar:** escribe un nombre en el campo "Buscar personaje..." (por ejemplo, `rick`). Los resultados se actualizan solos cuando dejas de escribir.
3. **Filtrar:** elige valores en los menús de estado, especie y género. Puedes combinarlos con la búsqueda. Si no hay coincidencias verás el mensaje "No se encontraron personajes con esos criterios.".
4. **Limpiar filtros:** pulsa "Limpiar filtros" para volver al listado completo.
5. **Cambiar de página:** usa los botones "Anterior" y "Siguiente". Los filtros se mantienen mientras navegas.
6. **Marcar favoritos:** pulsa el corazón de una tarjeta. El personaje aparece en "Mis favoritos" y el contador se actualiza. Para quitarlo, pulsa de nuevo el corazón, ya sea en los resultados o en la sección de favoritos. Tus favoritos se guardan en el navegador.
7. **Cambiar el tema:** pulsa el botón con el sol o la luna, arriba a la derecha. La app recuerda tu elección; si nunca has elegido, usa el tema de tu sistema operativo.
8. **Si hay un error de conexión:** pulsa "Reintentar" en el mensaje que aparece.

## Estructura del proyecto

```
Proyecto-Web-IA/
├── index.html   # Estructura de la página (encabezado, controles, resultados, favoritos, pie)
├── style.css    # Estilos, variables de color, tema claro/oscuro y diseño responsive
├── script.js    # Lógica: API, tarjetas, filtros, paginación, favoritos y tema
└── README.md    # Documentación del proyecto
```

## Prompts utilizados

Los prompts están resumidos; cada uno se envió a la IA junto con el código que ya tenía el proyecto.

| N° | Prompt | ¿Para qué sirvió? |
|---|---|---|
| 1 | Actuar como desarrollador frontend senior y crear solo HTML y CSS: estructura con IDs exactos, tema oscuro de ciencia ficción con variables CSS, diseño responsive con Grid, tarjetas, mensajes, spinner y accesibilidad | Obtener la base de la app: `index.html` y `style.css` |
| 2 | Escribir `script.js` en JavaScript puro: consumir la API con `fetch` y `async/await`, crear tarjetas con `createElement`, traducir valores al español, paginación y estados de carga, vacío (404) y error con "Reintentar" | Conectar la interfaz con la API y mostrar los personajes |
| 3 | Agregar buscador con debounce de 400 ms, filtros combinables con `URLSearchParams`, botón "Limpiar filtros" y `AbortController` | Búsqueda y filtros sin que respuestas viejas pisen las nuevas |
| 4 | Agregar favoritos: clic en el corazón, guardado en Local Storage (`rm_favorites`) con `try/catch`, tarjetas compactas y delegación de eventos | Favoritos que se conservan al recargar |
| 5 | Actuar como revisor de código y buscar errores reales: IDs y clases, sintaxis, 404, red caída, imagen rota, Local Storage corrupto, accesibilidad y celular | Detectar 7 problemas reales y corregirlos |
| 6 | Agregar modo claro/oscuro con el botón `#themeToggle`, variables en `[data-theme="light"]`, preferencia en Local Storage (`rm_theme`), `prefers-color-scheme` y transición suave, indicando los cambios exactos para editar en GitHub | Funcionalidad extra: tema claro/oscuro |
| 7 | Generar este `README.md` en español con las secciones requeridas | Documentar el proyecto |

Además de estos siete prompts, hice mensajes de seguimiento: pedí que me explicara paso a paso cómo aplicar las correcciones de la revisión y pregunté si también había algo que corregir en el CSS y en el HTML.

## Respuesta de la IA que requirió corrección y cómo la resolví

**El problema.** En el prompt 4, la IA escribió la función `loadFavorites()`, que lee los favoritos guardados en Local Storage. Funcionaba bien con datos normales y estaba protegida con `try/catch` por si el contenido estaba dañado. Sin embargo, solo comprobaba que cada elemento tuviera un `id`:

```js
return parsed.filter((item) => item && typeof item === 'object' && item.id != null);
```

Al pedirle a la IA que revisara el código como revisor (prompt 5), encontró un caso que no estaba cubierto: si un favorito se guardaba con el `id` como texto (`"5"` en lugar de `5`), la comparación del resto del código fallaba. El corazón aparecía vacío y ese favorito **no se podía quitar**. Además, la función aceptaba favoritos duplicados y objetos sin nombre o imagen, que se mostraban con el texto "undefined".

**Cómo lo resolví.** Reemplacé esa parte por una versión que convierte el `id` a número, descarta los inválidos y los duplicados, y rellena valores por defecto cuando faltan datos:

```js
const id = Number(item && item.id);
if (!Number.isInteger(id) || id < 1 || seen.has(id)) return list; // descarta inválidos y duplicados
```

También cambié `createCharacterImage` para que use la imagen de respaldo cuando el campo `image` viene vacío (`img.src = character.image || FALLBACK_IMAGE;`).

**Cómo comprobarlo.** Se puede simular un dato dañado desde la consola del navegador (F12) y recargar la página; el favorito de prueba debe aparecer y poder quitarse con un clic:

```js
localStorage.setItem('rm_favorites', '[{"id":"5","name":"Prueba"}]')
```

**Otras correcciones de la misma revisión:**

- El efecto *hover* del corazón se quedaba "pegado" en pantallas táctiles; ahora solo se aplica en dispositivos con mouse.
- Se sincronizaron los filtros con los valores que el navegador restaura al recargar.
- Se evitó mostrar tarjetas de otra página cuando falla la red.
- Se mejoró el manejo del foco con teclado y la preferencia de "reducir movimiento".

## Modificación al código que puedo explicar

**Cambio del tiempo de espera del buscador (debounce).**

En `script.js` hay una constante al inicio del archivo que controla cuánto espera la app antes de buscar, después de que el usuario deja de escribir. Originalmente valía 400 milisegundos y la cambié a 600:

```js
// Antes
const SEARCH_DELAY = 400;

// Después
const SEARCH_DELAY = 600;
```

**Cómo lo explico, paso a paso:**

1. Si la app consultara la API con cada tecla, escribir "morty" haría 5 peticiones seguidas, casi todas inútiles.
2. Para evitarlo se usa una técnica llamada *debounce*: cada vez que escribes, la app reinicia un temporizador, y solo cuando pasa el tiempo sin que escribas otra tecla hace la búsqueda. Es como esperar a que alguien termine de hablar antes de contestarle.
3. Ese temporizador está en la función `handleSearchInput`, con `setTimeout(applyFilters, SEARCH_DELAY)`. El número que le pasa es justamente la constante `SEARCH_DELAY`.
4. Como el valor está en una constante al principio del archivo, para cambiarlo basta modificar un solo número.
5. Con 600 ms la app espera un poco más antes de buscar. Hace menos peticiones a la API y le da más margen a quien escribe despacio, pero la respuesta se siente un poco más lenta. Con un número menor pasa lo contrario.

**Cómo verlo funcionar:** abre las herramientas del navegador (F12), entra a la pestaña "Red" (Network), escribe `morty` rápido en el buscador y comprueba que solo se hace una petición cuando dejas de escribir.

## Reflexión sobre lo que aprendí usando IA

Usar IA me permitió construir en poco tiempo una aplicación completa, con API, filtros, favoritos y modo oscuro, pero lo más valioso no fue el código que me dio, sino la forma de trabajar con ella. Aprendí que funciona mejor dividir el proyecto en pasos pequeños (estructura, lógica, búsqueda, favoritos, tema) y darle contexto en cada uno, por ejemplo pegando mi código actual y pidiendo los IDs exactos. Cuando le daba instrucciones claras, las respuestas encajaban con lo que ya tenía.

También aprendí que la IA puede dejar casos sin cubrir. El código de favoritos funcionaba, pero fallaba con datos dañados en Local Storage. Lo encontré porque le pedí que revisara su propio código y porque pensé en situaciones límite: sin internet, sin resultados, imágenes rotas, datos corruptos y uso en celular. Entendí que no basta con que algo "funcione en el caso normal" y que siempre hay que probarlo.

Por último, entendí que no sirve copiar y pegar sin comprender. Para editar el proyecto en GitHub tuve que leer cada fragmento antes de cambiarlo, y así aprendí conceptos como variables CSS, `async/await`, `AbortController`, debounce, delegación de eventos, Local Storage y accesibilidad. Para mí la IA es una herramienta de apoyo y de aprendizaje, pero la responsabilidad de entender, probar y decidir sigue siendo mía.

## Funcionalidad extra agregada

**Modo claro/oscuro**, con estas características:

- Botón en el encabezado (con icono de sol o luna) que alterna entre los dos temas. Su `aria-label` cambia según la acción disponible ("Cambiar a modo claro" o "Cambiar a modo oscuro").
- Todos los colores están definidos como variables CSS; el modo claro redefine esas variables con `:root[data-theme="light"]`, con una paleta de colores cómoda y buen contraste de texto.
- La elección se guarda en Local Storage con la clave `rm_theme`. Si no hay una elección guardada, se usa la preferencia del sistema (`prefers-color-scheme`).
- Un pequeño script en el `<head>` aplica el tema antes de que se pinte la página, para evitar un parpadeo al cargar.
- Transición suave al cambiar de tema con la *View Transition API*. En navegadores que no la soportan, o si el usuario tiene activado "reducir movimiento", el cambio es instantáneo.

## Autor

**Julián Kú**

GitHub: [@julianku12](https://github.com/julianku12)
