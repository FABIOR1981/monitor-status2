# Configuración y personalización

Guía práctica para ajustar el monitor según tus necesidades. Aquí encontrarás cómo agregar servicios, cambiar umbrales, idiomas, temas y más.

## 1 — Servicios a monitorear

Archivo: `data/webs.json`

Ejemplo mínimo:

```json
[
  {
    "nombre": "Mi API",
    "url": "https://api.miempresa.com/health",
    "grupo": "CRITICO",
    "orden": 1
  }
]
```

Campos útiles:

- `nombre`: etiqueta visible del servicio.
- `url`: URL completa (recomendado `/health` o `/ping`).
- `grupo`: categoría (ej. `CRITICO`, `PRODUCCION`, `STAGING`).
- `orden`: posición en la tabla (menor = arriba).

Sugerencias:

- Mantén listas lógicas por grupo para priorizar la vista.
- Evita monitorear demasiados endpoints desde una sola instancia (20–30 recomendado).

## 2 — Umbrales de latencia

Archivo: `js/config.js` (constantes definidas como `UMBRALES_LATENCIA`).

Valores por defecto (ms): `MUY_RAPIDO: 300, RAPIDO: 500, NORMAL: 800, LENTO: 1500, CRITICO: 3000, RIESGO: 5000`.

Cuándo cambiar:

- Servicios internos con redes rápidas → bajar los umbrales.
- APIs externas → subir umbrales para evitar falsas alertas.

Ver `docs/justificacion_rangos_latencia.md` para la base de estas cifras.

### Nuevos estados de conexión

El sistema ahora distingue entre diferentes tipos de "fallo":

- **Status 200-399**: Funciona correctamente.
- **Status 403/429**: El sitio funciona pero bloqueó el proxy (WAF). Se verifica directamente desde el navegador.
- **Status 408**: El sitio responde pero extremadamente lento (>25s). No es caída, es un problema de rendimiento.
- **Status 0**: Realmente caído (sin respuesta HTTP). Solo se marca así si tanto el proxy como la verificación directa fallan.

## 3 — Intervalo de monitoreo y timeout del proxy

Por defecto: 5 minutos. Se controla desde la invocación de la función serverless (Netlify Scheduled Functions o un trigger externo).

Recomendación: 3–10 minutos. Intervalos menores pueden alcanzar límites de funciones o sobrecargar servicios.

### Timeout del proxy (`check-status.js`)

- **Timeout del proxy**: 25 segundos (configurable en `netlify/functions/check-status.js`).
- **Timeout de verificación directa**: 10 segundos (en el navegador, en `js/monitoreo.js`).
- **Estrategia de reintentos**: HEAD con headers mínimos → GET con headers mínimos → GET completo. User-Agent rotativo para evitar bloqueos.

Si necesitás ajustar el timeout del proxy (por ejemplo, para servicios muy lentos o para acelerar el monitoreo), editá la constante `TIMEOUT_MS` en `check-status.js`.

## 4 — Idiomas (i18n)

Cómo agregar un idioma:

1. Copiá `lang/i18n_es.js` a `lang/i18n_xx.js` y traducí los textos.
2. Registralo en `js/config.js` (mapear código de idioma → archivo).
3. Probalo con `?lang=xx` en la URL.

## 5 — Temas visuales

Para crear un tema nuevo:

1. Copiá un CSS existente (`css/monitor_def.css`) a `css/monitor_tu_tema.css`.
2. Ajustá las variables CSS (colores, acentos y estados).
3. Registralo en `js/config.js` dentro de `TEMA_FILES`.
4. Opcional: si tenés variante clara/oscura, agregala a `TEMA_TOGGLE_PAIRS` para alternancia.

## 6 — Detección de fallo global

La función `determinarFalloGlobal()` evalúa condiciones como todos los servicios críticos caídos o un porcentaje alto de servicios extremadamente lentos. Podés ajustar umbrales y porcentaje en `js/estado.js` si lo necesitás.

## 7 — Netlify y variables de entorno

`netlify.toml` ya incluye la configuración base. Para claves secretas, usá las Environment Variables en el panel de Netlify y accedé a ellas desde la función serverless con `process.env.TU_VARIABLE`.

## 8 — Desarrollo local

Requisitos: Node.js 14+ y `netlify-cli` para simular funciones.

Comandos básicos:

```bash
git clone <tu-repo>
cd monitor-status-test
npm install
netlify dev
```

Para servir solo las funciones:

```bash
netlify functions:serve
```

## 9 — Historial y límites

El historial por defecto permite hasta 9 horas (108 registros). Si necesitás más, ajustá `DURACION_OPCIONES` en `js/config.js`, pero considerá el impacto en `sessionStorage` y rendimiento.

### Mediciones con fuente

Cada medición en el historial guarda su fuente:
- `source: 'proxy'` = medición vía proxy serverless (internet pública).
- `source: 'direct'` = medición directa desde el navegador (red interna).

Esto permite calcular promedios separados por fuente y detectar si un sitio bloquea el proxy pero funciona en la red interna.

## 10 — Personalizar textos

Los textos de la interfaz están en `lang/i18n_*.js`. Para cambiar etiquetas, editá esos archivos o agregá un nuevo idioma (ver sección 4).

Cada archivo exporta un objeto agrupado por sección (no es un listado plano) y termina asignándolo a `window.TEXTOS_ACTUAL`:

```javascript
const TEXTOS_ES = {
  general: {
    PAGE_TITLE: 'Monitor de Estado de Servicios',
    LOADING: 'Cargando...',
    BTN_REINICIAR: 'Reiniciar Monitoreo',
    // ...
  },
  velocidad: {
    VERY_FAST: 'MUY RÁPIDO',
    FAST: 'RÁPIDO',
    // ...
  },
  estados: { DOWN: 'CAÍDO', DOWN_ERROR: 'CAÍDO/ERROR' },
  httpCodes: [ /* array de { code, label, description } */ ],
  tabla: { HEADER_SERVICE: 'Servicio', /* ... */ },
  leyenda: { /* usado por leyenda.html */ },
};

window.TEXTOS_ACTUAL = TEXTOS_ES;
```

Para agregar un idioma nuevo, la forma más simple es copiar `lang/i18n_es.js` completo (todas las secciones) y traducir cada valor, manteniendo las mismas claves.

---

## Resumen de Archivos Configurables

| Archivo                             | Qué configura                        |
| ------------------------------------ | ------------------------------------- |
| `data/webs.json`                    | Servicios a monitorear               |
| `js/config.js`                      | Umbrales, temas, idiomas, constantes |
| `js/estado.js`                      | Historial, promedios, fallo global   |
| `js/monitoreo.js`                   | Lógica de verificación y render de tabla |
| `lang/i18n_*.js`                    | Textos e idiomas                     |
| `css/monitor_*.css`                 | Temas visuales                       |
| `netlify.toml`                      | Despliegue y funciones               |
| `netlify/functions/check-status.js` | Lógica de verificación HTTP          |

Ver [js-arquitectura.md](js-arquitectura.md) para el detalle completo de qué hace cada archivo de `js/`.

---

¿Necesitas ayuda con alguna configuración específica? Revisa [resolucion-de-problemas.md](resolucion-de-problemas.md).
