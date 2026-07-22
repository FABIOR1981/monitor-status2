let temaProActivo = false;
let websitesData = [];
let historialStatus = {};
let maxHistorialActual = MAX_HISTORIAL_ENTRIES;

// Cargar alertas_error.js para alertas de error por hora
(function () {
  const scriptAlertas = document.createElement('script');
  scriptAlertas.src = 'js/alertas_error.js';
  document.head.appendChild(scriptAlertas);
})();

function configurarEnlaceLeyenda() {
  const enlaceLeyenda = document.getElementById('enlace-leyenda');
  if (enlaceLeyenda) {
    enlaceLeyenda.href = `leyenda.html${window.location.search}`;
  }
}

function obtenerDuracionSeleccionada() {
  const guardado = localStorage.getItem('duracionMonitoreo');
  return guardado && DURACION_OPCIONES[guardado] ? guardado : DURACION_DEFAULT;
}

function guardarDuracionSeleccionada(duracion) {
  localStorage.setItem('duracionMonitoreo', duracion);
}

function inicializarSelectorDuracion() {
  const selector = document.getElementById('duracion-selector');
  if (!selector) return;

  selector.innerHTML = '';

  Object.keys(DURACION_OPCIONES).forEach((key) => {
    const opcion = DURACION_OPCIONES[key];
    const option = document.createElement('option');
    option.value = key;

    const horas = parseInt(key);
    const textoHoras =
      horas === 1
        ? window.TEXTOS_ACTUAL.general.DURACION_HORA_SINGULAR
        : window.TEXTOS_ACTUAL.general.DURACION_HORA_PLURAL;

    option.textContent = `${horas} ${textoHoras} (${opcion.mediciones} ${window.TEXTOS_ACTUAL.general.DURACION_MEDICIONES})`;
    selector.appendChild(option);
  });

  const duracionGuardada = obtenerDuracionSeleccionada();
  selector.value = duracionGuardada;
  maxHistorialActual = DURACION_OPCIONES[duracionGuardada].mediciones;

  const label = document.getElementById('duracion-label');
  if (label && window.TEXTOS_ACTUAL) {
    label.textContent = window.TEXTOS_ACTUAL.general.DURACION_LABEL;
  }

  selector.addEventListener('change', (e) => {
    const nuevaDuracion = e.target.value;
    guardarDuracionSeleccionada(nuevaDuracion);
    maxHistorialActual = DURACION_OPCIONES[nuevaDuracion].mediciones;
    // Borramos el historial porque los datos viejos ya no sirven si cambiaste la duración
    historialStatus = {};
    guardarHistorial();
    monitorearTodosWebsites();
  });
}

// ===============================
// 2. Idiomas y manejo del DOM
// ===============================
//
async function cargarIdioma() {
  const idiomaSolicitado = obtenerIdiomaSeleccionado();
  const idiomaDefault = DEFAULT_LANG;

  try {
    await cargarIdiomaScript(idiomaSolicitado);
    return;
  } catch (errorSolicitado) {
    if (idiomaSolicitado !== idiomaDefault) {
      try {
        await cargarIdiomaScript(idiomaDefault);
        return;
      } catch (errorDefault) {
        throw new Error(
          `Fallo crítico: El idioma solicitado (${idiomaSolicitado}) y el de reserva (${idiomaDefault}) fallaron en la carga.`
        );
      }
    }

    throw new Error(
      `Fallo crítico: No se pudo cargar el idioma por defecto (${idiomaDefault}).`
    );
  }
}
function obtenerIdiomaSeleccionado() {
  const params = new URLSearchParams(window.location.search);
  const langUrl = params.get('lang');

  if (langUrl && I18N_FILES[langUrl]) {
    return langUrl;
  }

  return DEFAULT_LANG;
}

function cargarIdiomaScript(idiomaACargar) {
  const filePath = I18N_FILES[idiomaACargar];

  if (!filePath) {
    return Promise.reject(
      new Error(
        `Error de configuración: Archivo de idioma no definido para ${idiomaACargar}`
      )
    );
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = filePath;
    script.type = 'text/javascript';

    script.onload = () => {
      if (window.TEXTOS_ACTUAL) {
        resolve();
      } else {
        reject(
          new Error(
            `El archivo de idioma ${filePath} no asignó la variable TEXTOS_ACTUAL`
          )
        );
      }
    };

    script.onerror = () => {
      reject(new Error(`Fallo al cargar el script de idioma: ${filePath}`));
    };

    document.head.appendChild(script);
  });
}

function actualizarEncabezadoPromedio(count) {
  const elemento = document.getElementById('header-promedio-ms');
  if (elemento) {
    elemento.textContent = `${window.TEXTOS_ACTUAL.tabla.HEADER_PROMEDIO_MS} [${count}/${maxHistorialActual}]`;
  }
}

function inicializarEtiquetas() {
  const tituloEl = document.getElementById('titulo-principal');
  if (tituloEl) tituloEl.textContent = window.TEXTOS_ACTUAL.general.PAGE_TITLE;

  const infoBar = document.getElementById('info-bar-msg');
  if (infoBar) infoBar.textContent = window.TEXTOS_ACTUAL.general.INFO_BAR;

  const headers = [
    { id: 'header-service', text: window.TEXTOS_ACTUAL.tabla.HEADER_SERVICE },
    { id: 'header-url', text: window.TEXTOS_ACTUAL.tabla.HEADER_URL },
    {
      id: 'header-latency-actual',
      text: window.TEXTOS_ACTUAL.tabla.HEADER_LATENCY_ACTUAL,
    },
    {
      id: 'header-status-actual',
      text: window.TEXTOS_ACTUAL.tabla.HEADER_STATUS_ACTUAL,
    },
    {
      id: 'header-promedio-ms',
      text: window.TEXTOS_ACTUAL.tabla.HEADER_PROMEDIO_MS,
    },
    {
      id: 'header-promedio-status',
      text: window.TEXTOS_ACTUAL.tabla.HEADER_PROMEDIO_STATUS,
    },
    { id: 'header-action', text: window.TEXTOS_ACTUAL.tabla.HEADER_ACTION },
  ];

  headers.forEach((h) => {
    const element = document.getElementById(h.id);
    if (element) element.textContent = h.text;
  });

  const btnReiniciar = document.getElementById('texto-btn-reiniciar');
  if (btnReiniciar)
    btnReiniciar.textContent = window.TEXTOS_ACTUAL.general.BTN_REINICIAR;

  actualizarUltimaActualizacion(null);

  // Mostrar/ocultar enlace ABM según el tema
  actualizarVisibilidadABM();

  // Mostrar/ocultar columna de acción según el tema
  actualizarVisibilidadColumnaAccion();
}

function actualizarUltimaActualizacion(fecha) {
  const elemento = document.getElementById('ultima-actualizacion');
  if (!elemento) return;

  if (fecha) {
    const opciones = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    const fechaFormateada = fecha.toLocaleTimeString('es-ES', opciones);
    elemento.innerHTML = `${window.TEXTOS_ACTUAL.general.LAST_UPDATE} <strong>${fechaFormateada}</strong>`;
  } else {
    elemento.innerHTML = `
      ${window.TEXTOS_ACTUAL.general.LAST_UPDATE} 
      <span class="loading-text">${window.TEXTOS_ACTUAL.general.LOADING}</span><span class="spinner" title="${window.TEXTOS_ACTUAL.general.LOADING}"></span>
    `;
  }
}

function obtenerEstadoVisual(tiempo, estado = 200, esVerificadoDirecto = false) {
  const tiempoNum = parseFloat(tiempo);

  // Si fue verificado directamente y el proxy decía "caído",
  // pero la verificación directa confirmó que funciona (status 200),
  // clasificar por velocidad, NO mostrar como caído
  if (esVerificadoDirecto && estado === 200) {
    // Clasificar por velocidad como cualquier otro sitio funcional
    const estadosVelocidad = [
      { umbral: UMBRALES_LATENCIA.MUY_RAPIDO, text: window.TEXTOS_ACTUAL.velocidad.VERY_FAST, className: 'status-very-fast' },
      { umbral: UMBRALES_LATENCIA.RAPIDO, text: window.TEXTOS_ACTUAL.velocidad.FAST, className: 'status-fast' },
      { umbral: UMBRALES_LATENCIA.NORMAL, text: window.TEXTOS_ACTUAL.velocidad.NORMAL, className: 'status-normal' },
      { umbral: UMBRALES_LATENCIA.LENTO, text: window.TEXTOS_ACTUAL.velocidad.SLOW, className: 'status-slow' },
      { umbral: UMBRALES_LATENCIA.CRITICO, text: window.TEXTOS_ACTUAL.velocidad.CRITICAL, className: 'status-critical' },
      { umbral: UMBRALES_LATENCIA.RIESGO, text: window.TEXTOS_ACTUAL.velocidad.RISK, className: 'status-risk' },
    ];

    for (const ev of estadosVelocidad) {
      if (tiempoNum <= ev.umbral) {
        return { text: ev.text, className: ev.className };
      }
    }
    return { text: window.TEXTOS_ACTUAL.velocidad.EXTREME_RISK, className: 'status-extreme-risk' };
  }

  if (estado !== 200 || tiempoNum >= UMBRALES_LATENCIA.PENALIZACION_FALLO) {
    const descripcionEstado =
      window.TEXTOS_ACTUAL.httpStatus?.[estado] ||
      window.TEXTOS_ACTUAL.httpStatus?.GENERIC;

    const textoFallo =
      estado !== 200
        ? `${window.TEXTOS_ACTUAL.estados.DOWN_ERROR} (${estado} - ${descripcionEstado})`
        : window.TEXTOS_ACTUAL.estados.DOWN_ERROR;

    return {
      text: textoFallo,
      className: 'status-down',
    };
  }

  const estadosVelocidad = [
    {
      umbral: UMBRALES_LATENCIA.MUY_RAPIDO,
      text: window.TEXTOS_ACTUAL.velocidad.VERY_FAST,
      className: 'status-very-fast',
    },
    {
      umbral: UMBRALES_LATENCIA.RAPIDO,
      text: window.TEXTOS_ACTUAL.velocidad.FAST,
      className: 'status-fast',
    },
    {
      umbral: UMBRALES_LATENCIA.NORMAL,
      text: window.TEXTOS_ACTUAL.velocidad.NORMAL,
      className: 'status-normal',
    },
    {
      umbral: UMBRALES_LATENCIA.LENTO,
      text: window.TEXTOS_ACTUAL.velocidad.SLOW,
      className: 'status-slow',
    },
    {
      umbral: UMBRALES_LATENCIA.CRITICO,
      text: window.TEXTOS_ACTUAL.velocidad.CRITICAL,
      className: 'status-critical',
    },
    {
      umbral: UMBRALES_LATENCIA.RIESGO,
      text: window.TEXTOS_ACTUAL.velocidad.RISK,
      className: 'status-risk',
    },
  ];

  for (const estadoVelocidad of estadosVelocidad) {
    if (tiempoNum <= estadoVelocidad.umbral) {
      return {
        text: estadoVelocidad.text,
        className: estadoVelocidad.className,
      };
    }
  }

  return {
    text: window.TEXTOS_ACTUAL.velocidad.EXTREME_RISK,
    className: 'status-extreme-risk',
  };
}
// Ordena los servicios: primero los críticos (orden=1), después el resto en orden alfabético
function ordenarServiciosPersonalizado(servicios) {
  // Los críticos van primero, el resto se ordena por nombre para que sea fácil de encontrar
  const fijos = servicios.filter((servicio) => servicio.orden === 1);
  const ordenables = servicios.filter((servicio) => servicio.orden !== 1);

  ordenables.sort((a, b) => {
    const nombreA = a.nombre.toUpperCase();
    const nombreB = b.nombre.toUpperCase();
    if (nombreA < nombreB) return -1;
    if (nombreA > nombreB) return 1;
    return 0;
  });

  return fijos.concat(ordenables);
}

function cargarHistorial() {
  const data = sessionStorage.getItem('monitorStatusHistorial');
  if (data) {
    historialStatus = JSON.parse(data);
  }
}

function guardarHistorial() {
  sessionStorage.setItem(
    'monitorStatusHistorial',
    JSON.stringify(historialStatus)
  );
}

function historialCompleto() {
  // Verificar si al menos un servicio alcanzó el máximo de monitoreos
  for (const url in historialStatus) {
    if (
      historialStatus[url] &&
      historialStatus[url].length >= maxHistorialActual
    ) {
      return true;
    }
  }
  return false;
}

function actualizarHistorial(url, time, status, source = 'proxy') {
  if (!historialStatus[url]) {
    historialStatus[url] = [];
  }

  // No agregar si ya alcanzamos el máximo configurado
  if (historialStatus[url].length >= maxHistorialActual) {
    return;
  }

  historialStatus[url].push({ time, status, source, timestamp: Date.now() });

  guardarHistorial();
}

// Calcula el promedio de latencia, pero solo cuenta los éxitos (status 200)
// Los fallos (99999ms) no afectan el promedio
function calcularPromedio(url) {
  const historial = historialStatus[url] || [];

  if (historial.length === 0) {
    return {
      promedio: 0,
      promedioProxy: null,
      promedioDirecto: null,
      estadoPromedio: obtenerEstadoVisual(0, 200),
      validCount: 0,
      historial: historial,
      fuentes: { proxy: 0, direct: 0 },
    };
  }

  // Separar mediciones por fuente
  const medicionesProxy = [];
  const medicionesDirectas = [];
  let fallos = 0;
  let ultimoCodigoError = 200;

  historial.forEach((entry) => {
    const esFallo =
      entry.status !== 200 ||
      entry.time >= UMBRALES_LATENCIA.PENALIZACION_FALLO;

    if (esFallo) {
      fallos++;
      ultimoCodigoError = entry.status;
    } else {
      if (entry.source === 'direct') {
        medicionesDirectas.push(entry.time);
      } else {
        medicionesProxy.push(entry.time);
      }
    }
  });

  const validCount = historial.length;
  const fuentes = {
    proxy: medicionesProxy.length,
    direct: medicionesDirectas.length,
  };

  // Calcular promedios por fuente
  const calcProm = (arr) => arr.length > 0 ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length) : null;
  const promedioProxy = calcProm(medicionesProxy);
  const promedioDirecto = calcProm(medicionesDirectas);

  // Promedio general (ponderado o solo el que exista)
  const promedioMs = promedioDirecto !== null && promedioProxy !== null
    ? Math.round((promedioDirecto + promedioProxy) / 2)
    : (promedioDirecto !== null ? promedioDirecto : promedioProxy);

  // Si más del 50% son fallos, mostrar como caída total
  if (fallos / validCount > 0.5 && validCount > 3) {
    return {
      promedio: 0,
      promedioProxy: promedioProxy,
      promedioDirecto: promedioDirecto,
      estadoPromedio: obtenerEstadoVisual(
        UMBRALES_LATENCIA.PENALIZACION_FALLO + 1,
        ultimoCodigoError
      ),
      validCount: validCount,
      historial: historial,
      fuentes: fuentes,
    };
  }

  // Si no hay mediciones exitosas (todas fallaron), mostrar como error
  if (promedioMs === null || promedioMs === undefined) {
    return {
      promedio: 0,
      promedioProxy: null,
      promedioDirecto: null,
      estadoPromedio: obtenerEstadoVisual(
        UMBRALES_LATENCIA.PENALIZACION_FALLO + 1,
        ultimoCodigoError
      ),
      validCount: validCount,
      historial: historial,
      fuentes: fuentes,
    };
  }

  return {
    promedio: promedioMs,
    promedioProxy: promedioProxy,
    promedioDirecto: promedioDirecto,
    estadoPromedio: obtenerEstadoVisual(promedioMs, 200),
    validCount: validCount,
    historial: historial,
    fuentes: fuentes,
  };
}

function mostrarAdvertenciaGlobal(esFalloCritico, motivoFallo = '') {
  const infoBar = document.getElementById('info-bar-msg');

  if (esFalloCritico) {
    let mensajeBase =
      window.TEXTOS_ACTUAL.general.ADVERTENCIA_FALLO_GLOBAL_HTML;

    if (temaProActivo && motivoFallo) {
      mensajeBase += `<br><small class="motivo-fallo">${window.TEXTOS_ACTUAL.general.MOTIVO_FALLO_PRO} ${motivoFallo}</small>`;
    }

    infoBar.innerHTML = `<strong>🚨 ${mensajeBase}🚨</strong>`;
    infoBar.classList.add('error-critical');
    sessionStorage.setItem('LAST_RUN_CRITICAL', 'true');
  } else {
    infoBar.textContent = window.TEXTOS_ACTUAL.general.INFO_BAR;
    infoBar.classList.remove('error-critical');
    sessionStorage.removeItem('LAST_RUN_CRITICAL');
  }
}

function determinarFalloGlobal(websitesData, resultados) {
  if (resultados.length === 0 || websitesData.length === 0) {
    return {
      esFallo: true,
      motivo: window.TEXTOS_ACTUAL.general.FALLO_CRITICO_RED,
    };
  }

  let totalSitios = websitesData.length;
  let sitiosEnFalloCritico = 0;
  let motivoFallo = '';

  const resultadosMap = resultados.reduce((map, item) => {
    map[item.url] = item;
    return map;
  }, {});

  const sitiosCriticos = websitesData.filter(
    (web) => web.grupo === GRUPO_CRITICO_NOMBRE
  );
  let criticosConFalloExtremo = 0;

  if (sitiosCriticos.length > 0) {
    sitiosCriticos.forEach((web) => {
      const res = resultadosMap[web.url];
      if (res && res.time > UMBRAL_FALLO_GLOBAL_MS) {
        criticosConFalloExtremo++;
      }
    });

    if (
      criticosConFalloExtremo === sitiosCriticos.length &&
      sitiosCriticos.length > 0
    ) {
      console.warn(
        `Alerta Global: Fallo del 100% en el grupo crítico "${GRUPO_CRITICO_NOMBRE}".`
      );
      motivoFallo = `${window.TEXTOS_ACTUAL.general.FALLO_CRITICO_GRUPO} "${GRUPO_CRITICO_NOMBRE}".`;
      return { esFallo: true, motivo: motivoFallo };
    }
  }

  resultados.forEach((res) => {
    if (res.time > UMBRAL_FALLO_GLOBAL_MS) {
      sitiosEnFalloCritico++;
    }
  });

  const porcentajeFallo = sitiosEnFalloCritico / totalSitios;
  const falloPorPorcentaje = porcentajeFallo >= PORCENTAJE_FALLO_GLOBAL;

  if (falloPorPorcentaje) {
    const porcentaje = Math.round(porcentajeFallo * 100);
    console.warn(
      `Alerta Global: ${porcentaje}% de los servicios superaron el umbral de ${UMBRAL_FALLO_GLOBAL_MS}ms.`
    );
    motivoFallo = `${porcentaje}${window.TEXTOS_ACTUAL.general.FALLO_CRITICO_LATENCIA_PARTE1} ${UMBRAL_FALLO_GLOBAL_MS}ms.`;
    return { esFallo: true, motivo: motivoFallo };
  }

  return { esFallo: false, motivo: '' };
}

// =======================================================
// 5. LÓGICA PRINCIPAL DE MONITOREO Y RENDERING ASÍNCRONO
// =======================================================

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

    // Si el proxy dice que el sitio está caído (status 0), verificar directamente
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
  return mensajes[codigo] || `Error ${codigo}`;
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
  if (vistaActual === 'tarjetas') {
    renderizarTarjetas();
  }

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

// ===============================
// 6. Temas y arranque de la app
// ===============================

/**
 * Obtiene el tema de los parámetros de la URL.
 * @returns {string | null} El nombre del tema o null.
 */
function obtenerTemaDeURL() {
  const params = new URLSearchParams(window.location.search);
  const tema = params.get('tema');
  if (tema === TEMA_DEFAULT) return TEMA_DEFAULT;
  if (tema === TEMA_PRO) return TEMA_PRO;
  if (tema === TEMA_PRO2) return TEMA_PRO2;
  if (tema === TEMA_MIN) return TEMA_MIN;
  if (tema === TEMA_OSC) return TEMA_OSC;
  return null;
}

/**
 * Lógica de cambio de tema: Prioriza la URL. Si no hay parámetro,
 * usa TEMA_DEFAULT.
 */
function inicializarTema() {
  const estiloPrincipal = document.getElementById('estilo-principal');
  let temaFinal = TEMA_DEFAULT;

  // 1. Intentar obtener el tema de la URL (MÁXIMA PRIORIDAD)
  const temaUrl = obtenerTemaDeURL();

  if (temaUrl) {
    temaFinal = temaUrl;
  }

  // 2. Aplicar el tema
  if (TEMA_FILES[temaFinal]) {
    estiloPrincipal.href = TEMA_FILES[temaFinal];
    temaProActivo = temaFinal !== TEMA_DEFAULT;
  } else {
    // Fallback de seguridad
    estiloPrincipal.href = TEMA_FILES[TEMA_DEFAULT];
    temaProActivo = false;
  }

  // 3. Actualizar el botón toggle
  actualizarBotonToggle(temaFinal);
}

/**
 * Actualiza el icono del botón toggle según el tema actual
 * Oculta el botón si el tema no tiene pareja de alternancia
 */
function actualizarBotonToggle(temaActual) {
  const themeIcon = document.getElementById('theme-icon');
  const themeBtn = document.getElementById('theme-toggle-btn');

  if (!themeBtn) return;
  // Normalizar temaActual: aceptar 'theme-xxx', rutas CSS o claves
  let tema = temaActual || '';
  if (typeof tema === 'string' && tema.startsWith('theme-')) {
    tema = tema.replace('theme-', '');
  }
  // Si nos pasaron una ruta CSS, buscar la clave correspondiente
  if (
    typeof tema === 'string' &&
    (tema.indexOf('/') !== -1 || tema.indexOf('.css') !== -1)
  ) {
    for (const k in TEMA_FILES) {
      if (
        TEMA_FILES[k] &&
        tema.indexOf(TEMA_FILES[k].split('/').pop()) !== -1
      ) {
        tema = k;
        break;
      }
    }
  }

  // Verificar si el tema actual tiene pareja de alternancia
  const tieneParejaToggle =
    typeof TEMA_TOGGLE_PAIRS !== 'undefined' &&
    TEMA_TOGGLE_PAIRS.hasOwnProperty(tema);

  if (!tieneParejaToggle) {
    themeBtn.style.display = 'none';
    return;
  }

  themeBtn.style.display = 'block';
  if (!themeIcon) return;

  // Determinar tema destino (acción) y mostrar ícono según la acción
  const temaDestino = TEMA_TOGGLE_PAIRS[tema];
  if (!temaDestino) {
    themeIcon.textContent = '🔄';
    themeBtn.setAttribute('title', 'Alternar tema');
    return;
  }

  // Si el tema destino es oscuro, mostrar luna (acción: pasar a oscuro)
  const destinosOscuros = [TEMA_OSC, TEMA_PRO];
  if (destinosOscuros.includes(temaDestino)) {
    themeIcon.textContent = '🌙';
    themeBtn.setAttribute(
      'title',
      `Cambiar a modo oscuro (${temaDestino.toUpperCase()})`
    );
  } else {
    // Tema destino claro -> mostrar sol
    themeIcon.textContent = '☀️';
    themeBtn.setAttribute(
      'title',
      `Cambiar a modo claro (${temaDestino.toUpperCase()})`
    );
  }
}

/**
 * Alterna entre temas configurados en TEMA_TOGGLE_PAIRS
 */
function toggleDarkMode() {
  const estiloPrincipal = document.getElementById('estilo-principal');
  const params = new URLSearchParams(window.location.search);
  const temaUrl = params.get('tema');

  // Determinar tema actual: priorizar URL, luego tomar el default
  let temaActual = TEMA_DEFAULT;
  if (temaUrl && TEMA_FILES[temaUrl]) {
    temaActual = temaUrl;
  }

  // Obtener la pareja del tema actual
  const nuevoTema = TEMA_TOGGLE_PAIRS[temaActual];

  // Si no hay pareja configurada, no hacer nada
  if (!nuevoTema) return;

  // Aplicar el nuevo tema
  if (TEMA_FILES[nuevoTema]) {
    estiloPrincipal.href = TEMA_FILES[nuevoTema];
    temaProActivo = nuevoTema !== TEMA_DEFAULT;

    // Actualizar la URL con el nuevo tema
    params.set('tema', nuevoTema);
    const nuevaUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nuevaUrl);
    actualizarVisibilidadABM();

    // Actualizar visibilidad de columna acción
    actualizarVisibilidadColumnaAccion();

    // Actualizar enlace de leyenda con nuevo tema
    configurarEnlaceLeyenda();
    // Actualizar el icono del botón toggle para reflejar la nueva acción
    actualizarBotonToggle(nuevoTema);
  }
}

/**
 * Muestra u oculta el enlace ABM según el tema activo
 */
function actualizarVisibilidadABM() {
  const enlaceABM = document.getElementById('enlace-abm');
  if (!enlaceABM) return;

  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;

  // Ocultar solo en temas básicos: def y osc
  if (temaActual === TEMA_DEFAULT || temaActual === TEMA_OSC) {
    enlaceABM.style.display = 'none';
  } else {
    enlaceABM.style.display = 'inline-flex';
  }
}

/**
 * Muestra u oculta la columna de acción según el tema activo
 */
function actualizarVisibilidadColumnaAccion() {
  const params = new URLSearchParams(window.location.search);
  const temaUrl = params.get('tema');

  let temaActual = TEMA_DEFAULT;
  if (temaUrl && TEMA_FILES[temaUrl]) {
    temaActual = temaUrl;
  }

  const headerAccion = document.getElementById('header-action');
  const tabla = document.getElementById('monitor-table');

  // Ocultar columna en temas básicos: def y osc
  if (temaActual === TEMA_DEFAULT || temaActual === TEMA_OSC) {
    // Ocultar header
    if (headerAccion) {
      headerAccion.style.display = 'none';
    }

    // Ocultar todas las celdas de acción (7ma columna)
    if (tabla) {
      const rows = tabla.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.children;
        if (cells.length >= 7) {
          cells[6].style.display = 'none';
        }
      });
    }
  } else {
    // Mostrar columna en temas avanzados
    if (headerAccion) {
      headerAccion.style.display = '';
    }

    if (tabla) {
      const rows = tabla.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.children;
        if (cells.length >= 7) {
          cells[6].style.display = '';
        }
      });
    }
  }
}

function reiniciarMonitoreo() {
  // Limpiar historial
  historialStatus = {};
  guardarHistorial();

  // Cancelar timeout pendiente si existe
  if (window.monitorTimeout) {
    clearTimeout(window.monitorTimeout);
  }

  const tbody = document.getElementById('status-table-body');
  if (tbody) {
    tbody.innerHTML = '';
  }

  // Reiniciar monitoreo
  monitorearTodosWebsites();
}

async 
// =======================================================
// NUEVO: VISTA DE TARJETAS
// =======================================================

let vistaActual = 'tabla';

function inicializarVista() {
  const guardada = localStorage.getItem('vistaMonitor');
  if (guardada === 'tarjetas') {
    vistaActual = 'tarjetas';
  }
  aplicarVista(vistaActual);
}

function cambiarVista(vista) {
  vistaActual = vista;
  localStorage.setItem('vistaMonitor', vista);
  aplicarVista(vista);
  // Re-renderizar según la vista
  if (vista === 'tarjetas') {
    renderizarTarjetas();
  }
}

function aplicarVista(vista) {
  const btnTabla = document.getElementById('btn-vista-tabla');
  const btnTarjetas = document.getElementById('btn-vista-tarjetas');
  const tablaContainer = document.getElementById('tabla-container');
  const gridTarjetas = document.getElementById('grid-tarjetas');
  const resumenSuperior = document.getElementById('resumen-superior');

  if (vista === 'tabla') {
    btnTabla?.classList.add('activo');
    btnTarjetas?.classList.remove('activo');
    tablaContainer?.classList.remove('tarjetas-activas');
    gridTarjetas?.classList.remove('visible');
    resumenSuperior?.classList.remove('visible');
  } else {
    btnTabla?.classList.remove('activo');
    btnTarjetas?.classList.add('activo');
    tablaContainer?.classList.add('tarjetas-activas');
    gridTarjetas?.classList.add('visible');
    resumenSuperior?.classList.add('visible');
  }
}

function clasificarEstadoDashboard(tiempo, status) {
  if (status === 0 || status === 599) return 'caido';
  if (status === 408) return 'critico';
  if (status >= 400 && status < 600) return 'lento';

  const t = parseFloat(tiempo);
  if (isNaN(t) || t <= 0) return 'caido';

  const umbrales = (typeof UMBRALES_LATENCIA !== 'undefined') ? UMBRALES_LATENCIA : {
    MUY_RAPIDO: 300, RAPIDO: 500, NORMAL: 800, LENTO: 1500, CRITICO: 3000, RIESGO: 5000
  };

  if (t <= umbrales.MUY_RAPIDO) return 'ok';
  if (t <= umbrales.RAPIDO) return 'ok';
  if (t <= umbrales.NORMAL) return 'ok';
  if (t <= umbrales.LENTO) return 'lento';
  if (t <= umbrales.CRITICO) return 'critico';
  if (t <= umbrales.RIESGO) return 'critico';
  return 'caido';
}

function calcularTendencia(historial) {
  if (!historial || historial.length < 2) {
    return { flechas: '─', tooltip: 'Sin datos suficientes' };
  }

  const ultimas = historial.slice(-3);
  const tiempos = ultimas.map(h => h.time).filter(t => t > 0 && t < 99999);

  if (tiempos.length < 2) {
    return { flechas: '─', tooltip: 'Datos insuficientes' };
  }

  const primera = tiempos[0];
  const ultima = tiempos[tiempos.length - 1];
  const diff = ultima - primera;
  const porcentaje = primera > 0 ? Math.round((diff / primera) * 100) : 0;

  if (diff > 100) return { flechas: '▲▲▲', tooltip: `Empeorando +${porcentaje}%` };
  if (diff > 50) return { flechas: '▲▲', tooltip: `Empeorando +${porcentaje}%` };
  if (diff > 10) return { flechas: '▲', tooltip: `Empeorando +${porcentaje}%` };
  if (diff < -100) return { flechas: '▼▼▼', tooltip: `Mejorando ${porcentaje}%` };
  if (diff < -50) return { flechas: '▼▼', tooltip: `Mejorando ${porcentaje}%` };
  if (diff < -10) return { flechas: '▼', tooltip: `Mejorando ${porcentaje}%` };
  return { flechas: '─', tooltip: 'Estable' };
}

function obtenerInfoEstado(estado) {
  const mapa = {
    ok: { icono: '🟢', texto: 'OK', color: '#4caf50' },
    lento: { icono: '🟡', texto: 'LENTO', color: '#ff9800' },
    critico: { icono: '🔴', texto: 'CRÍTICO', color: '#f44336' },
    caido: { icono: '⚫', texto: 'CAÍDO', color: '#9e9e9e' },
  };
  return mapa[estado] || mapa.ok;
}

function renderizarTarjetas() {
  const grid = document.getElementById('grid-tarjetas');
  if (!grid) return;

  const contadores = { ok: 0, lento: 0, critico: 0, caido: 0 };

  const tarjetas = websitesData.map(web => {
    const historial = historialStatus[web.url] || [];
    const ultima = historial[historial.length - 1];
    const estado = ultima ? clasificarEstadoDashboard(ultima.time, ultima.status) : 'caido';
    contadores[estado]++;

    return crearTarjetaHTML(web, ultima, estado, historial);
  }).join('');

  grid.innerHTML = tarjetas;

  // Actualizar contadores superiores
  document.getElementById('contador-ok').textContent = contadores.ok;
  document.getElementById('contador-lento').textContent = contadores.lento;
  document.getElementById('contador-critico').textContent = contadores.critico;
  document.getElementById('contador-caido').textContent = contadores.caido;
}

function crearTarjetaHTML(web, ultima, estado, historial) {
  const tiempo = ultima ? ultima.time : '--';
  const esDirecto = ultima && ultima.source === 'direct';
  const tendencia = calcularTendencia(historial);
  const estadoInfo = obtenerInfoEstado(estado);

  // Obtener promedio
  const { promedio, estadoPromedio, validCount } = calcularPromedio(web.url);
  const promedioTexto = validCount > 0 ? `${promedio} ms` : 'Sin datos';

  // Obtener errores
  const errores = obtenerHistorialErrores(web.url);
  const totalMediciones = historial.length;
  const erroresHTML = errores.length > 0
    ? `<div class="tarjeta-errores" onclick="toggleErroresDetalle('${web.url}')">⚠️ ${errores.length} errores de ${totalMediciones}</div>`
    : '';

  // Botón PSI (solo en temas avanzados)
  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;
  const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);

  let accionesHTML = '';
  if (permiteExpansion) {
    accionesHTML = `<button class="psi-button" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>`;
  }

  return `
    <div class="tarjeta-servicio estado-${estado} ${esDirecto ? 'directo' : ''}">
      <div class="tarjeta-header">
        <span class="tarjeta-nombre">${web.nombre}</span>
        ${esDirecto ? '<span class="tarjeta-fuente" title="Medición directa (red interna)">🖥️</span>' : '<span class="tarjeta-fuente" title="Medición vía proxy">🌐</span>'}
      </div>
      <div class="tarjeta-latencia">
        ${tiempo} <span class="tarjeta-unidad">ms</span>
      </div>
      <div class="tarjeta-promedio">
        Promedio: ${promedioTexto} | Estado: ${estadoPromedio.text}
      </div>
      <div class="tarjeta-tendencia" title="${tendencia.tooltip}">
        ${tendencia.flechas}
      </div>
      <div class="tarjeta-estado">
        <span class="tarjeta-estado-icono">${estadoInfo.icono}</span>
        <span class="tarjeta-estado-texto" style="color:${estadoInfo.color}">${estadoInfo.texto}</span>
      </div>
      ${erroresHTML}
      <div class="tarjeta-url">
        <a href="${web.url}" target="_blank" rel="noopener">${web.url}</a>
      </div>
      <div class="tarjeta-acciones">
        ${accionesHTML}
      </div>
    </div>
  `;
}

// =======================================================
// FIN NUEVO: VISTA DE TARJETAS
// =======================================================

function cargarYMostrarHistorialExistente() {
  // Cargar lista de websites
  let websitesData = [];
  try {
    const response = await fetch(WEBSITES_FILE);
    websitesData = await response.json();
  } catch (e) {
    console.error('Error al cargar data/webs.json.', e);
    return;
  }

  if (websitesData.length === 0) return;

  websitesData = ordenarServiciosPersonalizado(websitesData);

  // Dibujar filas con datos del historial existente
  const tbody = document.getElementById('status-table-body');
  tbody.innerHTML = '';

  let maxValidCount = 0;

  websitesData.forEach((web) => {
    const row = tbody.insertRow();
    row.setAttribute('data-url', web.url);

    // Borde izquierdo azul para mediciones directas
    if (ultimaMedicion.source === 'direct') {
      row.style.borderLeft = '4px solid #3498db';
      row.title = 'Medición directa desde navegador (red interna)';
    }

    const cellNombre = row.insertCell();
    cellNombre.textContent = web.nombre;

    const cellUrl = row.insertCell();
    const a = document.createElement('a');
    a.href = web.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = web.url;
    cellUrl.appendChild(a);

    // Obtener última medición del historial
    const historial = historialStatus[web.url] || [];
    const ultimaMedicion =
      historial.length > 0 ? historial[historial.length - 1] : null;

    // Obtener tema actual y verificar si permite expansión (todos menos DEF y OSC)
    const params = new URLSearchParams(window.location.search);
    const temaActual = params.get('tema') || TEMA_DEFAULT;
    const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);
    const errores = obtenerHistorialErrores(web.url);

    if (ultimaMedicion) {
      const estadoActual = obtenerEstadoVisual(
        ultimaMedicion.time,
        ultimaMedicion.status,
        ultimaMedicion.verifiedDirect
      );
      const { promedio, estadoPromedio, validCount } = calcularPromedio(
        web.url
      );

      maxValidCount = Math.max(maxValidCount, validCount);

      const cellLat = row.insertCell();
      cellLat.textContent = `${ultimaMedicion.time} ms ${ultimaMedicion.source === 'direct' ? '🖥️' : '🌐'}`;
      cellLat.title = ultimaMedicion.source === 'direct' 
        ? 'Medición directa desde navegador (red interna)' 
        : 'Medición vía proxy serverless (internet)';

      const cellEstadoActual = row.insertCell();
      cellEstadoActual.textContent = estadoActual.text;
      cellEstadoActual.title = ultimaMedicion.source === 'direct' 
        ? 'Estado verificado directamente desde navegador' 
        : 'Estado vía proxy serverless';
      cellEstadoActual.className = estadoActual.className;

      // Hacer clickeable el badge si hay errores y el tema lo permite
      if (errores.length > 0 && permiteExpansion) {
        cellEstadoActual.style.cursor = 'pointer';
        cellEstadoActual.title = 'Click para ver detalles de errores';
        cellEstadoActual.onclick = () => toggleErroresDetalle(web.url);
      }

      // Agregar contador de errores si existen y el tema lo permite
      const totalMediciones = historial.length;

      const contadorErrores =
        errores.length > 0 && permiteExpansion
          ? ` ⚠️ ${errores.length}/${totalMediciones}`
          : '';

      const cellProm = row.insertCell();
      cellProm.textContent = `${promedio} ms${contadorErrores} ${ultimaMedicion.source === 'direct' ? '🖥️' : '🌐'}`;
      cellProm.title = ultimaMedicion.source === 'direct' 
        ? 'Promedio con medición directa desde navegador' 
        : 'Promedio vía proxy serverless';

      const cellEstadoPromedio = row.insertCell();
      cellEstadoPromedio.textContent = estadoPromedio.text;
      cellEstadoPromedio.title = ultimaMedicion.source === 'direct' 
        ? 'Estado promedio con verificación directa' 
        : 'Estado promedio vía proxy';
      cellEstadoPromedio.className = estadoPromedio.className;

      // Hacer clickeable el badge promedio si hay errores y el tema lo permite
      if (errores.length > 0 && permiteExpansion) {
        cellEstadoPromedio.style.cursor = 'pointer';
        cellEstadoPromedio.title = 'Click para ver detalles de errores';
        cellEstadoPromedio.onclick = () => toggleErroresDetalle(web.url);
      }
    } else {
      row.insertCell().textContent = '-';
      row.insertCell().textContent = '-';
      row.insertCell().textContent = '-';
      row.insertCell().textContent = '-';
    }

    const cellAccion = row.insertCell();
    let actionsHTML = '';

    // Botón PSI (solo en temas PRO/MIN)
    if (permiteExpansion) {
      actionsHTML += `<button class="psi-button" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>`;
    }

    cellAccion.innerHTML = actionsHTML;
  });

  actualizarEncabezadoPromedio(maxValidCount);

  // NUEVO: Renderizar tarjetas si está activa esa vista
  if (vistaActual === 'tarjetas') {
    renderizarTarjetas();
  }

  // NO actualizar la fecha de última actualización - mantener la guardada
  // Buscar la última fecha en el historial
  let ultimaFecha = null;
  for (const url in historialStatus) {
    const historial = historialStatus[url];
    if (historial && historial.length > 0) {
      const ultimaMedicion = historial[historial.length - 1];
      if (ultimaMedicion.timestamp) {
        if (!ultimaFecha || ultimaMedicion.timestamp > ultimaFecha) {
          ultimaFecha = ultimaMedicion.timestamp;
        }
      }
    }
  }

  if (ultimaFecha) {
    actualizarUltimaActualizacion(new Date(ultimaFecha));
  }
}

// Cuando se carga la página, arranca todo el sistema
document.addEventListener('DOMContentLoaded', async () => {
  inicializarTema();
  cargarHistorial();
  configurarEnlaceLeyenda();
  inicializarVista();

  try {
    // 1. Cargar dinámicamente el diccionario de idioma
    await cargarIdioma();

    // 2. Inicializar elementos estáticos AHORA que TEXTOS_ACTUAL tiene valor
    inicializarEtiquetas();
    inicializarSelectorDuracion();

    // 3. Verificar si el historial ya está completo
    if (historialCompleto()) {
      // Si está completo, solo cargar y mostrar datos existentes
      console.log(
        'Historial completo detectado. Mostrando datos guardados sin nuevas mediciones.'
      );
      await cargarYMostrarHistorialExistente();
    } else {
      // Si no está completo, iniciar el monitoreo normal
      monitorearTodosWebsites();
    }
  } catch (e) {
    console.error('Fallo crítico: No se pudo cargar el idioma.', e);
    document.getElementById(
      'info-bar-msg'
    ).textContent = `ERROR: No se pudo cargar el idioma. Verifique la consola.`;
  }
});
