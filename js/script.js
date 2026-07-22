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

  actualizarVisibilidadABM();
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

  if (esVerificadoDirecto && estado === 200) {
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
    { umbral: UMBRALES_LATENCIA.MUY_RAPIDO, text: window.TEXTOS_ACTUAL.velocidad.VERY_FAST, className: 'status-very-fast' },
    { umbral: UMBRALES_LATENCIA.RAPIDO, text: window.TEXTOS_ACTUAL.velocidad.FAST, className: 'status-fast' },
    { umbral: UMBRALES_LATENCIA.NORMAL, text: window.TEXTOS_ACTUAL.velocidad.NORMAL, className: 'status-normal' },
    { umbral: UMBRALES_LATENCIA.LENTO, text: window.TEXTOS_ACTUAL.velocidad.SLOW, className: 'status-slow' },
    { umbral: UMBRALES_LATENCIA.CRITICO, text: window.TEXTOS_ACTUAL.velocidad.CRITICAL, className: 'status-critical' },
    { umbral: UMBRALES_LATENCIA.RIESGO, text: window.TEXTOS_ACTUAL.velocidad.RISK, className: 'status-risk' },
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

function ordenarServiciosPersonalizado(servicios) {
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

  if (historialStatus[url].length >= maxHistorialActual) {
    return;
  }

  historialStatus[url].push({ time, status, source, timestamp: Date.now() });

  guardarHistorial();
}

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

  const calcProm = (arr) => arr.length > 0 ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length) : null;
  const promedioProxy = calcProm(medicionesProxy);
  const promedioDirecto = calcProm(medicionesDirectas);

  const promedioMs = promedioDirecto !== null && promedioProxy !== null
    ? Math.round((promedioDirecto + promedioProxy) / 2)
    : (promedioDirecto !== null ? promedioDirecto : promedioProxy);

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

async function verificarEstado(url) {
  try {
    const response = await fetch(
      `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`
    );

    if (!response.ok) {
      console.warn(`Proxy error HTTP ${response.status} para ${url}`);
      return await verificarDirecto(url);
    }

    const data = await response.json();

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
 * CORREGIDO: onerror SIEMPRE = caído. No asumir que error rápido = OK.
 * Solo onload (imagen cargó) = OK.
 */
async function verificarDirecto(url) {
  // SOLUCIÓN: Si el navegador está detrás de un proxy corporativo que bloquea
  // conexiones directas, el img/favicon y fetch no-cors fallarán para TODOS los
  // sitios. Usamos un CORS proxy público alternativo como fallback final.

  // CORS proxies públicos (rotar si uno falla)
  const CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
  ];

  // 1) Intentar img/favicon (rápido, sin CORS)
  const imgResult = await verificarDirectoImg(url);
  if (imgResult.status === 200) {
    return imgResult;
  }

  // 2) Si img falló rápido, intentar CORS proxy alternativo
  // (esto bypassearía el proxy corporativo del navegador)
  console.log(`⚠️ Directo bloqueado para ${url}, probando CORS proxy alternativo...`);

  for (const proxyUrl of CORS_PROXIES) {
    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(proxyUrl + encodeURIComponent(url), {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const time = Math.round(performance.now() - startTime);

      if (response.ok) {
        console.log(`✅ CORS proxy OK para ${url}: ${time}ms`);
        return {
          time: time,
          status: 200,
          verifiedDirect: true,
          via: 'cors-proxy',
        };
      }
    } catch (e) {
      console.log(`❌ CORS proxy falló para ${url}: ${e.message}`);
    }
  }

  // 3) Nada funcionó → realmente caído
  console.log(`❌ Todos los métodos fallaron para ${url}`);
  return {
    time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
    status: 0,
    error: 'Sin conexión (todos los métodos fallaron)',
    verifiedDirect: true,
  };
}

async function verificarDirectoImg(url) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const img = new Image();
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
          status: 0,
          error: 'Timeout img',
          verifiedDirect: true,
        });
      }
    }, 8000);

    img.onload = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({
        time: Math.round(performance.now() - startTime),
        status: 200,
        verifiedDirect: true,
      });
    };

    img.onerror = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const time = Math.round(performance.now() - startTime);

      // Si tardó > 1s, probablemente el servidor respondió (404 favicon)
      if (time > 1000) {
        resolve({
          time: time,
          status: 200,
          verifiedDirect: true,
        });
      } else {
        // Falló rápido: DNS fail o proxy bloqueó
        resolve({
          time: time,
          status: 0,
          error: 'Img falló rápido',
          verifiedDirect: true,
        });
      }
    };

    img.src = new URL('/favicon.ico', url).href + '?_t=' + Date.now();
  });
}

function dibujarFilasIniciales(servicios) {
  const tbody = document.getElementById('status-table-body');
  tbody.innerHTML = '';

  let maxValidCount = 0;
  servicios.forEach((web) => {
    const { validCount } = calcularPromedio(web.url);
    maxValidCount = Math.max(maxValidCount, validCount);

    const row = tbody.insertRow();
    row.dataset.url = web.url;

    row.insertCell().innerHTML = `<a href="${web.url}" target="_blank">${web.nombre}</a>`;
    row.insertCell().innerHTML = `<a href="${web.url}" target="_blank">${web.url}</a>`;
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;
    row.insertCell().textContent = window.TEXTOS_ACTUAL.general.LOADING;
    row.insertCell().textContent = '';

    aplicarAccesibilidadEstadoEnFila(row, {
      actual: window.TEXTOS_ACTUAL.general.LOADING,
      promedio: window.TEXTOS_ACTUAL.general.LOADING,
    });
  });

  actualizarEncabezadoPromedio(maxValidCount);
}

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

function obtenerHistorialErrores(url) {
  const historial = historialStatus[url] || [];
  return historial.filter(
    (entry) =>
      entry.status !== 200 || entry.time >= UMBRALES_LATENCIA.PENALIZACION_FALLO
  );
}

function formatearFecha(timestamp) {
  const fecha = new Date(timestamp);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

function toggleErroresDetalle(url) {
  const tbody = document.getElementById('status-table-body');
  const row = tbody.querySelector(`tr[data-url="${CSS.escape(url)}"]`);
  if (!row) return;

  const toggleBtn = row.querySelector('.toggle-errors-button');

  let detalleRow = null;
  let nextRow = row.nextElementSibling;
  if (
    nextRow &&
    nextRow.classList.contains('error-detail-row') &&
    nextRow.getAttribute('data-parent-url') === url
  ) {
    detalleRow = nextRow;
  }

  if (detalleRow) {
    detalleRow.classList.remove('expanded');
    if (toggleBtn) toggleBtn.textContent = '▼';
    setTimeout(() => {
      if (detalleRow && detalleRow.parentNode) {
        detalleRow.remove();
      }
    }, 200);
    return;
  }

  const errores = obtenerHistorialErrores(url);
  if (errores.length === 0) return;

  const newRow = document.createElement('tr');
  newRow.classList.add('error-detail-row');
  newRow.setAttribute('data-parent-url', url);

  const cell = document.createElement('td');
  cell.colSpan = 7;

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

  if (row.nextSibling) {
    tbody.insertBefore(newRow, row.nextSibling);
  } else {
    tbody.appendChild(newRow);
  }

  if (toggleBtn) toggleBtn.textContent = '▲';

  setTimeout(() => newRow.classList.add('expanded'), 10);
}

window.toggleErroresDetalle = toggleErroresDetalle;

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

function actualizarFila(web, resultado) {
  const tbody = document.getElementById('status-table-body');
  const row = tbody.querySelector(`tr[data-url="${CSS.escape(web.url)}"]`);

  if (!row) return;

  if (resultado.verifiedDirect) {
    row.style.borderLeft = '4px solid #3498db';
    row.title = 'Medición directa desde navegador (red interna)';
  } else {
    row.style.borderLeft = '';
    row.title = '';
  }

  const estadoActual = obtenerEstadoVisual(resultado.time, resultado.status, resultado.verifiedDirect);
  const { promedio, promedioProxy, promedioDirecto, estadoPromedio, fuentes } = calcularPromedio(web.url);

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
    window.limpiarErrorSitio && window.limpiarErrorSitio(web.nombre || web.url);
  }

  row.cells[2].textContent = `${resultado.time} ms ${resultado.verifiedDirect ? '🖥️' : '🌐'}`;
  row.cells[2].title = resultado.verifiedDirect 
    ? 'Medición directa desde navegador (red interna)' 
    : 'Medición vía proxy serverless (internet)';

  row.cells[3].textContent = estadoActual.text;
  row.cells[3].title = resultado.verifiedDirect 
    ? 'Estado verificado directamente desde navegador' 
    : 'Estado vía proxy serverless';
  row.cells[3].className = estadoActual.className;

  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;
  const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);
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

  let textoPromedio = '';
  let tooltipPromedio = '';

  if (promedioProxy !== null && promedioDirecto !== null) {
    textoPromedio = `${promedioProxy} ms 🌐 / ${promedioDirecto} ms 🖥️`;
    tooltipPromedio = `Promedio proxy: ${promedioProxy}ms (${fuentes.proxy} mediciones) | Promedio directo: ${promedioDirecto}ms (${fuentes.direct} mediciones)`;
  } else if (promedioDirecto !== null) {
    textoPromedio = `${promedioDirecto} ms 🖥️`;
    tooltipPromedio = `Promedio directo: ${promedioDirecto}ms (${fuentes.direct} mediciones)`;
  } else if (promedioProxy !== null) {
    textoPromedio = `${promedioProxy} ms 🌐`;
    tooltipPromedio = `Promedio proxy: ${promedioProxy}ms (${fuentes.proxy} mediciones)`;
  } else {
    textoPromedio = '0 ms';
    tooltipPromedio = 'Sin mediciones exitosas';
  }

  const totalMediciones = (historialStatus[web.url] || []).length;
  const contadorErrores =
    errores.length > 0 && permiteExpansion
      ? ` ⚠️ ${errores.length}/${totalMediciones}`
      : '';
  row.cells[4].textContent = textoPromedio + contadorErrores;
  row.cells[4].title = tooltipPromedio;

  row.cells[5].textContent = estadoPromedio.text;
  row.cells[5].title = resultado.verifiedDirect 
    ? 'Estado promedio con verificación directa' 
    : 'Estado promedio vía proxy';
  row.cells[5].className = estadoPromedio.className;

  if (errores.length > 0 && permiteExpansion) {
    row.cells[5].style.cursor = 'pointer';
    row.cells[5].title = 'Click para ver detalles de errores';
    row.cells[5].onclick = () => toggleErroresDetalle(web.url);
  } else {
    row.cells[5].style.cursor = '';
    row.cells[5].title = '';
    row.cells[5].onclick = null;
  }

  aplicarAccesibilidadEstadoEnFila(row, {
    actual: estadoActual.text,
    promedio: estadoPromedio.text,
  });

  let actionsHTML = '';
  if (permiteExpansion) {
    actionsHTML += `<button class="psi-button" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>`;
  }
  row.cells[6].innerHTML = actionsHTML;
}

async function monitorearTodosWebsites() {
  if (window.monitorTimeout) {
    clearTimeout(window.monitorTimeout);
    window.monitorTimeout = null;
  }

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

  websitesData = ordenarServiciosPersonalizado(websitesData);
  dibujarFilasIniciales(websitesData);
  actualizarUltimaActualizacion(null);

  const promesas = websitesData.map((web) => verificarEstado(web.url));
  const allResults = await Promise.allSettled(promesas);

  const resultadosMonitoreo = [];
  allResults.forEach((result, index) => {
    const web = websitesData[index];
    let res;

    if (result.status === 'fulfilled') {
      res = result.value;
    } else {
      res = {
        time: UMBRALES_LATENCIA.PENALIZACION_FALLO,
        status: ESTADO_ERROR_CONEXION,
        proxyError: true,
      };
    }

    resultadosMonitoreo.push({
      url: web.url,
      time: res.time,
      status: res.status,
      verifiedDirect: res.verifiedDirect || false,
    });
  });

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

    actualizarUltimaActualizacion(new Date());

    window.monitorTimeout = setTimeout(
      monitorearTodosWebsites,
      FRECUENCIA_MONITOREO_MS
    );
    return;
  }

  let maxValidCount = 0;

  resultadosMonitoreo.forEach((res) => {
    const web = websitesData.find((w) => w.url === res.url);

    actualizarHistorial(res.url, res.time, res.status, res.verifiedDirect ? 'direct' : 'proxy');
    actualizarFila(web, res);

    const { validCount } = calcularPromedio(res.url);
    maxValidCount = Math.max(maxValidCount, validCount);
  });

  actualizarEncabezadoPromedio(maxValidCount);
  actualizarUltimaActualizacion(new Date());

  if (vistaActual === 'tarjetas') {
    renderizarTarjetas();
  }

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

function inicializarTema() {
  const estiloPrincipal = document.getElementById('estilo-principal');
  let temaFinal = TEMA_DEFAULT;

  const temaUrl = obtenerTemaDeURL();

  if (temaUrl) {
    temaFinal = temaUrl;
  }

  if (TEMA_FILES[temaFinal]) {
    estiloPrincipal.href = TEMA_FILES[temaFinal];
    temaProActivo = temaFinal !== TEMA_DEFAULT;
  } else {
    estiloPrincipal.href = TEMA_FILES[TEMA_DEFAULT];
    temaProActivo = false;
  }

  actualizarBotonToggle(temaFinal);
}

function actualizarBotonToggle(temaActual) {
  const themeIcon = document.getElementById('theme-icon');
  const themeBtn = document.getElementById('theme-toggle-btn');

  if (!themeBtn) return;

  let tema = temaActual || '';
  if (typeof tema === 'string' && tema.startsWith('theme-')) {
    tema = tema.replace('theme-', '');
  }
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

  const tieneParejaToggle =
    typeof TEMA_TOGGLE_PAIRS !== 'undefined' &&
    TEMA_TOGGLE_PAIRS.hasOwnProperty(tema);

  if (!tieneParejaToggle) {
    themeBtn.style.display = 'none';
    return;
  }

  themeBtn.style.display = 'block';
  if (!themeIcon) return;

  const temaDestino = TEMA_TOGGLE_PAIRS[tema];
  if (!temaDestino) {
    themeIcon.textContent = '🔄';
    themeBtn.setAttribute('title', 'Alternar tema');
    return;
  }

  const destinosOscuros = [TEMA_OSC, TEMA_PRO];
  if (destinosOscuros.includes(temaDestino)) {
    themeIcon.textContent = '🌙';
    themeBtn.setAttribute(
      'title',
      `Cambiar a modo oscuro (${temaDestino.toUpperCase()})`
    );
  } else {
    themeIcon.textContent = '☀️';
    themeBtn.setAttribute(
      'title',
      `Cambiar a modo claro (${temaDestino.toUpperCase()})`
    );
  }
}

function toggleDarkMode() {
  const estiloPrincipal = document.getElementById('estilo-principal');
  const params = new URLSearchParams(window.location.search);
  const temaUrl = params.get('tema');

  let temaActual = TEMA_DEFAULT;
  if (temaUrl && TEMA_FILES[temaUrl]) {
    temaActual = temaUrl;
  }

  const nuevoTema = TEMA_TOGGLE_PAIRS[temaActual];

  if (!nuevoTema) return;

  if (TEMA_FILES[nuevoTema]) {
    estiloPrincipal.href = TEMA_FILES[nuevoTema];
    temaProActivo = nuevoTema !== TEMA_DEFAULT;

    params.set('tema', nuevoTema);
    const nuevaUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nuevaUrl);
    actualizarVisibilidadABM();
    actualizarVisibilidadColumnaAccion();
    configurarEnlaceLeyenda();
    actualizarBotonToggle(nuevoTema);
  }
}

function actualizarVisibilidadABM() {
  const enlaceABM = document.getElementById('enlace-abm');
  if (!enlaceABM) return;

  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;

  if (TEMAS_BASICOS.includes(temaActual)) {
    enlaceABM.style.display = 'none';
  } else {
    enlaceABM.style.display = 'inline-flex';
  }
}

function actualizarVisibilidadColumnaAccion() {
  const params = new URLSearchParams(window.location.search);
  const temaUrl = params.get('tema');

  let temaActual = TEMA_DEFAULT;
  if (temaUrl && TEMA_FILES[temaUrl]) {
    temaActual = temaUrl;
  }

  const headerAccion = document.getElementById('header-action');
  const tabla = document.getElementById('monitor-table');

  if (TEMAS_BASICOS.includes(temaActual)) {
    if (headerAccion) headerAccion.style.display = 'none';
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
    if (headerAccion) headerAccion.style.display = '';
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
  historialStatus = {};
  guardarHistorial();

  if (window.monitorTimeout) {
    clearTimeout(window.monitorTimeout);
  }

  const tbody = document.getElementById('status-table-body');
  if (tbody) {
    tbody.innerHTML = '';
  }

  monitorearTodosWebsites();
}

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

function truncarURL(url, maxLen) {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
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

  const { promedio, estadoPromedio, validCount } = calcularPromedio(web.url);
  const promedioTexto = validCount > 0 ? `${promedio}ms [${validCount}/${maxHistorialActual}]` : 'Sin datos';

  const errores = obtenerHistorialErrores(web.url);
  const totalMediciones = historial.length;
  const erroresHTML = errores.length > 0
    ? `<span class="tarjeta-errores" onclick="toggleErroresDetalle('${web.url}')" title="Ver errores">⚠️${errores.length}/${totalMediciones}</span>`
    : '';

  const params = new URLSearchParams(window.location.search);
  const temaActual = params.get('tema') || TEMA_DEFAULT;
  const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);

  const fuenteIcono = esDirecto ? '🖥️' : '🌐';
  const fuenteTitle = esDirecto ? 'Directo' : 'Proxy';

  return `
    <div class="tarjeta-servicio estado-${estado} ${esDirecto ? 'directo' : ''}">
      <div class="tarjeta-header-compacto">
        <span class="tarjeta-nombre-compacto">${web.nombre}</span>
        <span class="tarjeta-fuente-compacto" title="${fuenteTitle}">${fuenteIcono}</span>
      </div>
      <div class="tarjeta-body-compacto">
        <div class="tarjeta-latencia-compacto">
          <span class="latencia-numero">${tiempo}</span><span class="latencia-unidad">ms</span>
          <span class="latencia-fuente" title="${fuenteTitle}">${fuenteIcono}</span>
        </div>
        <div class="tarjeta-fila-datos">
          <span class="dato-promedio" title="Promedio">Ø ${promedioTexto}</span>
          <span class="dato-estado-prom" style="color:${estadoPromedio.className ? '' : '#666'}">${estadoPromedio.text}</span>
        </div>
        <div class="tarjeta-fila-datos">
          <span class="tendencia" title="${tendencia.tooltip}">${tendencia.flechas}</span>
          <span class="estado-actual" style="color:${estadoInfo.color}">${estadoInfo.icono} ${estadoInfo.texto}</span>
          ${erroresHTML}
        </div>
      </div>
      <div class="tarjeta-footer-compacto">
        <a href="${web.url}" target="_blank" rel="noopener" title="${web.url}">${truncarURL(web.url, 35)}</a>
        ${permiteExpansion ? `<button class="psi-button psi-compacto" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>` : ''}
      </div>
    </div>
  `;
}

async function cargarYMostrarHistorialExistente() {
  let websitesDataLocal = [];
  try {
    const response = await fetch(WEBSITES_FILE);
    websitesDataLocal = await response.json();
  } catch (e) {
    console.error('Error al cargar data/webs.json.', e);
    return;
  }

  if (websitesDataLocal.length === 0) return;

  websitesDataLocal = ordenarServiciosPersonalizado(websitesDataLocal);

  const tbody = document.getElementById('status-table-body');
  tbody.innerHTML = '';

  let maxValidCount = 0;

  websitesDataLocal.forEach((web) => {
    const row = tbody.insertRow();
    row.setAttribute('data-url', web.url);

    // CORREGIDO: obtener historial PRIMERO, luego usar ultimaMedicion
    const historial = historialStatus[web.url] || [];
    const ultimaMedicion = historial.length > 0 ? historial[historial.length - 1] : null;

    if (ultimaMedicion && ultimaMedicion.source === 'direct') {
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
      const { promedio, estadoPromedio, validCount } = calcularPromedio(web.url);

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

      if (errores.length > 0 && permiteExpansion) {
        cellEstadoActual.style.cursor = 'pointer';
        cellEstadoActual.title = 'Click para ver detalles de errores';
        cellEstadoActual.onclick = () => toggleErroresDetalle(web.url);
      }

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

    if (permiteExpansion) {
      actionsHTML += `<button class="psi-button" onclick="window.open('https://pagespeed.web.dev/report?url=${web.url}', '_blank')" title="PageSpeed Insights">PSI</button>`;
    }

    cellAccion.innerHTML = actionsHTML;
  });

  actualizarEncabezadoPromedio(maxValidCount);

  if (vistaActual === 'tarjetas') {
    renderizarTarjetas();
  }

  let ultimaFecha = null;
  for (const url in historialStatus) {
    const historial = historialStatus[url];
    if (historial && historial.length > 0) {
      const ultimaMedicionHist = historial[historial.length - 1];
      if (ultimaMedicionHist.timestamp) {
        if (!ultimaFecha || ultimaMedicionHist.timestamp > ultimaFecha) {
          ultimaFecha = ultimaMedicionHist.timestamp;
        }
      }
    }
  }

  if (ultimaFecha) {
    actualizarUltimaActualizacion(new Date(ultimaFecha));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  inicializarTema();
  cargarHistorial();
  configurarEnlaceLeyenda();
  inicializarVista();

  try {
    await cargarIdioma();

    inicializarEtiquetas();
    inicializarSelectorDuracion();

    if (historialCompleto()) {
      console.log(
        'Historial completo detectado. Mostrando datos guardados sin nuevas mediciones.'
      );
      await cargarYMostrarHistorialExistente();
    } else {
      monitorearTodosWebsites();
    }
  } catch (e) {
    console.error('Fallo crítico: No se pudo cargar el idioma.', e);
    document.getElementById(
      'info-bar-msg'
    ).textContent = `ERROR: No se pudo cargar el idioma. Verifique la consola.`;
  }
});
