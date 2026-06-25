======================================================
GUÍA DE SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING.md)
======================================================

Este documento cubre los problemas más comunes encontrados durante
el despliegue y la operación del monitor de disponibilidad.

---

1. PROBLEMAS DE DESPLIEGUE Y CONFIGURACIÓN

---

### Problema 1.1: El sitio web está en blanco tras el despliegue.

**Causa:** Netlify no encontró los archivos del frontend o
no ejecutó correctamente la función Serverless.

**Verificación y Solución:**

1.  **Revisar Netlify Logs:** Vaya al panel de Netlify, sección
    **Deploys**. Busque el último despliegue y asegúrese de que
    no hay errores en la fase de "Building" o "Deploying".
2.  **Verificar netlify.toml:** Confirme que el archivo
    `netlify.toml` exista y apunte correctamente:
    `functions = "netlify/functions"`
3.  **Verificar package.json:** Asegúrese de que `package.json`
    contenga la dependencia `node-fetch`.

### Problema 1.2: La tabla se carga, pero aparece un error 404/500

en la consola al intentar verificar una URL.

**Causa:** La función Serverless no está desplegada correctamente
o la ruta de invocación es incorrecta.

**Verificación y Solución:**

1.  **Ruta de la Función:** Confirme que el archivo
    `check-status.js` está en la ruta exacta:
    `monitor-status-test/netlify/functions/check-status.js`
2.  **Ruta de Llamada (config.js):** Verifique que la constante
    `PROXY_ENDPOINT` en `js/config.js` esté configurada
    correctamente:
    > const PROXY_ENDPOINT = "/.netlify/functions/check-status";

---

2. PROBLEMAS DE DISPONIBILIDAD Y LATENCIA

---

### Problema 2.1: Un sitio reporta "CAÍDA 🔴" (Estado 0 o 599)

aunque sé que está en línea.

**Causa A: Fallo de Conexión / DNS.**

- **Diagnóstico:** El entorno Node.js del Serverless no pudo
  resolver el nombre de host o establecer la conexión.
- **Solución:** Revise el archivo `webs.json` (ubicado en la raíz)
  y confirme que la URL esté escrita perfectamente (incluyendo
  `http://` o `https://`).

**Causa B: Timeout del Proxy.**

- **Diagnóstico:** La función Serverless (`check-status.js`)
  tiene un límite de 9 segundos (9000 ms) antes de que se
  cierre la conexión. Si el servidor de destino tarda más
  de ese tiempo en enviar los encabezados, la función devuelve
  un `status: 0`.
- **Solución:** Es una **caída por rendimiento**. El servidor
  está demasiado lento. La solución es optimizar el
  servidor de destino. Nota: El proxy ignora errores de
  certificado SSL para poder medir disponibilidad de servicios
  con certificados autofirmados o expirados.

**Causa C: Demasiados Redirects (Redirecciones).**

- **Diagnóstico:** El `check-status.js` tiene un límite de
  seguimiento de redirecciones (`follow: 20`). Si la URL
  supera ese número de saltos, fallará.
- **Solución:** Utilice la URL de destino final en `data/webs.json`.

### Problema 2.2: El estado de latencia siempre es 'LENTO' o 'CRÍTICO'.

**Causa:** La constante `UMBRALES_LATENCIA` está demasiado
ajustada o el servidor está bajo carga.

**Solución:**

1.  **Revisar Justificación:** Consulte `JUSTIFICACION_RANGOS_LATENCIA.md`
    para entender los umbrales (300ms, 500ms, etc.).
2.  **Ajuste:** Si el rendimiento del servidor no puede mejorar,
    considere ajustar los valores en `script.js` (si no están
    centralizados) para que se adapten a la realidad operativa.

---

3. PROBLEMAS DEL FRONTEND Y DATOS

---

### Problema 3.1: Los promedios históricos no se reinician

después de cambiar una URL o arreglar un sitio.

**Causa:** El historial de latencia se almacena en el
navegador local (`sessionStorage`) y no en el servidor.
El promedio se sigue calculando con los datos antiguos.

**Solución:**

1.  **Botón Reiniciar:** Presione el botón "🔄 Reiniciar Monitoreo"
    junto al selector de duración. Esto limpiará todo el
    historial y reiniciará las mediciones.
2.  **Manualmente - Abrir Consola:** Vaya a las herramientas de desarrollo
    (F12), pestaña **Application** (Aplicación) o **Storage**
    (Almacenamiento).
3.  **Limpiar:** En `Session Storage`, busque las claves que comienzan
    con `historial_`, `promedio_`, `errores_` y bórrelas.
    Esto forzará al monitor a empezar a calcular los promedios
    desde cero en la siguiente ejecución.

### Problema 3.2: El Tema PRO (`monitor_pro.css`) no se aplica.

**Causa:** El parámetro de la URL está mal escrito o el archivo
no se carga.

**Solución:**

1.  **Verificar URL:** Asegúrese de que la URL termine exactamente
    con **`/?tema=pro`**.
2.  **Verificar Archivo:** Confirme que el archivo `monitor_pro.css`
    existe en la carpeta **`css/`** del proyecto.
3.  **Verificar config.js:** La constante `TEMA_FILES` en `js/config.js`
    debe contener el mapeo correcto de temas a archivos CSS.
4.  **Verificar config.js:** El objeto `DURACION_OPCIONES` debe

    # Guía de solución de problemas (troubleshooting)

    Este documento recoge las incidencias más comunes y cómo solucionarlas paso a paso.

    1. Despliegue y configuración

    - Problema: la página aparece en blanco tras desplegar.

      - Verificá los logs de Deploy en Netlify (Deploys) por errores.
      - Asegurate de que `netlify.toml` existe y apunta a `netlify/functions`.
      - Revisá `package.json` si faltan dependencias (p. ej. `node-fetch`).

    - Problema: error 404/500 al invocar la función proxy.
      - Confirmá que `netlify/functions/check-status.js` exista.
      - Verificá que `js/config.js` tenga `PROXY_ENDPOINT = '/.netlify/functions/check-status'`.

    2. Disponibilidad y latencia

    - Problema: un sitio aparece como "CAÍDA" pero está online.

      - Revisá `webs.json` por errores de URL (protocolo, dominio mal escrito).
      - Puede deberse a timeout del proxy (por defecto 9s). Si la API es muy lenta, considera optimizaciones o ajustar timeouts en la función.
      - Evitá URLs que redirijan muchas veces; usa la URL final.

    - Problema: latencias siempre en 'LENTO' o 'CRÍTICO'.
      - Revisá los umbrales en `js/config.js` y consultá `docs/justificacion_rangos_latencia.md`.
      - Si el servicio no puede mejorar, ajustá los umbrales para reflejar la realidad operativa.

    3. Frontend y datos

    - Problema: los promedios históricos no se reinician.

      - El historial se guarda en `sessionStorage`. Usá el botón "Reiniciar Monitoreo" para limpiar datos.
      - O limpiá manualmente `sessionStorage` desde las herramientas del navegador (Application → Session Storage).

    - Problema: un tema no se aplica.
      - Verificá el parámetro `?tema=` en la URL y la existencia del archivo CSS en `css/`.
      - Confirmá que `TEMA_FILES` en `js/config.js` tenga el mapeo correcto.

    4. Sistema de expansión de errores

    - Problema: el toggle de errores no funciona.
      - Verificá que la función `toggleErrores(url)` esté definida y que el HTML tenga el `onclick` correcto.
      - Revisá consola por errores JavaScript.

    5. Selector de duración

    - Problema: cambiar la duración no afecta el historial.
      - Comprobá que existe el `<select id="selector-duracion">` y que el evento `change` actualiza `sessionStorage`.
      - Usá "Reiniciar Monitoreo" tras cambiar la duración.

    6. Leyenda y estilos

    - Problema: `leyenda.html` muestra estilos rotos.
      - Verificá que los archivos `leyenda_*.css` existen en `css/`.
      - Asegurate de pasar `?tema=` en la URL si querés un tema específico.

    7. Internacionalización (i18n)

    - Problema: los textos aparecen en el idioma equivocado.
      - Agregá `?lang=es` o `?lang=en` a la URL.
      - Revisá que `js/i18n_es.js` y `js/i18n_en.js` estén presentes y sin errores de sintaxis.

    Si necesitás, puedo agregar comprobaciones automáticas o pequeños scripts para validar la estructura de `webs.json` y la existencia de archivos CSS/JS al desplegar.
