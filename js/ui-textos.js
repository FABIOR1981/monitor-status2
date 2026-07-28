// ui-textos.js
// Todo lo relacionado a idioma (i18n), textos/etiquetas del DOM, y el
// formateo de "estado visual" (velocidad/color según latencia y código
// HTTP). No toca la tabla ni el monitoreo en sí (eso vive en monitoreo.js).

function configurarEnlaceLeyenda() {
  const enlaceLeyenda = document.getElementById('enlace-leyenda');
  if (enlaceLeyenda) {
    enlaceLeyenda.href = `leyenda.html${window.location.search}`;
  }
}

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

/**
 * Devuelve una descripción legible para un código de estado HTTP.
 * Primero busca una etiqueta explícita en el diccionario de idioma
 * (lang/i18n_es.js / i18n_en.js). Si el código no está mapeado ahí
 * (por ejemplo 520-530, que son extensiones propias de Cloudflare y
 * no códigos HTTP oficiales), clasifica por RANGO en vez de exigir
 * que cada código nuevo se agregue a mano.
 */
function obtenerDescripcionPorRango(codigo) {
  // Rango 520-530: extensiones no estándar usadas por Cloudflare (y CDNs
  // similares) para indicar que el proxy/CDN funcionó, pero el servidor
  // de origen detrás no respondió correctamente o a tiempo.
  if (codigo >= 520 && codigo <= 530) {
    return 'Error de origen vía CDN/Proxy (Cloudflare u similar) — el servidor real no respondió';
  }
  if (codigo >= 500 && codigo < 600) {
    return 'Error del servidor';
  }
  if (codigo >= 400 && codigo < 500) {
    return 'Error del cliente';
  }
  if (codigo >= 300 && codigo < 400) {
    return 'Redireccionamiento';
  }
  return window.TEXTOS_ACTUAL?.httpStatus?.GENERIC || 'Error HTTP';
}

function obtenerDescripcionEstadoHttp(codigo) {
  return (
    window.TEXTOS_ACTUAL?.httpStatus?.[codigo] ||
    obtenerDescripcionPorRango(codigo)
  );
}

function obtenerEstadoVisual(tiempo, estado = 200, esVerificadoDirecto = false) {
  const tiempoNum = parseFloat(tiempo);

  // Si fue verificado directamente y el proxy decía "caído", pero la
  // verificación directa confirmó que funciona (status 200): esto YA NO
  // significa "todo bien". Significa que el sitio respondió por la ruta
  // interna/directa pero no por la ruta externa (proxy) — es decir, un
  // usuario externo (el caso que más nos importa) podría no poder entrar,
  // aunque desde acá adentro sí funcione. Se marca como advertencia
  // distinta en vez de mostrarlo como si fuera un éxito normal.
  if (esVerificadoDirecto && estado === 200) {
    return {
      text: window.TEXTOS_ACTUAL.estados.BLOQUEO_EXTERNO,
      className: 'status-bloqueo-externo',
    };
  }

  if (estado !== 200 || tiempoNum >= UMBRALES_LATENCIA.PENALIZACION_FALLO) {
    const descripcionEstado = obtenerDescripcionEstadoHttp(estado);

    const textoFallo =
      estado !== 200
        ? `${window.TEXTOS_ACTUAL.estados.DOWN_ERROR} (${estado} - ${descripcionEstado})`
        : window.TEXTOS_ACTUAL.estados.DOWN_ERROR;

    return {
      text: textoFallo,
      className: 'status-down',
    };
  }

  // A esta altura la medición viene del proxy (si fuera directa y status 200,
  // ya se resolvió más arriba). Se usa la escala PROXY, más permisiva, porque
  // incluye la latencia de red real entre el datacenter de Netlify y el sitio.
  const estadosVelocidad = [
    {
      umbral: UMBRALES_LATENCIA_PROXY.MUY_RAPIDO,
      text: window.TEXTOS_ACTUAL.velocidad.VERY_FAST,
      className: 'status-very-fast',
    },
    {
      umbral: UMBRALES_LATENCIA_PROXY.RAPIDO,
      text: window.TEXTOS_ACTUAL.velocidad.FAST,
      className: 'status-fast',
    },
    {
      umbral: UMBRALES_LATENCIA_PROXY.NORMAL,
      text: window.TEXTOS_ACTUAL.velocidad.NORMAL,
      className: 'status-normal',
    },
    {
      umbral: UMBRALES_LATENCIA_PROXY.LENTO,
      text: window.TEXTOS_ACTUAL.velocidad.SLOW,
      className: 'status-slow',
    },
    {
      umbral: UMBRALES_LATENCIA_PROXY.CRITICO,
      text: window.TEXTOS_ACTUAL.velocidad.CRITICAL,
      className: 'status-critical',
    },
    {
      umbral: UMBRALES_LATENCIA_PROXY.RIESGO,
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
