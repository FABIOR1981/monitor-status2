// monitoreo.js
// El corazón de la app: pedir el estado real de cada sitio (proxy + fallback
// directo desde el navegador), dibujar/actualizar la tabla, y manejar el
// detalle expandible de errores (tanto en la tabla como en la vista de
// tarjetas).

/**
 * Llama al proxy de Netlify para saber el estado y la latencia de una URL.
 */
async function verificarEstado(url) {
  // =======================================================
  // PASO 1: Intentar via proxy (Netlify Function)
  // =======================================================
  try {
    const response = await fetch(
      `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`
    );

    if (!response.ok) {
      console.warn(`Proxy error HTTP ${response.status} para ${url}`);
      // Proxy falló, intentar verificación directa
      return await verificarDirecto(url);
    }

    const data = await response.json();

    // Si el DNS falló, el dominio realmente no existe/no resuelve.
    // Esto NO es algo que un WAF pueda "fingir": la resolución DNS es
    // pública e igual para todo el mundo. NO tiene sentido pasar a
    // verificación directa acá, porque el truco del <img> del navegador
    // no puede distinguir "DNS inexistente" de "404 normal" (ambos fallan
    // rápido) y terminaría marcando como "arriba" un sitio que no existe.
    if (data.errorType === 'DNS_ERROR') {
      console.log(`DNS inexistente para ${url}, se marca como caído sin verificación directa.`);
      return data;
    }

    // Si el proxy dice que el sitio está caído (status 0) por otro motivo
    // (bloqueo, timeout, conexión rechazada), sí verificamos directamente
    // porque el proxy puede estar bloqueado por el WAF
    if (data.status === 0 || data.status === ESTADO_ERROR_CONEXION) {
      console.log(`Proxy reporta caído para ${url}, verificando directamente...`);
      return await verificarDirecto(url);
    }

    return data;

  } catch (error) {
    console.warn(`Proxy no disponible para ${url}:`, error.message);
    return await verificarDirecto(url);
  }
}

/**
 * Verificación directa desde el navegador usando una imagen.
 * El navegador del usuario tiene IP "normal" no bloqueada por WAF.
 * No hay restricciones CORS para cargar imágenes.
 */
async function verificarDirecto(url) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const img = new Image();
    let resolved = false;

    // Timeout de 10 segundos para la imagen
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        img.onload = img.onerror = null;
        // La imagen no cargó en 10s → probablemente caído
        resolve({
          time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
          status: 0,
          error: 'Sin respuesta (verificación directa)',
          verifiedDirect: true,
        });
      }
    }, 10000);

    // La imagen cargó (aunque sea error 404) → el servidor responde
    img.onload = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const time = Math.round(performance.now() - startTime);
      console.log(`✅ Verificación directa OK para ${url}: ${time}ms`);
      resolve({
        time: time,
        status: 200,
        verifiedDirect: true,
      });
    };

    // Error al cargar la imagen → puede ser 404 (favicon no existe) pero servidor responde
    // o puede ser que realmente no hay conexión
    img.onerror = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const time = Math.round(performance.now() - startTime);

      // Si tardó menos de 8 segundos, probablemente es 404 (favicon no existe)
      // pero el servidor respondió → el sitio funciona
      if (time < 8000) {
        console.log(`✅ Verificación directa OK (404 favicon) para ${url}: ${time}ms`);
        resolve({
          time: time,
          status: 200,
          verifiedDirect: true,
        });
      } else {
        // Tardó mucho → probablemente timeout real
        console.log(`❌ Verificación directa falló para ${url}: timeout`);
        resolve({
          time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
          status: 0,
          error: 'Timeout en verificación directa',
          verifiedDirect: true,
        });
      }
    };

    // Usamos favicon.ico con timestamp para evitar cache
    const faviconUrl = new URL('/favicon.ico', url).href + '?_t=' + Date.now();
    img.src = faviconUrl;
  });
}

/**
 * Dibuja las filas iniciales con los datos de carga (placeholders).
 */
function dibujarFilasIniciales(servicios) {
  const tbody = document.getElementById('status-table-body');
  tbody.innerHTML = ''; // Limpiar tabla

  // Calcular el conteo máximo del historial para actualizar el encabezado
  let maxValidCount = 0;
  servicios.forEach((web) => {
    const { validCount } = calcularPromedio(web.url);
    maxValidCount = Math.max(maxValidCount, validCount);

    const row = tbody.insertRow();
    // ID que nos permite encontrar la fila para la actualización asíncrona
    row.dataset.url = web.url;

    // Columna 1: Servicio (AHORA CON HIPERVÍNCULO)
    row.insertCell().innerHTML = `<a href="${web.url}" target="_blank">${web.nombre}</a>`;

    // Columna 2: URL (Oculta en styles.css)
    row.insertCell().innerHTML = `<a href="${web.url}" target="_blank">${web.url}</a>`;

    // Columna 3: Latencia Actual (Placeholder)
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;

    // Columna 4: Estado Actual (Placeholder)
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;

    // Columna 5: Promedio (ms) - Placeholder
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;

    // Columna 6: Estado Promedio (Placeholder)
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;

    // Columna 7: Acción (Placeholder)
    row.insertCell().textContent = '';

    // Accesibilidad: añadir aria-label y role a las celdas de estado (placeholders)
    // (Es más robusto añadirlo aquí para que estén presentes antes de la actualización)
    // Aplicar atributos de accesibilidad a las celdas de estado en la fila
    aplicarAccesibilidadEstadoEnFila(row, {
      actual: window.TEXTOS_ACTUAL.general.LOADING,
      promedio: window.TEXTOS_ACTUAL.general.LOADING,
    });
  });

  // Actualizar el encabezado una vez con el historial guardado (puede ser 0/12 si está vacío)
  actualizarEncabezadoPromedio(maxValidCount);
}

/**
 * [Accesibilidad] Agrega roles y etiquetas ARIA a las celdas de estado de una fila.
 * @param {HTMLTableRowElement} row - Fila de la tabla con celdas de estado en las posiciones 3 y 5.
 * @param {Object} labels - Opcional: {actual: string, promedio: string} con textos accesibles.
 */
function aplicarAccesibilidadEstadoEnFila(row, labels = {}) {
  if (!row) return;
  const statusActual = row.cells[3];
  const statusProm = row.cells[5];

  const actualText =
    labels.actual !== undefined
      ? labels.actual
      : statusActual
      ? statusActual.textContent.trim()
      : '';
  const promText =
    labels.promedio !== undefined
      ? labels.promedio
      : statusProm
      ? statusProm.textContent.trim()
      : '';

  if (statusActual) {
    statusActual.setAttribute('role', 'status');
    statusActual.setAttribute(
      'aria-label',
      actualText || window.TEXTOS_ACTUAL.general.LOADING
    );
  }
  if (statusProm) {
    statusProm.setAttribute('role', 'status');
    statusProm.setAttribute(
      'aria-label',
      promText || window.TEXTOS_ACTUAL.general.LOADING
    );
  }
}

/**
 * Devuelve la lista de errores del historial para una URL
 */
function obtenerHistorialErrores(url) {
  const historial = historialStatus[url] || [];
  return historial.filter(
    (entry) =>
      entry.status !== 200 || entry.time >= UMBRALES_LATENCIA.PENALIZACION_FALLO
  );
}

/**
 * Convierte un timestamp a un formato fácil de leer: "14/12 10:45"
 */
function formatearFecha(timestamp) {
  const fecha = new Date(timestamp);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

/**
 * Muestra u oculta el detalle de errores en una fila
 */
function toggleErroresDetalle(url) {
  // NUEVO: en vista de tarjetas, el detalle debe insertarse junto a la
  // tarjeta correspondiente (la tabla está oculta y no sirve como destino).
  if (typeof vistaActual !== 'undefined' && vistaActual === 'tarjetas') {
    toggleErroresDetalleTarjeta(url);
    return;
  }

  const tbody = document.getElementById('status-table-body');
  const row = tbody.querySelector(`tr[data-url="${CSS.escape(url)}"]`);
  if (!row) return;

  const toggleBtn = row.querySelector('.toggle-errors-button');

  // Buscar si ya existe una fila de detalle para esta URL
  let detalleRow = null;
  let nextRow = row.nextElementSibling;
  if (
    nextRow &&
    nextRow.classList.contains('error-detail-row') &&
    nextRow.getAttribute('data-parent-url') === url
  ) {
    detalleRow = nextRow;
  }

  // Si ya existe la fila de detalle, colapsar
  if (detalleRow) {
    detalleRow.classList.remove('expanded');
    if (toggleBtn) toggleBtn.textContent = '▼';
    setTimeout(() => {
      if (detalleRow && detalleRow.parentNode) {
        detalleRow.remove();
      }
    }, 200); // Esperar animación
    return;
  }

  // Crear nueva fila de detalle
  const errores = obtenerHistorialErrores(url);
  if (errores.length === 0) return;

  // Crear fila usando createElement para mejor control
  const newRow = document.createElement('tr');
  newRow.classList.add('error-detail-row');
  newRow.setAttribute('data-parent-url', url);

  const cell = document.createElement('td');
  cell.colSpan = 7; // Todas las columnas

  const maxErrores = 10;
  const erroresLimitados = errores.slice(-maxErrores);
  const hayMas = errores.length > maxErrores;

  let html = '<div class="error-detail-container">';
  html += `<div class="error-detail-header">⚠️ Errores detectados (${errores.length} de ${historialStatus[url].length} mediciones):</div>`;
  html += '<ul class="error-detail-list">';

  erroresLimitados.reverse().forEach((error) => {
    const fecha = formatearFecha(error.timestamp);
    const codigo = error.status;
    const latencia = error.time;
    const mensaje = codigo === 200 ? 'Timeout' : obtenerMensajeError(codigo);

    html += `<li>`;
    html += `<span class="error-time">${fecha}</span>`;
    html += ` → `;
    html += `<span class="error-code">${codigo}</span> `;
    html += `<span class="error-msg">${mensaje}</span> `;
    html += `<span class="error-latency">(${latencia}ms)</span>`;
    html += `</li>`;
  });

  html += '</ul>';

  if (hayMas) {
    html += `<div class="error-detail-footer">...mostrando últimos ${maxErrores} errores</div>`;
  }

  html += '</div>';

  cell.innerHTML = html;
  newRow.appendChild(cell);

  // Insertar la fila inmediatamente después de la fila padre
  if (row.nextSibling) {
    tbody.insertBefore(newRow, row.nextSibling);
  } else {
    tbody.appendChild(newRow);
  }

  // Cambiar ícono del botón a expandido
  if (toggleBtn) toggleBtn.textContent = '▲';

  // Trigger animación
  setTimeout(() => newRow.classList.add('expanded'), 10);
}

/**
 * Muestra u oculta el detalle de errores para la VISTA DE TARJETAS.
 * Inserta el bloque de detalle como elemento propio del grid (spanning
 * todo el ancho), justo después de la tarjeta correspondiente.
 */
function toggleErroresDetalleTarjeta(url) {
  const grid = document.getElementById('grid-tarjetas');
  if (!grid) return;

  const card = grid.querySelector(
    `.tarjeta-servicio[data-url="${CSS.escape(url)}"]`
  );
  if (!card) return;

  // Si ya existe el detalle abierto para esta tarjeta, colapsar y quitar
  const detalleExistente = grid.querySelector(
    `.error-detail-card[data-parent-url="${CSS.escape(url)}"]`
  );
  if (detalleExistente) {
    detalleExistente.classList.remove('expanded');
    setTimeout(() => {
      if (detalleExistente && detalleExistente.parentNode) {
        detalleExistente.remove();
      }
    }, 200);
    return;
  }

  const errores = obtenerHistorialErrores(url);
  if (errores.length === 0) return;

  const maxErrores = 10;
  const erroresLimitados = errores.slice(-maxErrores);
  const hayMas = errores.length > maxErrores;

  let html = '<div class="error-detail-container">';
  html += `<div class="error-detail-header">⚠️ Errores detectados (${errores.length} de ${historialStatus[url].length} mediciones):</div>`;
  html += '<ul class="error-detail-list">';

  erroresLimitados.reverse().forEach((error) => {
    const fecha = formatearFecha(error.timestamp);
    const codigo = error.status;
    const latencia = error.time;
    const mensaje = codigo === 200 ? 'Timeout' : obtenerMensajeError(codigo);

    html += `<li>`;
    html += `<span class="error-time">${fecha}</span>`;
    html += ` → `;
    html += `<span class="error-code">${codigo}</span> `;
    html += `<span class="error-msg">${mensaje}</span> `;
    html += `<span class="error-latency">(${latencia}ms)</span>`;
    html += `</li>`;
  });

  html += '</ul>';

  if (hayMas) {
    html += `<div class="error-detail-footer">...mostrando últimos ${maxErrores} errores</div>`;
  }

  html += '</div>';

  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'error-detail-card';
  detalleDiv.setAttribute('data-parent-url', url);
  detalleDiv.innerHTML = html;

  // Insertar justo después de la tarjeta correspondiente
  card.insertAdjacentElement('afterend', detalleDiv);

  // Trigger animación
  setTimeout(() => detalleDiv.classList.add('expanded'), 10);
}

// Hacer función accesible globalmente
window.toggleErroresDetalle = toggleErroresDetalle;

/**
 * Devuelve un mensaje entendible para cada código de error
 */
function obtenerMensajeError(codigo) {
  const mensajes = {
    0: 'Sin conexión',
    301: 'Redireccionamiento',
    302: 'Redireccionamiento',
    400: 'Solicitud incorrecta',
    401: 'No autorizado',
    403: 'Prohibido',
    404: 'No encontrado',
    408: 'Timeout',
    418: 'Tetera',
    429: 'Demasiadas solicitudes',
    500: 'Error servidor',
    502: 'Gateway error',
    503: 'No disponible',
    504: 'Gateway timeout',
  };
  return mensajes[codigo] || obtenerDescripcionPorRango(codigo);
}

/**
 * Actualiza una fila de la tabla con los datos reales.
 */
function actualizarFila(web, resultado) {
  const tbody = document.getElementById('status-table-body');
  // Escapar caracteres especiales en la URL para la selección del atributo data-url
  const row = tbody.querySelector(`tr[data-url="${CSS.escape(web.url)}"]`);

  if (!row) return;

  // Borde izquierdo azul para mediciones directas (red interna)
  if (resultado.verifiedDirect) {
    row.style.borderLeft = '4px solid #3498db';
    row.title = 'Medición directa desde navegador (red interna)';
  } else {
    row.style.borderLeft = '';
    row.title = '';
  }

  // --- Lógica de cálculo y estado ---
  const estadoActual = obtenerEstadoVisual(resultado.time, resultado.status, resultado.verifiedDirect);
  // Nota: calcularPromedio() obtiene los datos del historial que ACABA de ser actualizado
  const { promedio, promedioProxy, promedioDirecto, estadoPromedio, fuentes } = calcularPromedio(web.url);

  // ALERTA: Solo alertar si el sitio REALMENTE está caído
  // No alertar si fue verificado directamente (verifiedDirect: true con status 200)
  // porque eso significa que el proxy estaba bloqueado pero el sitio funciona
  const sitioRealmenteCaido = resultado &&
    (resultado.status === 0 || resultado.status >= 400) &&
    !resultado.verifiedDirect;

  if (sitioRealmenteCaido) {
    window.registrarErrorSitio &&
      window.registrarErrorSitio(
        web.nombre || web.url,
        web.url,
        resultado.time,
        resultado.status,
        resultado.error || '',
        resultado.diagnostics || resultado.attempts || null
      );
  } else if (resultado && (resultado.status === 200 || resultado.verifiedDirect)) {
    // Si el sitio funciona (directo o via proxy), limpiar alertas previas
    window.limpiarErrorSitio && window.limpiarErrorSitio(web.nombre || web.url);
  }

  // --- Actualización de celdas (Columnas 3 a 7) ---

  // Columna 3: Latencia Actual (índice 2)
  row.cells[2].textContent = `${resultado.time} ms ${resultado.verifiedDirect ? '🖥️' : '🌐'}`;
  row.cells[2].title = resultado.verifiedDirect 
    ? 'Medición directa desde navegador (red interna)' 
    : 'Medición vía proxy serverless (internet)';

  // Columna 4: Estado Actual (índice 3)
  row.cells[3].textContent = estadoActual.text;
  row.cells[3].title = resultado.verifiedDirect 
    ? 'Estado verificado directamente desde navegador' 
    : 'Estado vía proxy serverless';
  row.cells[3].className = estadoActual.className;

  // Obtener tema actual y verificar si permite expansión (todos menos DEF y OSC)
  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;
  const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);

  // Hacer clickeable el badge si hay errores y el tema lo permite
  const errores = obtenerHistorialErrores(web.url);
  if (errores.length > 0 && permiteExpansion) {
    row.cells[3].style.cursor = 'pointer';
    row.cells[3].title = 'Click para ver detalles de errores';
    row.cells[3].onclick = () => toggleErroresDetalle(web.url);
  } else {
    row.cells[3].style.cursor = '';
    row.cells[3].title = '';
    row.cells[3].onclick = null;
  }

  // Columna 5: Promedio (ms) (índice 4)
  // Mostrar promedios separados por fuente si hay mediciones mixtas
  let textoPromedio = '';
  let tooltipPromedio = '';

  if (promedioProxy !== null && promedioDirecto !== null) {
    // Hay mediciones mixtas: mostrar ambos promedios
    textoPromedio = `${promedioProxy} ms 🌐 / ${promedioDirecto} ms 🖥️`;
    tooltipPromedio = `Promedio proxy: ${promedioProxy}ms (${fuentes.proxy} mediciones) | Promedio directo: ${promedioDirecto}ms (${fuentes.direct} mediciones)`;
  } else if (promedioDirecto !== null) {
    // Solo mediciones directas
    textoPromedio = `${promedioDirecto} ms 🖥️`;
    tooltipPromedio = `Promedio directo: ${promedioDirecto}ms (${fuentes.direct} mediciones)`;
  } else if (promedioProxy !== null) {
    // Solo mediciones proxy
    textoPromedio = `${promedioProxy} ms 🌐`;
    tooltipPromedio = `Promedio proxy: ${promedioProxy}ms (${fuentes.proxy} mediciones)`;
  } else {
    // Sin mediciones exitosas
    textoPromedio = '0 ms';
    tooltipPromedio = 'Sin mediciones exitosas';
  }

  // Agregar contador de errores si existen y el tema lo permite
  const totalMediciones = (historialStatus[web.url] || []).length;
  const contadorErrores =
    errores.length > 0 && permiteExpansion
      ? ` ⚠️ ${errores.length}/${totalMediciones}`
      : '';
  row.cells[4].textContent = textoPromedio + contadorErrores;
  row.cells[4].title = tooltipPromedio;

  // Columna 6: Estado Promedio (índice 5)
  row.cells[5].textContent = estadoPromedio.text;
  row.cells[5].title = resultado.verifiedDirect 
    ? 'Estado promedio con verificación directa' 
    : 'Estado promedio vía proxy';
  row.cells[5].className = estadoPromedio.className;

  // Hacer clickeable el badge promedio si hay errores y el tema lo permite
  if (errores.length > 0 && permiteExpansion) {
    row.cells[5].style.cursor = 'pointer';
    row.cells[5].title = 'Click para ver detalles de errores';
    row.cells[5].onclick = () => toggleErroresDetalle(web.url);
  } else {
    row.cells[5].style.cursor = '';
    row.cells[5].title = '';
    row.cells[5].onclick = null;
  }

  // Accesibilidad: actualizar atributos de forma consistente después de actualizar el texto
  aplicarAccesibilidadEstadoEnFila(row, {
    actual: estadoActual.text,
    promedio: estadoPromedio.text,
  });

  // Columna 7: Acción (índice 6)
  let actionsHTML = '';

  // Botón PSI (solo en temas PRO/MIN)
  if (permiteExpansion) {
    actionsHTML += `<button class="psi-button" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>`;
  }

  row.cells[6].innerHTML = actionsHTML;
}

/**
 * Función principal: pide los datos al proxy, procesa los resultados y actualiza la pantalla.
 */
async function monitorearTodosWebsites() {
  // 0. Limpiar el temporizador anterior
  if (window.monitorTimeout) {
    clearTimeout(window.monitorTimeout);
    window.monitorTimeout = null;
  }

  // 1. Cargar la lista de websites desde data/webs.json y ordenar
  try {
    const response = await fetch('data/webs.json');
    websitesData = await response.json();
  } catch (e) {
    console.error('Error al cargar webs.json.', e);
    actualizarUltimaActualizacion(new Date());
    window.monitorTimeout = setTimeout(
      monitorearTodosWebsites,
      FRECUENCIA_MONITOREO_MS
    );
    return;
  }

  if (websitesData.length === 0) {
    actualizarUltimaActualizacion(new Date());
    window.monitorTimeout = setTimeout(
      monitorearTodosWebsites,
      FRECUENCIA_MONITOREO_MS
    );
    return;
  }

  // Dibuja los placeholders y pone 'Cargando...'
  websitesData = ordenarServiciosPersonalizado(websitesData);
  dibujarFilasIniciales(websitesData);
  actualizarUltimaActualizacion(null);

  // Usamos Promise.allSettled para que si un servicio falla, no corte el monitoreo de los otros
  const promesas = websitesData.map((web) => verificarEstado(web.url));
  const allResults = await Promise.allSettled(promesas);

  // Convertimos los resultados a un formato simple para analizar si hay fallo global
  const resultadosMonitoreo = [];
  allResults.forEach((result, index) => {
    const web = websitesData[index];
    let res;

    if (result.status === 'fulfilled') {
      res = result.value;
    } else {
      // Penalizamos con PENALIZACION_FALLO para que los errores de red
      // aparezcan claramente como servicios caídos en la UI
      res = {
        time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
        status: ESTADO_ERROR_CONEXION,
        proxyError: true,
      };
    }

    // Agregar al array para el análisis global
    resultadosMonitoreo.push({
      url: web.url,
      time: res.time,
      status: res.status,
      verifiedDirect: res.verifiedDirect || false,
    });
  });

  // =======================================================
  // 3. LÓGICA DE FALLO GLOBAL
  // =======================================================
  //const esFalloCritico = determinarFalloGlobal(websitesData, resultadosMonitoreo);
  const { esFallo: esFalloCritico, motivo: motivoFallo } =
    determinarFalloGlobal(websitesData, resultadosMonitoreo);
  mostrarAdvertenciaGlobal(esFalloCritico);

  if (allResults.every((r) => r.status === 'rejected')) {
    mostrarAdvertenciaGlobal(
      true,
      'Fallo total de red: El proxy no respondió para ningún sitio.'
    );
  } else {
    mostrarAdvertenciaGlobal(esFalloCritico, motivoFallo);
  }

  if (esFalloCritico) {
    console.warn(
      'Se detectó un Fallo Global Crítico. Se omite la actualización de la tabla y historial con estos datos. El usuario verá el aviso.'
    );

    // Solo actualizamos el timestamp. La tabla mantiene los datos del historial ANTERIOR
    actualizarUltimaActualizacion(new Date());

    // Programar la próxima ejecución y retornar
    window.monitorTimeout = setTimeout(
      monitorearTodosWebsites,
      FRECUENCIA_MONITOREO_MS
    );
    return;
  }

  // =======================================================
  // 4. SI NO ES CRÍTICO, APLICAR DATOS Y ACTUALIZAR UI NORMALMENTE
  // =======================================================
  let maxValidCount = 0;

  // Recorremos los resultados y actualizamos historial y tabla
  resultadosMonitoreo.forEach((res) => {
    const web = websitesData.find((w) => w.url === res.url);

    // 4.1. Guardar el historial (con fuente: proxy o direct)
    actualizarHistorial(res.url, res.time, res.status, res.verifiedDirect ? 'direct' : 'proxy');

    // 4.2. Actualizar la fila en la pantalla
    actualizarFila(web, res);

    // 4.3. Recalcular el contador para el encabezado
    const { validCount } = calcularPromedio(res.url);
    maxValidCount = Math.max(maxValidCount, validCount);
  });

  // 5. Terminar y programar el próximo monitoreo
  actualizarEncabezadoPromedio(maxValidCount);
  actualizarUltimaActualizacion(new Date());

  // NUEVO: Si la vista de tarjetas está activa, actualizarla también
  renderizarTarjetasSiNecesario();

  // Solo programamos el siguiente monitoreo si todavía no llegamos al máximo
  if (!historialCompleto()) {
    window.monitorTimeout = setTimeout(
      monitorearTodosWebsites,
      FRECUENCIA_MONITOREO_MS
    );
  } else {
    console.log(
      'Historial completo. Monitoreo pausado. Use el botón Reiniciar para continuar.'
    );
  }
}
