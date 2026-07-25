// app.js
// Orquestador de la app: alternar vista tabla/tarjetas (con esqueletos de
// carga y el cargador lazy de render-tarjetas.js), pintar el historial ya
// guardado al recargar la página, y el arranque general (DOMContentLoaded).
// Se carga último porque su listener de arranque llama funciones definidas
// en el resto de los archivos (estado.js, ui-textos.js, monitoreo.js, temas.js).

let vistaActual = 'tabla';

function inicializarVista() {
  const guardada = localStorage.getItem('vistaMonitor');
  if (guardada === 'tarjetas') {
    vistaActual = 'tarjetas';
    // Arrancamos la descarga del módulo ya mismo (en paralelo con el resto del
    // arranque), para que esté listo cuando lleguen los primeros datos.
    cargarModuloTarjetas().catch((e) =>
      console.error('No se pudo cargar el módulo de tarjetas:', e)
    );
  }
  aplicarVista(vistaActual);
}

function cambiarVista(vista) {
  vistaActual = vista;
  localStorage.setItem('vistaMonitor', vista);
  aplicarVista(vista);
  // Re-renderizar según la vista (carga el módulo bajo demanda si hace falta)
  renderizarTarjetasSiNecesario();
}

// Muestra tarjetas "esqueleto" (placeholders con efecto de carga) apenas se
// entra a la vista de tarjetas, para entretener el tiempo entre que el
// usuario abre la app y llegan los datos reales. renderizarTarjetas() (en el
// módulo lazy) las reemplaza por las tarjetas reales y marca data-cargado="1".
function mostrarEsqueletosTarjetas() {
  const grid = document.getElementById('grid-tarjetas');
  if (!grid || grid.dataset.cargado === '1') return;

  const cantidad = websitesData.length > 0 ? websitesData.length : 6;
  grid.innerHTML = Array.from({ length: cantidad })
    .map(
      () => `
    <div class="tarjeta-skeleton">
      <div class="skeleton-linea skeleton-titulo"></div>
      <div class="skeleton-linea skeleton-numero"></div>
      <div class="skeleton-linea skeleton-corta"></div>
      <div class="skeleton-linea skeleton-corta"></div>
    </div>`
    )
    .join('');
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
    mostrarEsqueletosTarjetas();
  }
}

// El render de la vista de tarjetas (clasificarEstadoDashboard, calcularTendencia,
// obtenerInfoEstado, truncarURL, renderizarTarjetas, crearTarjetaHTML) vive ahora
// en js/render-tarjetas.js, que se carga de forma diferida (lazy) recién cuando
// el usuario abre esa vista por primera vez. Esto evita sumar ese peso al arranque
// de la página si nunca la usa.
let tarjetasModuloPromesa = null;

function cargarModuloTarjetas() {
  if (typeof window.renderizarTarjetas === 'function') {
    return Promise.resolve();
  }
  if (tarjetasModuloPromesa) {
    return tarjetasModuloPromesa;
  }
  tarjetasModuloPromesa = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'js/render-tarjetas.js';
    script.onload = () => resolve();
    script.onerror = () => {
      tarjetasModuloPromesa = null;
      reject(new Error('No se pudo cargar js/render-tarjetas.js'));
    };
    document.head.appendChild(script);
  });
  return tarjetasModuloPromesa;
}

// Renderiza la vista de tarjetas si es la vista activa, cargando el módulo
// bajo demanda la primera vez que hace falta.
function renderizarTarjetasSiNecesario() {
  if (vistaActual !== 'tarjetas') return;
  if (typeof window.renderizarTarjetas === 'function') {
    window.renderizarTarjetas();
  } else {
    cargarModuloTarjetas()
      .then(() => window.renderizarTarjetas && window.renderizarTarjetas())
      .catch((e) => console.error('No se pudo cargar el módulo de tarjetas:', e));
  }
}

async function cargarYMostrarHistorialExistente() {
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

    // Borde izquierdo azul para mediciones directas
    if (ultimaMedicion && ultimaMedicion.source === 'direct') {
      row.style.borderLeft = '4px solid #3498db';
      row.title = 'Medición directa desde navegador (red interna)';
    }

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
  renderizarTarjetasSiNecesario();

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
