// estado.js
// Estado global de la app y capa de persistencia/cálculo sobre ese estado:
// historial en sessionStorage, promedios, duración de monitoreo seleccionada
// y la lógica de "fallo global" (detección de caídas masivas del sistema de
// monitoreo). No maneja DOM de tabla/tarjetas (eso vive en monitoreo.js).

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
