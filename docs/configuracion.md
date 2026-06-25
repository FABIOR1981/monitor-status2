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

## 3 — Intervalo de monitoreo

Por defecto: 5 minutos. Se controla desde la invocación de la función serverless (Netlify Scheduled Functions o un trigger externo).

Recomendación: 3–10 minutos. Intervalos menores pueden alcanzar límites de funciones o sobrecargar servicios.

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

La función `detectarFalloGlobal()` evalúa condiciones como todos los servicios críticos caídos o un porcentaje alto de servicios extremadamente lentos. Podés ajustar umbrales y porcentaje en `js/script.js` si lo necesitás.

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

El historial por defecto permite hasta 9 horas (108 registros). Si necesitás más, ajustá el límite en `js/script.js`, pero considerá el impacto en `sessionStorage` y rendimiento.

## 10 — Personalizar textos

Los textos de la interfaz están en `lang/i18n_*.js`. Para cambiar etiquetas, editá esos archivos o agregá un nuevo idioma.

Modifica cualquier texto visible:

```javascript
const I18N_ES = {
  // Títulos
  titulo: 'Monitor de Disponibilidad',
  subtitulo: 'Servicios en Tiempo Real',

  // Estados personalizados
  estado_muy_rapido: '🚀 Súper Rápido',
  estado_rapido: '⚡ Veloz',
  // ...

  // Mensajes
  ultima_actualizacion: 'Última verificación',
  sin_datos: 'Esperando primera medición...',
  // ...
};
```

---

## Resumen de Archivos Configurables

| Archivo                             | Qué configura                        |
| ----------------------------------- | ------------------------------------ |
| `data/webs.json`                    | Servicios a monitorear               |
| `js/config.js`                      | Umbrales, temas, idiomas, constantes |
| `js/script.js`                      | Lógica de detección y comportamiento |
| `lang/i18n_*.js`                    | Textos e idiomas                     |
| `css/monitor_*.css`                 | Temas visuales                       |
| `netlify.toml`                      | Despliegue y funciones               |
| `netlify/functions/check-status.js` | Lógica de verificación HTTP          |

---

¿Necesitas ayuda con alguna configuración específica? Revisa [resolución de problemas.md](resolución%20de%20problemas.md).
