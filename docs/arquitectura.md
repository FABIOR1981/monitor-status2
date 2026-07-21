# Arquitectura y flujo de datos

Breve explicación de cómo funciona el sistema y por qué usamos un proxy serverless.

Objetivo

- Proteger la comprobación de URLs externas frente a limitaciones del navegador (CORS, Mixed Content) y medir latencia de forma consistente.

Flujo general (ciclo típico)

1. `script.js` lee `data/webs.json` y programa las comprobaciones.
2. El frontend invoca la función proxy: `/.netlify/functions/check-status?url=...`.
3. La función serverless (`check-status.js`) intenta conectar al destino:
   - **Estrategia**: HEAD primero con headers mínimos → GET con headers mínimos → GET completo.
   - **User-Agent rotativo** (Chrome, Firefox, Safari) para evitar bloqueos por fingerprinting.
   - **Timeout**: 25 segundos (antes 9s) para dar tiempo a sitios lentos.
   - **Cualquier status HTTP (200-599) = FUNCIONA**: incluso 403/429 (WAF bloqueo) significa que el servidor responde.
   - **Solo status 0 = REALMENTE CAÍDO**: sin respuesta HTTP (timeout real, DNS falla, conexión rechazada).
   - **Status 408 = SLOW_RESPONSE**: el sitio responde pero muy lentamente (>25s).
   - Maneja redirecciones y puede ignorar certificados inválidos para medir disponibilidad.
4. Si el proxy reporta "sin conexión" (status 0), el frontend intenta **verificación directa**:
   - Carga `favicon.ico` del sitio usando `new Image()` (sin restricciones CORS).
   - Si la imagen carga (incluso con error 404), el sitio **funciona** — el proxy estaba bloqueado por WAF.
   - La latencia se mide desde el navegador del usuario (red interna, típicamente más rápida).
5. El frontend procesa la respuesta, actualiza historial (con fuente: proxy/directo), calcula promedios separados por fuente y pinta la tabla.
   - **Iconos de fuente**: 🌐 = proxy (internet) | 🖥️ = directo (red interna/navegador).
   - **Borde azul**: filas con mediciones directas tienen borde izquierdo azul para distinguirlas visualmente.

Procesamiento en el frontend

- Registra errores con timestamp, código HTTP y mensaje.
- Guarda historial en `sessionStorage` y calcula promedios solo con mediciones exitosas (status 200).
- Muestra indicadores visuales (p. ej. "⚠️ X/Y") y permite expandir detalles de errores (últimos N registros).
- Si se alcanza el límite de registros configurado, el sistema pausa nuevas mediciones hasta que el usuario reinicie o cambie la duración.

Por qué usar un proxy + verificación directa

- **Proxy serverless**: evita problemas de CORS y mixed content. Mide latencia desde internet pública.
- **Verificación directa**: cuando el proxy es bloqueado por WAF (firewall), el navegador del usuario verifica directamente desde la red interna.
- **Doble fuente de verdad**: combinando ambas, eliminamos falsos positivos por bloqueos de WAF y detectamos caídas reales.
- **Control de timeouts**: el proxy reintenta 3 veces con diferentes estrategias antes de declarar caída.

Notas operativas

- **Timeout del proxy**: 25 segundos (ajustable en `check-status.js`).
- **Timeout de verificación directa**: 10 segundos (en el navegador).
- La función devuelve siempre `200` al navegador; la información real del servicio está en el body del JSON.
- **Nuevos códigos de estado del proxy**:
  - `status: 200-399` = Funciona correctamente.
  - `status: 400-599` = Funciona pero con error HTTP (403/429 = bloqueado por WAF).
  - `status: 408` = Muy lento pero responde (SLOW_RESPONSE).
  - `status: 0` = Realmente caído (sin respuesta HTTP).
- **Fuentes de medición**: el historial guarda `source: 'proxy'` o `source: 'direct'` para cada medición.
- **Promedios separados**: si hay mediciones mixtas, se calculan promedios por fuente y se muestran ambos.
