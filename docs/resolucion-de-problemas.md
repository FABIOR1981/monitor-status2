# Guía de solución de problemas (troubleshooting)

Este documento cubre los problemas más comunes encontrados durante el
despliegue y la operación del monitor de disponibilidad.

---

## 1. Problemas de despliegue y configuración

### Problema 1.1: El sitio web está en blanco tras el despliegue.

**Causa:** Netlify no encontró los archivos del frontend o no ejecutó
correctamente la función Serverless.

**Verificación y Solución:**

1. **Revisar Netlify Logs:** Vaya al panel de Netlify, sección **Deploys**. Busque el último despliegue y asegúrese de que no hay errores en la fase de "Building" o "Deploying".
2. **Verificar netlify.toml:** Confirme que el archivo `netlify.toml` exista y apunte correctamente: `functions = "netlify/functions"`.
3. **Verificar package.json:** Asegúrese de que `package.json` contenga la dependencia `node-fetch`.

### Problema 1.2: La tabla se carga, pero aparece un error 404/500 en la consola al intentar verificar una URL.

**Causa:** La función Serverless no está desplegada correctamente o la ruta de invocación es incorrecta.

**Verificación y Solución:**

1. **Ruta de la Función:** Confirme que el archivo `check-status.js` está en `netlify/functions/check-status.js`.
2. **Ruta de Llamada (config.js):** Verifique que la constante `PROXY_ENDPOINT` en `js/config.js` esté configurada correctamente:
   ```js
   const PROXY_ENDPOINT = "/.netlify/functions/check-status";
   ```

---

## 2. Problemas de disponibilidad y latencia

### Problema 2.1: Un sitio reporta "CAÍDA 🔴" (Estado 0) pero sé que está en línea.

**Causa A: El proxy está bloqueado por el WAF del sitio (MÁS COMÚN).**

- **Diagnóstico:** El proxy de Netlify hace requests desde servidores en internet pública. Muchos sitios usan WAF (Web Application Firewall) que bloquea IPs de servicios cloud como Netlify. El WAF devuelve 403/429 al proxy, pero el sitio funciona perfectamente para usuarios normales.
- **Síntomas:**
  - El sitio abre rápido en tu navegador.
  - En la tabla aparece "CAÍDA/ERROR (0 - Sin conexión)" con latencia 99999 ms.
  - La consola del navegador muestra que el proxy falló pero la verificación directa funcionó.
- **Solución:** El sistema ya maneja esto automáticamente. Cuando el proxy falla, el frontend intenta verificar directamente cargando `favicon.ico` desde tu navegador (`verificarDirecto()` en `js/monitoreo.js`). Si funciona, el sitio se marca como operativo con icono 🖥️ (medición directa).
- **Si sigue apareciendo caído:** Forzar refresh con `Ctrl+F5` para limpiar cache, o verificar que `netlify/functions/check-status.js` esté desplegado correctamente.

**Causa B: Fallo de Conexión / DNS.**

- **Diagnóstico:** El entorno Node.js del Serverless no pudo resolver el nombre de host o establecer la conexión.
- **Solución:** Revise `data/webs.json` y confirme que la URL esté escrita perfectamente (incluyendo `http://` o `https://`).

**Causa C: Timeout del Proxy.**

- **Diagnóstico:** La función Serverless (`check-status.js`) tiene un timeout de 25 segundos. Si el servidor de destino no responde en ese tiempo, la función devuelve `status: 0`. Pero si el sitio responde lentamente (más de 25s), se marca como `status: 408` (SLOW_RESPONSE), no como caído.
- **Solución:** Si ves `status: 408`, el sitio funciona pero es extremadamente lento. Si ves `status: 0` y la verificación directa también falla, el sitio realmente está caído.

**Causa D: Demasiados Redirects (Redirecciones).**

- **Diagnóstico:** El `check-status.js` tiene un límite de seguimiento de redirecciones (`follow: 20`). Si la URL supera ese número de saltos, fallará.
- **Solución:** Utilice la URL de destino final en `data/webs.json`.

### Problema 2.2: El estado de latencia siempre es 'LENTO' o 'CRÍTICO'.

**Causa:** La constante `UMBRALES_LATENCIA` está demasiado ajustada o el servidor está bajo carga.

**Solución:**

1. **Revisar Justificación:** Consulte `docs/justificacion_rangos_latencia.md` para entender los umbrales (300ms, 500ms, etc.).
2. **Ajuste:** Si el rendimiento del servidor no puede mejorar, considere ajustar los valores de `UMBRALES_LATENCIA*` en `js/config.js` para que se adapten a la realidad operativa.

### Problema 2.3: No entiendo los iconos 🌐 y 🖥️ en la tabla.

- **🌐 (mundo)** = Medición vía proxy serverless (desde internet pública).
- **🖥️ (monitor)** = Medición directa desde tu navegador (red interna/local).
- **¿Por qué hay dos?** Algunos sitios bloquean el proxy con WAF. Cuando eso pasa, el sistema verifica directamente desde tu navegador para confirmar si realmente están caídos.
- **Borde azul izquierdo** en la fila = indica que la última medición fue directa.
- **Promedios separados**: si hay mediciones mixtas (algunas proxy, otras directas), la columna "Promedio" muestra ambos: `120 ms 🌐 / 45 ms 🖥️`.

### Problema 2.4: Un sitio aparece como "MUY LENTO" (status 408) pero funciona bien.

- **Diagnóstico:** `status: 408` significa que el sitio responde pero tarda más de 25 segundos en responder al proxy. Esto puede deberse a servidor sobrecargado, WAF que retrasa intencionalmente las respuestas a bots, o problemas de red entre Netlify y el servidor destino.
- **Solución:** El status 408 NO es una caída — el sitio funciona pero es muy lento. Si la latencia es crítica para tu operación, investigá el rendimiento del servidor.

---

## 3. Problemas del frontend y datos

### Problema 3.1: Los promedios históricos no se reinician después de cambiar una URL o arreglar un sitio.

**Causa:** El historial de latencia se almacena en el navegador (`sessionStorage`, manejado por `js/estado.js`) y no en el servidor. El promedio se sigue calculando con los datos antiguos.

**Solución:**

1. **Botón Reiniciar:** Presioná el botón "🔄 Reiniciar Monitoreo" junto al selector de duración. Esto limpia todo el historial y reinicia las mediciones (`reiniciarMonitoreo()` en `js/temas.js`).
2. **Manualmente:** Abrí las herramientas de desarrollo (F12), pestaña **Application** (Aplicación) o **Storage** (Almacenamiento).
3. **Limpiar:** En `Session Storage`, buscá la clave `monitorStatusHistorial` y borrala. Esto forzará al monitor a empezar a calcular los promedios desde cero en la siguiente ejecución.

### Problema 3.2: Un tema (`?tema=`) no se aplica.

**Causa:** El parámetro de la URL está mal escrito, o el archivo CSS correspondiente no existe/no se cargó.

**Solución:**

1. **Verificar URL:** Asegurate de que la URL termine exactamente con `?tema=osc` (o `?tema=def` para el claro). Actualmente solo esos dos valores son válidos — cualquier otro cae automáticamente al tema claro por defecto.
2. **Verificar Archivo:** Confirmá que el archivo (`css/monitor_def.css` o `css/monitor_osc.css`) existe en `css/`.
3. **Verificar config.js:** La constante `TEMA_FILES` en `js/config.js` debe contener el mapeo correcto de temas a archivos CSS.

### Problema 3.3: El toggle de detalle de errores no funciona.

**Causa:** La función `toggleErroresDetalle(url)` (definida en `js/monitoreo.js`) no está expuesta globalmente, o el HTML generado tiene un `onclick` incorrecto.

**Solución:**

1. Revisá la consola del navegador por errores de JavaScript.
2. Confirmá que `js/monitoreo.js` cargó correctamente (sin errores 404) y que la línea `window.toggleErroresDetalle = toggleErroresDetalle;` se ejecutó.

### Problema 3.4: Cambiar la duración del historial no tiene efecto.

**Causa:** El selector de duración (`<select id="duracion-selector">`) no disparó el evento `change`, o `js/estado.js` no se cargó antes que el resto.

**Solución:**

1. Verificá que existe `<select id="duracion-selector">` en `index.html`.
2. Después de cambiar la duración, el historial se borra automáticamente (es esperado: los datos viejos no sirven con una duración distinta).

---

## 4. Leyenda y estilos

### Problema 4.1: `leyenda.html` muestra estilos rotos.

- Verificá que los archivos `css/leyenda_base.css`, `css/leyenda_claro.css` y `css/leyenda_oscuro.css` existen en `css/`.
- Asegurate de pasar `?tema=` en la URL si querés un tema específico (`def` u `osc`).

---

## 5. Internacionalización (i18n)

### Problema 5.1: Los textos aparecen en el idioma equivocado.

- Agregá `?lang=es`, `?lang=en` o `?lang=fr` a la URL.
- Revisá que el archivo correspondiente (`lang/i18n_es.js`, `lang/i18n_en.js` o `lang/i18n_fr.js`) esté presente y sin errores de sintaxis. Si el idioma solicitado falla al cargar, el sistema cae automáticamente al español (`DEFAULT_LANG` en `js/config.js`).
