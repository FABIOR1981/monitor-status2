# Justificación de los umbrales de latencia

Este documento explica por qué usamos los rangos de latencia actuales y qué significan desde el punto de vista de UX y operación.

Valores por defecto (milisegundos)

- MUY_RAPIDO: 300
- RAPIDO: 500
- NORMAL: 800
- LENTO: 1500
- CRITICO: 3000
- RIESGO: 5000
- PENALIZACION_FALLO: 99999 (valor simbólico para errores)

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
- CAÍDA / ERROR (valor de penalización): falla o respuesta inválida.

Notas operativas

- Los fallos (códigos 4xx/5xx o timeouts) se marcan con una penalización y no se incluyen en el cálculo del promedio histórico (para evitar distorsión).
- Si más del 50% de las mediciones fallan, el estado promedio se marca como "CAÍDA/ERROR".

Si necesitás adaptar la escala a un entorno específico (red interna, API externa), podés ajustar los valores en `js/config.js`.
