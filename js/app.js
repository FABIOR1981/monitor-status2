// app.js
// Orquestador de la app: la vista de tarjetas es la única vista disponible
// (con esqueletos de carga y el cargador lazy de render-tarjetas.js), pintar
// el historial ya guardado al recargar la página, y el arranque general
// (DOMContentLoaded). Se carga último porque su listener de arranque llama
// funciones definidas en el resto de los archivos (estado.js, ui-textos.js,
// monitoreo.js, temas.js).

// La app siempre muestra la vista de tarjetas (no hay alternancia con tabla).
const vistaActual = 'tarjetas';

function inicializarVista() {
  // Arrancamos la descarga del módulo de tarjetas ya mismo (en paralelo con
  // el resto del arranque), para que esté listo cuando lleguen los primeros
  // datos monitoreados.
  cargarModuloTarjetas().catch((e) =>
    console.error('No se pudo cargar el módulo de tarjetas:', e)
  );
  mostrarEsqueletosTarjetas();
}

// Muestra tarjetas "esqueleto" (placeholders con efecto de carga) apenas
// arranca la app, para entretener el tiempo entre que el usuario entra y
// llegan los datos reales. renderizarTarjetas() (en el módulo lazy) las
// reemplaza por las tarjetas reales y marca data-cargado="1".
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

// El render de la vista de tarjetas (clasificarEstadoDashboard, calcularTendencia,
// obtenerInfoEstado, truncarURL, renderizarTarjetas, crearTarjetaHTML) vive ahora
// en js/render-tarjetas.js, que se carga de forma diferida (lazy) apenas
// arranca la app. Sigue siendo un archivo aparte (en vez de sumarlo acá)
// para mantener este archivo corto y la responsabilidad separada.
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

// Renderiza la vista de tarjetas, cargando el módulo bajo demanda la primera
// vez que hace falta.
function renderizarTarjetasSiNecesario() {
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

    // Borde izquierdo naranja SOLO si la última medición fue "bloqueo
    // externo" (proxy externo falló, pero respondió por red interna)
    if (ultimaMedicion && ultimaMedicion.source === 'direct' && ultimaMedicion.status === 200) {
      row.style.borderLeft = '4px solid #e65100';
      row.title = 'El proxy externo falló; responde solo por la red interna. Un usuario externo real podría no poder acceder.';
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
        ? 'Medición por red interna (el proxy externo falló primero)' 
        : 'Medición vía proxy serverless (simula acceso externo)';

      const cellEstadoActual = row.insertCell();
      cellEstadoActual.textContent = estadoActual.text;
      cellEstadoActual.title = ultimaMedicion.source === 'direct' 
        ? 'Solo se confirmó acceso por red interna — no confirma que un usuario externo pueda entrar' 
        : 'Estado vía proxy serverless (la señal más parecida a un usuario externo)';
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
        ? 'Promedio afectado por mediciones solo internas (posible bloqueo externo)' 
        : 'Promedio vía proxy serverless';

      const cellEstadoPromedio = row.insertCell();
      cellEstadoPromedio.textContent = estadoPromedio.text;
      cellEstadoPromedio.title = ultimaMedicion.source === 'direct' 
        ? 'Promedio afectado por mediciones solo internas (posible bloqueo externo)' 
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
