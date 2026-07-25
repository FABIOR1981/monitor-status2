// temas.js
// Todo lo relacionado a la selección/alternancia de tema (claro/oscuro),
// la visibilidad de elementos que dependen del tema activo (enlace ABM,
// columna de acción de la tabla) y el botón de reiniciar monitoreo.

/**
 * Obtiene el tema de los parámetros de la URL.
 * @returns {string | null} El nombre del tema o null.
 */
function obtenerTemaDeURL() {
  const params = new URLSearchParams(window.location.search);
  const tema = params.get('tema');
  if (tema === TEMA_DEFAULT) return TEMA_DEFAULT;
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
  if (temaDestino === TEMA_OSC) {
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
 * Muestra el enlace ABM (visible en todos los temas)
 */
function actualizarVisibilidadABM() {
  const enlaceABM = document.getElementById('enlace-abm');
  if (!enlaceABM) return;
  enlaceABM.style.display = 'inline-flex';
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
