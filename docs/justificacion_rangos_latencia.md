# Justificación de los umbrales de latencia

Este documento explica por qué usamos los rangos de latencia actuales y qué significan desde el punto de vista de UX y operación.

Valores por defecto — verificación DIRECTA (navegador), en milisegundos

- MUY_RAPIDO: 300
- RAPIDO: 500
- NORMAL: 800
- LENTO: 1500
- CRITICO: 3000
- RIESGO: 5000
- PENALIZACION_FALLO: 99999 (valor simbólico para errores)

Valores por defecto — verificación vía PROXY (Netlify), en milisegundos

- MUY_RAPIDO: 600
- RAPIDO: 1000
- NORMAL: 1600
- LENTO: 3000
- CRITICO: 6000
- RIESGO: 10000
- PENALIZACION_FALLO: 99999

**¿Por qué dos escalas?** El proxy corre en un datacenter de Netlify (a
veces en otro país/continente respecto al sitio monitoreado), así que
cada medición suma latencia de red internacional real que **no** indica
que el sitio esté lento para tus usuarios reales. Antes de este ajuste,
ambas fuentes usaban la misma escala y eso hacía que mediciones de proxy
perfectamente normales (por ejemplo 700ms cruzando continentes) se
mostraran como "LENTO" o "CRÍTICO". Ahora cada fuente (🌐 proxy / 🖥️
directo) se clasifica con su propia escala. Podés ajustar ambas en
`js/config.js` (`UMBRALES_LATENCIA_DIRECTO` y `UMBRALES_LATENCIA_PROXY`)
según la distancia real entre tu sitio y la región de Netlify.

Nuevos estados de conexión

- **Status 408 (SLOW_RESPONSE)**: el sitio responde pero tarda más de 25 segundos. No es una caída, es un rendimiento extremadamente lento.
- **Status 403/429 (WAF_BLOCK)**: el servidor responde pero bloqueó el request (firewall). El sitio funciona para usuarios normales.
- **Status 0 (REALMENTE CAÍDO)**: sin respuesta HTTP. Solo se marca como caído si tanto el proxy como la verificación directa fallan.

Principio general

- La escala combina criterios de experiencia de usuario (qué percibe una persona) y prácticas de rendimiento web.

Qué significa cada nivel (resumen)

- MUY_RAPIDO (≤ 300 ms): experiencia fluida, casi instantánea.
- RAPIDO (300–500 ms): muy buena respuesta, interacción natural.
- NORMAL (500–800 ms): aceptable, pero empieza a notarse la demora.
- LENTO (800–1.500 ms): degradación visible; conviene investigar.
- CRÍTICO (1.500–3.000 ms): riesgo de abandono; prioridad alta.
- RIESGO (3.000–5.000 ms): comportamiento inestable o fallas parciales.
- RIESGO EXTREMO (> 5.000 ms): casi timeout; requiere acción inmediata.
- SLOW_RESPONSE (status 408, > 25.000 ms): el sitio responde pero extremadamente lento. No es caída, pero requiere atención.
- CAÍDA / ERROR (status 0): sin respuesta HTTP del servidor. Solo se marca como caído si tanto el proxy como la verificación directa fallan.
- WAF_BLOCK (status 403/429): el sitio funciona pero bloqueó el proxy. Se verifica directamente desde el navegador para confirmar.

Notas operativas

- **Mediciones de diferentes fuentes**: el sistema guarda si cada medición vino del proxy (internet) o de verificación directa (navegador/red interna). Las latencias pueden diferir significativamente:
  - Proxy (internet): típicamente 50-500 ms para sitios externos.
  - Directo (red interna): típicamente 5-50 ms para sitios en la misma red.
- **Promedios separados**: si hay mediciones mixtas, se calculan promedios por fuente y se muestran ambos en la columna "Promedio".
- **Fallos y penalización**: los códigos 4xx/5xx o timeouts se marcan con penalización, pero **solo se consideran caída real si el status es 0** (sin respuesta HTTP). Los status 403/429 indican bloqueo WAF, no caída.
- Si más del 50% de las mediciones **reales** (status 0) fallan, el estado promedio se marca como "CAÍDA/ERROR". Los status 408 (slow) no cuentan como caída.

Si necesitás adaptar la escala a un entorno específico (red interna, API externa), podés ajustar los valores en `js/config.js`.
