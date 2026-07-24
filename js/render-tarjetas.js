// render-tarjetas.js
// Módulo de carga diferida (lazy) para la vista de "Tarjetas" del monitor.
// Se carga dinámicamente desde script.js (ver cargarModuloTarjetas) recién
// cuando el usuario abre esa vista por primera vez, para no sumar peso al
// arranque inicial de la página si nunca la usa.
//
// Comparte el scope global de script.js/config.js (ambos <script> clásicos
// cargados antes que este), por eso puede leer directamente variables como
// websitesData, historialStatus, maxHistorialActual, calcularPromedio,
// obtenerHistorialErrores, UMBRALES_LATENCIA_*, TEMA_DEFAULT y TEMAS_BASICOS
// sin necesidad de pasarlas como parámetros.
(function () {
  function clasificarEstadoDashboard(tiempo, status, esDirecto = false) {
    if (status === 0 || status === 599) return 'caido';
    if (status === 408) return 'critico';

    const t = parseFloat(tiempo);

    const fallback = { MUY_RAPIDO: 300, RAPIDO: 500, NORMAL: 800, LENTO: 1500, CRITICO: 3000, RIESGO: 5000 };
    const fallbackProxy = { MUY_RAPIDO: 600, RAPIDO: 1000, NORMAL: 1600, LENTO: 3000, CRITICO: 6000, RIESGO: 10000 };

    const umbrales = esDirecto
      ? ((typeof UMBRALES_LATENCIA_DIRECTO !== 'undefined') ? UMBRALES_LATENCIA_DIRECTO : fallback)
      : ((typeof UMBRALES_LATENCIA_PROXY !== 'undefined') ? UMBRALES_LATENCIA_PROXY : fallbackProxy);

    // Códigos de error HTTP (4xx/5xx, excluyendo 408 y 599 ya manejados arriba):
    // el servicio respondió pero con error. Antes esto se mostraba SIEMPRE como
    // "lento" sin importar cuánto tardó. Ahora, si además tardó mucho, se
    // escala la severidad en vez de ocultarla detrás de un simple "lento".
    if (status >= 400 && status < 600) {
      if (!isNaN(t) && t > umbrales.RIESGO) return 'caido';
      if (!isNaN(t) && t > umbrales.CRITICO) return 'critico';
      return 'lento';
    }

    if (isNaN(t) || t <= 0) return 'caido';

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
      const estado = ultima ? clasificarEstadoDashboard(ultima.time, ultima.status, ultima.source === 'direct') : 'caido';
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
    const promedioTexto = validCount > 0 ? `${promedio}ms [${validCount}/${maxHistorialActual}]` : 'Sin datos';

    // Obtener errores
    const errores = obtenerHistorialErrores(web.url);
    const totalMediciones = historial.length;
    const erroresHTML = errores.length > 0
      ? `<span class="tarjeta-errores" onclick="toggleErroresDetalle('${web.url}')" title="Ver errores">⚠️${errores.length}/${totalMediciones}</span>`
      : '';

    // Botón PSI (solo en temas avanzados)
    const params = new URLSearchParams(window.location.search);
    const temaActual = params.get('tema') || TEMA_DEFAULT;
    const permiteExpansion = !TEMAS_BASICOS.includes(temaActual);

    const fuenteIcono = esDirecto ? '🖥️' : '🌐';
    const fuenteTitle = esDirecto ? 'Directo' : 'Proxy';

    return `
    <div class="tarjeta-servicio estado-${estado} ${esDirecto ? 'directo' : ''}" data-url="${web.url}">
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

  // Único punto de entrada expuesto: script.js lo llama vía window.renderizarTarjetas()
  // una vez que confirma que este archivo ya se cargó.
  window.renderizarTarjetas = renderizarTarjetas;
})();
