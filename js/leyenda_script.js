// Script para la página de leyenda (leyenda.html)
// Carga el tema y el idioma según los parámetros de la URL
// y muestra la tabla de umbrales de forma dinámica
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  let temaParam = params.get('tema') ? params.get('tema').toLowerCase() : null;
  const idioma = params.get('lang') || DEFAULT_LANG;

  // Si no hay tema en la URL o el tema no existe, usamos el tema por defecto
  if (!temaParam || !LEYENDA_TEMA_FILES[temaParam]) {
    temaParam = DEFAULT_LEYENDA_TEMA;
  }

  // Cargamos el CSS del tema elegido
  const temaBaseLink = document.getElementById('tema-base-css');
  const rutaCssTema =
    typeof LEYENDA_TEMA_FILES !== 'undefined'
      ? LEYENDA_TEMA_FILES[temaParam] ||
        LEYENDA_TEMA_FILES[DEFAULT_LEYENDA_TEMA]
      : null;

  if (temaBaseLink && rutaCssTema) {
    // Le ponemos un número único para que el navegador no use el cache
    temaBaseLink.href = `${rutaCssTema}?v=2025121501`;
    document.body.classList.add(`theme-${temaParam}`);
  } else if (!temaBaseLink) {
    console.warn("Elemento con ID 'tema-base-css' no encontrado.");
  }

  // Actualizamos el botón para cambiar de tema
  actualizarBotonToggle(temaParam);

  // Cargamos el archivo de traducción del idioma elegido
  async function loadI18n(language) {
    const file =
      typeof I18N_FILES !== 'undefined' && I18N_FILES[language]
        ? I18N_FILES[language]
        : typeof I18N_FILES !== 'undefined'
        ? I18N_FILES[DEFAULT_LANG]
        : null;
    if (!file) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = file;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load i18n file: ${file}`));
      document.head.appendChild(script);
    });
  }

  try {
    await loadI18n(idioma);
  } catch (err) {
    console.warn(
      'Language script failed to load, falling back to default lang.',
      err
    );
    if (idioma !== DEFAULT_LANG) {
      try {
        await loadI18n(DEFAULT_LANG);
      } catch (e) {
        /* ignore */
      }
    }
  }
  // Muestra la tabla de umbrales de latencia con detalles que se pueden desplegar
  function renderLeyendaContent(container, leyendaData) {
    if (!container || !leyendaData) return;

    container.innerHTML = '';

    const introP = document.createElement('p');
    introP.textContent = leyendaData.intro || '';
    container.appendChild(introP);

    const umbralesSection = document.createElement('div');
    umbralesSection.className = 'leyenda-section umbrales-latencia';

    const table = document.createElement('table');
    table.className = 'leyenda-tabla-umbrales';
    const thead = document.createElement('thead');
    thead.innerHTML = `
            <tr>
                <th>Estado / Nivel</th>
                <th>Umbral de Latencia (ms)</th>
                <th>Justificación de los Umbrales de Latencia</th>
            </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (leyendaData.umbrales || []).forEach((u) => {
      const tr = document.createElement('tr');

      const tdStatus = document.createElement('td');
      tdStatus.className = u.className || '';
      tdStatus.textContent = `${u.emoji || ''} ${u.label || ''}`;
      tr.appendChild(tdStatus);

      const tdRange = document.createElement('td');
      tdRange.textContent = u.range_text || '';
      tr.appendChild(tdRange);

      const tdJustif = document.createElement('td');
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = u.summary || '';
      const p = document.createElement('p');
      p.textContent = u.details || '';
      details.appendChild(summary);
      details.appendChild(p);
      tdJustif.appendChild(details);
      tr.appendChild(tdJustif);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    umbralesSection.appendChild(table);
    container.appendChild(umbralesSection);

    const codesSection = document.createElement('div');
    codesSection.className = 'leyenda-section codigos-error-section';
    codesSection.style.marginTop = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = leyendaData.http_codes_title || '';
    codesSection.appendChild(h3);

    const pDesc = document.createElement('p');
    pDesc.textContent = leyendaData.http_codes_description || '';
    codesSection.appendChild(pDesc);

    const tableCodes = document.createElement('table');
    tableCodes.className = 'leyenda-tabla-errores';
    const theadCodes = document.createElement('thead');
    theadCodes.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Rango/Nombre Común</th>
                <th>Significado Operacional</th>
            </tr>`;
    tableCodes.appendChild(theadCodes);

    const tbodyCodes = document.createElement('tbody');
    (leyendaData.codigos_error || []).forEach((c) => {
      const tr = document.createElement('tr');
      const tdCode = document.createElement('td');
      tdCode.textContent = c.code || '';
      tr.appendChild(tdCode);
      const tdLabel = document.createElement('td');
      tdLabel.textContent = c.label || '';
      tr.appendChild(tdLabel);
      const tdDesc = document.createElement('td');
      tdDesc.textContent = c.description || '';
      tr.appendChild(tdDesc);
      tbodyCodes.appendChild(tr);
    });
    tableCodes.appendChild(tbodyCodes);
    codesSection.appendChild(tableCodes);

    container.appendChild(codesSection);
  }

  // Cambiamos los textos de la página con las traducciones cargadas
  if (typeof window.TEXTOS_ACTUAL !== 'undefined') {
    const titleEl = document.getElementById('leyenda-titulo');
    const headerEl = document.getElementById('titulo-leyenda');
    const contentEl = document.getElementById('contenido-leyenda');

    if (titleEl)
      titleEl.textContent = window.TEXTOS_ACTUAL.leyenda.title_browser;
    if (headerEl)
      headerEl.textContent = window.TEXTOS_ACTUAL.leyenda.main_header;
    if (contentEl)
      renderLeyendaContent(contentEl, window.TEXTOS_ACTUAL.leyenda);
  } else {
    console.error('No se cargaron las traducciones para la leyenda.');
  }
});

/**
 * Actualiza el icono del botón toggle según el tema actual
 * Oculta el botón si el tema no tiene pareja en TEMA_TOGGLE_PAIRS
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

/**
 * Alterna entre temas usando TEMA_TOGGLE_PAIRS (consistente con script.js)
 */
function toggleDarkMode() {
  const temaBaseLink = document.getElementById('tema-base-css');
  const params = new URLSearchParams(window.location.search);
  const temaUrl = params.get('tema');

  // Vemos el tema actual desde la URL o usamos el default
  let temaActual = DEFAULT_LEYENDA_TEMA;
  if (temaUrl && LEYENDA_TEMA_FILES[temaUrl]) {
    temaActual = temaUrl;
  }

  // Buscamos la pareja del tema actual en TEMA_TOGGLE_PAIRS
  const nuevoTema =
    typeof TEMA_TOGGLE_PAIRS !== 'undefined'
      ? TEMA_TOGGLE_PAIRS[temaActual]
      : null;

  // Si no hay pareja, no hacemos nada
  if (!nuevoTema) return;

  // Cambiamos al nuevo tema
  if (LEYENDA_TEMA_FILES[nuevoTema]) {
    temaBaseLink.href = LEYENDA_TEMA_FILES[nuevoTema];

    // Cambiamos las clases del body
    document.body.classList.remove(`theme-${temaActual}`);
    document.body.classList.add(`theme-${nuevoTema}`);

    // Cambiamos la URL para reflejar el nuevo tema
    params.set('tema', nuevoTema);
    const nuevaUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nuevaUrl);

    // Actualizamos el botón para el nuevo tema
    actualizarBotonToggle(nuevoTema);
  }
}
