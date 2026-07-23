// =======================================================
// DASHBOARD.JS — Vista alternativa de tarjetas
// Comparte: config.js, i18n, sessionStorage (historial)
// NO modifica script.js ni index.html
// =======================================================

let websitesData = [];
let historialStatus = {};
let maxHistorialActual = 12; // 1 hora por defecto
let duracionSeleccionada = 1;
let intervaloMonitoreo = null;
let countdownInterval = null;
let countdownValue = 300; // 5 minutos

// =======================================================
// INICIALIZACIÓN
// =======================================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarConfiguracion();
  await cargarWebsites();
  inicializarDashboard();
  // FIX: Primera carga de datos ANTES de iniciar el intervalo
  await monitorearTodos();
  iniciarMonitoreo();
});

async function cargarConfiguracion() {
  // FIX: Usar la clave correcta con "h" para DURACION_OPCIONES
  const duracionGuardada = localStorage.getItem('duracionSeleccionada');
  duracionSeleccionada = duracionGuardada ? parseInt(duracionGuardada) : 1;

  if (typeof DURACION_OPCIONES !== 'undefined') {
    const duracionKey = duracionSeleccionada + 'h';
    maxHistorialActual = DURACION_OPCIONES[duracionKey]?.mediciones || 12;
  } else {
    // Fallback si config.js no cargó
    const mapa = { 1: 12, 2: 24, 3: 36, 4: 48, 5: 60, 6: 72, 7: 84, 8: 96, 9: 108 };
    maxHistorialActual = mapa[duracionSeleccionada] || 12;
  }
}

async function cargarWebsites() {
  try {
    const response = await fetch('data/webs.json');
    websitesData = await response.json();
  } catch (error) {
    console.error('Error cargando webs.json:', error);
    websitesData = [];
  }
}

function inicializarDashboard() {
  // Cargar historial existente desde sessionStorage (compartido con tabla)
  websitesData.forEach(web => {
    const key = 'historial_' + web.url;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        historialStatus[web.url] = JSON.parse(stored);
      } catch(e) {
        console.warn('Error parseando historial para', web.url, e);
      }
    }
  });

  // Selector de duración
  const selector = document.getElementById('duracion-selector');
  if (selector) {
    selector.value = duracionSeleccionada;
    selector.addEventListener('change', (e) => {
      duracionSeleccionada = parseInt(e.target.value);
      localStorage.setItem('duracionSeleccionada', duracionSeleccionada);

      if (typeof DURACION_OPCIONES !== 'undefined') {
        const duracionKey = duracionSeleccionada + 'h';
        maxHistorialActual = DURACION_OPCIONES[duracionKey]?.mediciones || 12;
      } else {
        const mapa = { 1: 12, 2: 24, 3: 36, 4: 48, 5: 60, 6: 72, 7: 84, 8: 96, 9: 108 };
        maxHistorialActual = mapa[duracionSeleccionada] || 12;
      }

      recortarHistorial();
      renderizarDashboard();
    });
  }

  // Mostrar el contenedor y ocultar mensaje de carga
  const mensajeCarga = document.getElementById('mensaje-carga');
  const contenidoDashboard = document.getElementById('contenido-dashboard');
  if (mensajeCarga) mensajeCarga.style.display = 'none';
  if (contenidoDashboard) contenidoDashboard.style.display = 'block';

  // Renderizar con datos existentes (puede estar vacío al inicio)
  renderizarDashboard();
}

// =======================================================
// RENDERIZAR DASHBOARD
// =======================================================
function renderizarDashboard() {
  const grid = document.getElementById('grid-dashboard');
  if (!grid) return;

  // Calcular contadores
  const contadores = { ok: 0, lento: 0, critico: 0, caido: 0 };

  const tarjetas = websitesData.map(web => {
    const historial = historialStatus[web.url] || [];
    const ultima = historial[historial.length - 1];
    const estado = ultima ? clasificarEstado(ultima.time, ultima.status, ultima.source === 'direct') : 'caido';

    contadores[estado]++;

    return crearTarjeta(web, ultima, estado, historial);
  }).join('');

  grid.innerHTML = tarjetas;

  // Actualizar contadores superiores
  document.getElementById('contador-ok').textContent = contadores.ok;
  document.getElementById('contador-lento').textContent = contadores.lento;
  document.getElementById('contador-critico').textContent = contadores.critico;
  document.getElementById('contador-caido').textContent = contadores.caido;

  // Actualizar última actualización
  const ultimaActualizacion = document.getElementById('ultima-actualizacion');
  if (ultimaActualizacion) {
    ultimaActualizacion.textContent = 'Última actualización: ' + new Date().toLocaleTimeString();
  }
}

function crearTarjeta(web, ultima, estado, historial) {
  const tiempo = ultima ? ultima.time : '--';
  const esDirecto = ultima && ultima.source === 'direct';
  const tendencia = calcularTendencia(historial);
  const estadoInfo = obtenerInfoEstado(estado);

  return `
    <div class="tarjeta estado-${estado} ${esDirecto ? 'directo' : ''}">
      <div class="tarjeta-header">
        <span class="tarjeta-nombre">${web.nombre}</span>
        ${esDirecto ? '<span class="tarjeta-fuente" title="Medición directa (red interna)">🖥️</span>' : ''}
      </div>
      <div class="tarjeta-latencia">
        ${tiempo} <span class="tarjeta-unidad">ms</span>
      </div>
      <div class="tarjeta-tendencia" title="${tendencia.tooltip}">
        ${tendencia.flechas}
      </div>
      <div class="tarjeta-estado">
        <span class="tarjeta-estado-icono">${estadoInfo.icono}</span>
        <span class="tarjeta-estado-texto">${estadoInfo.texto}</span>
      </div>
      <div class="tarjeta-url">
        <a href="${web.url}" target="_blank" rel="noopener">${web.url}</a>
      </div>
    </div>
  `;
}

// =======================================================
// CLASIFICAR ESTADO (usa mismos umbrales que config.js)
// =======================================================
function clasificarEstado(tiempo, status, esDirecto = false) {
  if (status === 0 || status === 599) return 'caido';
  if (status === 408) return 'critico'; // muy lento
  if (status >= 400 && status < 600) return 'lento'; // error HTTP pero funciona

  const t = parseFloat(tiempo);
  if (isNaN(t) || t <= 0) return 'caido';

  // Fallback si config.js no cargó
  const fallback = { MUY_RAPIDO: 300, RAPIDO: 500, NORMAL: 800, LENTO: 1500, CRITICO: 3000, RIESGO: 5000 };
  const fallbackProxy = { MUY_RAPIDO: 600, RAPIDO: 1000, NORMAL: 1600, LENTO: 3000, CRITICO: 6000, RIESGO: 10000 };

  const umbrales = esDirecto
    ? ((typeof UMBRALES_LATENCIA_DIRECTO !== 'undefined') ? UMBRALES_LATENCIA_DIRECTO : fallback)
    : ((typeof UMBRALES_LATENCIA_PROXY !== 'undefined') ? UMBRALES_LATENCIA_PROXY : fallbackProxy);

  if (t <= umbrales.MUY_RAPIDO) return 'ok';
  if (t <= umbrales.RAPIDO) return 'ok';
  if (t <= umbrales.NORMAL) return 'ok';
  if (t <= umbrales.LENTO) return 'lento';
  if (t <= umbrales.CRITICO) return 'critico';
  if (t <= umbrales.RIESGO) return 'critico';

  return 'caido';
}

function obtenerInfoEstado(estado) {
  const mapa = {
    ok: { icono: '🟢', texto: 'OK' },
    lento: { icono: '🟡', texto: 'LENTO' },
    critico: { icono: '🔴', texto: 'CRÍTICO' },
    caido: { icono: '⚫', texto: 'CAÍDO' },
  };
  return mapa[estado] || mapa.ok;
}

// =======================================================
// TENDENCIA (últimas 3 mediciones)
// =======================================================
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

  if (diff > 100) {
    return {
      flechas: '▲▲▲',
      tooltip: `Empeorando +${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }
  if (diff > 50) {
    return {
      flechas: '▲▲',
      tooltip: `Empeorando +${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }
  if (diff > 10) {
    return {
      flechas: '▲',
      tooltip: `Empeorando +${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }
  if (diff < -100) {
    return {
      flechas: '▼▼▼',
      tooltip: `Mejorando ${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }
  if (diff < -50) {
    return {
      flechas: '▼▼',
      tooltip: `Mejorando ${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }
  if (diff < -10) {
    return {
      flechas: '▼',
      tooltip: `Mejorando ${porcentaje}% (${primera}ms → ${ultima}ms)`
    };
  }

  return {
    flechas: '─',
    tooltip: `Estable (${primera}ms → ${ultima}ms)`
  };
}

// =======================================================
// MONITOREO (comparte sessionStorage con tabla)
// =======================================================
function iniciarMonitoreo() {
  intervaloMonitoreo = setInterval(monitorearTodos, 300000); // 5 minutos
  iniciarCountdown();
}

function iniciarCountdown() {
  countdownValue = 300;
  const contador = document.getElementById('contador-regresivo');

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    countdownValue--;
    if (contador) {
      const min = Math.floor(countdownValue / 60);
      const seg = countdownValue % 60;
      contador.textContent = `Próxima: ${min}:${seg.toString().padStart(2, '0')}`;
    }
    if (countdownValue <= 0) countdownValue = 300;
  }, 1000);
}

async function monitorearTodos() {
  const promises = websitesData.map(web => verificarEstado(web.url));
  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    const web = websitesData[index];
    let res;

    if (result.status === 'fulfilled') {
      res = result.value;
    } else {
      res = { time: 99999, status: 0 };
    }

    // FIX: Siempre agregar al historial y recortar si excede el máximo
    if (!historialStatus[web.url]) historialStatus[web.url] = [];

    historialStatus[web.url].push({
      time: res.time,
      status: res.status,
      source: res.verifiedDirect ? 'direct' : 'proxy',
      timestamp: Date.now()
    });

    // Recortar si excede el máximo
    if (historialStatus[web.url].length > maxHistorialActual) {
      historialStatus[web.url] = historialStatus[web.url].slice(-maxHistorialActual);
    }

    sessionStorage.setItem('historial_' + web.url, JSON.stringify(historialStatus[web.url]));
  });

  renderizarDashboard();
  countdownValue = 300;
}

// =======================================================
// VERIFICAR ESTADO (misma función que script.js)
// =======================================================
async function verificarEstado(url) {
  const PROXY_ENDPOINT = '/.netlify/functions/check-status';

  try {
    const response = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`);
    if (!response.ok) return await verificarDirecto(url);

    const data = await response.json();
    if (data.status === 0) return await verificarDirecto(url);

    return data;
  } catch (error) {
    return await verificarDirecto(url);
  }
}

function verificarDirecto(url) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const img = new Image();
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ time: 99999, status: 0, verifiedDirect: true });
      }
    }, 10000);

    img.onload = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({
        time: Math.round(performance.now() - startTime),
        status: 200,
        verifiedDirect: true
      });
    };

    img.onerror = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const time = Math.round(performance.now() - startTime);
      if (time < 8000) {
        resolve({ time: time, status: 200, verifiedDirect: true });
      } else {
        resolve({ time: 99999, status: 0, verifiedDirect: true });
      }
    };

    img.src = new URL('/favicon.ico', url).href + '?_t=' + Date.now();
  });
}

// =======================================================
// UTILIDADES
// =======================================================
function recortarHistorial() {
  Object.keys(historialStatus).forEach(url => {
    if (historialStatus[url].length > maxHistorialActual) {
      historialStatus[url] = historialStatus[url].slice(-maxHistorialActual);
      sessionStorage.setItem('historial_' + url, JSON.stringify(historialStatus[url]));
    }
  });
}

function reiniciarMonitoreo() {
  historialStatus = {};
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('historial_')) sessionStorage.removeItem(key);
  });
  renderizarDashboard();
  // FIX: Reiniciar también el monitoreo inmediato
  monitorearTodos();
}

// Toggle modo oscuro (comparte con tabla)
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
}
