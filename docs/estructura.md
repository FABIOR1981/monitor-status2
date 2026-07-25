# Estructura del proyecto

Resumen práctico de los archivos y carpetas principales. Para el detalle de
qué contiene cada archivo de `js/`, ver [js-arquitectura.md](js-arquitectura.md).

## Raíz del proyecto

- `index.html` — Interfaz principal del monitor (tabla + vista de tarjetas).
- `leyenda.html` — Página con la explicación de estados y umbrales.
- `abm-webs.html` — Alta/baja/modificación de los sitios monitoreados (botón "⚙️ ABM Webs" en `index.html`).
- `package.json` — Dependencias de Node (`node-fetch`, `abort-controller`) y scripts de lint/format.
- `netlify.toml` — Configuración de Netlify (ubicación de las funciones serverless).
- `readme.md` — Documentación principal del proyecto (raíz, espejo de `docs/readme.md`).

## `data/`

- `webs.json` — Lista de sitios/servicios a monitorear (nombre, URL, grupo, orden).

## `js/`

- `config.js` — Constantes de configuración: umbrales de latencia, temas disponibles, endpoints, duración del historial.
- `i18n.js` — Motor de idiomas: carga dinámicamente (lazy) el archivo de `lang/` que corresponda según `?lang=`.
- `estado.js` — Estado global de la app y persistencia: historial en `sessionStorage`, promedios, duración seleccionada, detección de fallo global.
- `ui-textos.js` — Idiomas aplicados al DOM (etiquetas, headers), formateo de "estado visual" (velocidad/color) y descripciones de códigos HTTP.
- `monitoreo.js` — El corazón de la app: verificación de cada sitio (proxy + fallback directo), render de la tabla, detalle expandible de errores.
- `temas.js` — Cambio de tema claro/oscuro, visibilidad del enlace ABM y de la columna de acción.
- `app.js` — Orquestador: toggle de vista tabla/tarjetas (con esqueletos de carga), y el arranque de la app (`DOMContentLoaded`).
- `render-tarjetas.js` — Render de la vista de tarjetas. Se carga de forma diferida (lazy), solo si el usuario abre esa vista.
- `alertas_error.js` — Alertas de error agrupadas por hora. Se carga de forma diferida, solo si hace falta.
- `leyenda_script.js` — Lógica de la página `leyenda.html`.

## `lang/`

- `i18n_es.js`, `i18n_en.js`, `i18n_fr.js` — Textos de la interfaz por idioma. Cada uno se carga bajo demanda según `?lang=es|en|fr` (por defecto español).

## `css/`

- `monitor_base.css` — Estilos base compartidos (estructura, tabla, tarjetas, esqueletos de carga).
- `monitor_def.css` — Tema claro (por defecto).
- `monitor_osc.css` — Tema oscuro.
- `monitor_tarjetas.css` — Estilos específicos de la vista de tarjetas (controles, grid, tarjetas, contadores).
- `alertas_error.css` — Estilos de las alertas de error (se inyecta junto con `alertas_error.js`).
- `leyenda_base.css`, `leyenda_claro.css`, `leyenda_oscuro.css` — Estilos de `leyenda.html` (base + tema claro/oscuro).

> Nota: los temas `pro`, `pro2` y `min` que existieron en versiones anteriores fueron retirados (no estaban en uso). Hoy solo hay 2 temas: `def` (claro) y `osc` (oscuro), alternables con el botón 🌓.

## `netlify/functions/`

- `check-status.js` — Función serverless que actúa como proxy para medir latencia y evitar problemas de CORS.
- `update-webs.js` — Función serverless que usa `abm-webs.html` para guardar cambios de `data/webs.json` directo a GitHub.

## `docs/`

Documentación del proyecto (este mismo directorio). Ver [docs/readme.md](readme.md) como índice.

## Consejo rápido

Mantené `data/webs.json` ordenado por prioridad y usá grupos (`CRITICO`, `PRODUCCION`, `STAGING`) para visualizar primero lo más importante.
