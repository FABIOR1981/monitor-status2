# Arquitectura de `js/`

Mapa de qué hace cada archivo, de qué depende, y cuándo se carga. Todos son
scripts clásicos (no ES modules) que comparten el mismo scope global — por
eso pueden llamarse funciones entre sí sin `import`/`export`.

## Orden de carga en `index.html`

```html
<script defer src="js/config.js"></script>
<script defer src="js/i18n.js"></script>
<script defer src="js/estado.js"></script>
<script defer src="js/ui-textos.js"></script>
<script defer src="js/monitoreo.js"></script>
<script defer src="js/temas.js"></script>
<script defer src="js/app.js"></script>
```

`app.js` va último porque su listener de `DOMContentLoaded` llama funciones
definidas en todos los demás.

## Tabla de archivos

| Archivo | Responsabilidad | Funciones/datos clave | Depende de | Se carga |
|---|---|---|---|---|
| `config.js` | Constantes: umbrales de latencia, temas, endpoints, duración del historial | `UMBRALES_LATENCIA*`, `TEMA_FILES`, `TEMA_TOGGLE_PAIRS`, `PROXY_ENDPOINT`, `DURACION_OPCIONES` | — | Siempre, primero |
| `i18n.js` | Motor de idiomas: decide qué archivo de `lang/` traer según `?lang=` | (usado por `ui-textos.js`) | `config.js` (`I18N_FILES`) | Siempre |
| `estado.js` | Estado global + persistencia | `websitesData`, `historialStatus`, `calcularPromedio()`, `cargarHistorial()`/`guardarHistorial()`, `determinarFalloGlobal()` | `config.js` | Siempre |
| `ui-textos.js` | Idiomas aplicados al DOM + formateo visual | `cargarIdioma()`, `inicializarEtiquetas()`, `obtenerEstadoVisual()`, `obtenerDescripcionEstadoHttp()` | `config.js`, `estado.js` (lee `maxHistorialActual`) | Siempre |
| `monitoreo.js` | Fetch/verificación de cada sitio, render de tabla, detalle de errores | `verificarEstado()`, `monitorearTodosWebsites()`, `actualizarFila()`, `toggleErroresDetalle()` | `config.js`, `estado.js`, `ui-textos.js` | Siempre |
| `temas.js` | Cambio de tema claro/oscuro, visibilidad ABM/columna acción | `inicializarTema()`, `toggleDarkMode()`, `actualizarVisibilidadABM()` | `config.js`, `estado.js` (usa `temaProActivo`) | Siempre |
| `app.js` | Orquestador: toggle vista tabla/tarjetas, esqueletos, arranque | `cambiarVista()`, `mostrarEsqueletosTarjetas()`, `cargarModuloTarjetas()`, listener `DOMContentLoaded` | Todos los anteriores | Siempre, último |
| `render-tarjetas.js` | Render de la vista de tarjetas | `renderizarTarjetas()`, `crearTarjetaHTML()` | `estado.js`, `ui-textos.js` | **Lazy** — solo si el usuario abre la vista "Tarjetas" (lo inyecta `app.js`) |
| `alertas_error.js` | Alertas de error agrupadas por hora | `registrarErrorSitio()`, `limpiarErrorSitio()` | `config.js` | **Lazy** — inyectado por `estado.js` al arrancar, corre en segundo plano |
| `leyenda_script.js` | Lógica de `leyenda.html` (independiente del resto) | — | `config.js` | Solo en `leyenda.html` |

## Reglas para agregar código nuevo

- ¿Es un dato/constante que no cambia en runtime? → `config.js`.
- ¿Es estado que se lee/escribe durante el monitoreo (historial, promedios)? → `estado.js`.
- ¿Es texto/formato que depende del idioma o de cómo se ve un estado? → `ui-textos.js`.
- ¿Toca el fetch al proxy, la tabla, o el detalle de errores? → `monitoreo.js`.
- ¿Es tema visual o algo que se muestra/oculta según el tema? → `temas.js`.
- ¿Es la vista de tarjetas en sí? → `render-tarjetas.js` (no `app.js` — mantenerlo lazy).
- ¿Es arranque, o coordina otros archivos? → `app.js`.

## Por qué estos 3 archivos se cargan lazy y el resto no

`render-tarjetas.js`, `alertas_error.js` y los archivos de `lang/` son
genuinamente opcionales: la página funciona sin ellos hasta el momento en
que hacen falta. El resto (`config.js`, `estado.js`, `ui-textos.js`,
`monitoreo.js`, `temas.js`, `app.js`) es lógica central que `index.html`
necesita desde el primer render — separarlos en más archivos ayuda a la
mantenibilidad (cada uno con una responsabilidad clara y más corto que el
`script.js` original de ~1850 líneas), pero no cambia cuánto tarda en cargar
la página, porque todos son necesarios de entrada igual.
