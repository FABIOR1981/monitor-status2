# Arquitectura y flujo de datos

Breve explicación de cómo funciona el sistema y por qué usamos un proxy serverless.

Objetivo

- Proteger la comprobación de URLs externas frente a limitaciones del navegador (CORS, Mixed Content) y medir latencia de forma consistente.

Flujo general (ciclo típico)

1. `script.js` lee `data/webs.json` y programa las comprobaciones.
2. El frontend invoca la función proxy: `/.netlify/functions/check-status?url=...`.
3. La función serverless (`check-status.js`) hace la petición al destino y mide latencia.
   - Mide tiempo total (DNS, TCP, SSL, procesamiento).
   - Si la petición pasa de 9s, se aborta y se marca como fallo (status: 0) para evitar exceder el límite de ejecución.
   - Maneja redirecciones y puede ignorar certificados inválidos para medir disponibilidad.
4. La función devuelve un JSON con el `status` real del servicio y la `time` en ms.
5. El frontend procesa la respuesta, actualiza historial, calcula promedios y pinta la tabla.

Procesamiento en el frontend

- Registra errores con timestamp, código HTTP y mensaje.
- Guarda historial en `sessionStorage` y calcula promedios solo con mediciones exitosas (status 200).
- Muestra indicadores visuales (p. ej. "⚠️ X/Y") y permite expandir detalles de errores (últimos N registros).
- Si se alcanza el límite de registros configurado, el sistema pausa nuevas mediciones hasta que el usuario reinicie o cambie la duración.

Por qué usar un proxy serverless

- Evita problemas de CORS y mixed content.
- Permite medir latencia completa desde el servidor (más fiable que solo tiempos en el navegador).
- Controla timeouts y número de reintentos sin depender del cliente.

Notas operativas

- Timeout recomendado para la función: 9s (ajustable según plan/oferta del proveedor).
- La función devuelve siempre `200` al navegador; la información real del servicio está en el body del JSON.
