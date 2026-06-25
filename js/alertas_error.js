// alertas_error.js
// Muestra un alert en el frontend solo la primera vez que un sitio da error en una hora
// Requiere que se llame a window.registrarErrorSitio(nombre, url, latencia, codigo, descripcion) cuando se detecta un error
(function () {
  // Guarda el último error notificado por sitio y hora (en memoria, por sesión)
  // Usa localStorage para persistir los errores notificados por sitio y hora
  // (Eliminada función duplicada getErroresNotificados)
  // Usamos sessionStorage para mantener el comportamiento por sesión
  function getErroresNotificados() {
    try {
      return (
        JSON.parse(sessionStorage.getItem('erroresNotificadosMonitor')) || {}
      );
    } catch (e) {
      console.warn('Error leyendo erroresNotificadosMonitor:', e);
      return {};
    }
  }
  function setErroresNotificados(obj) {
    try {
      sessionStorage.setItem('erroresNotificadosMonitor', JSON.stringify(obj));
    } catch (e) {
      console.warn('Error guardando erroresNotificadosMonitor:', e);
    }
  }

  // Asegura que el CSS de notificaciones esté cargado
  function ensureAlertasCss() {
    try {
      if (typeof document === 'undefined' || !document.head) return;
      if (document.getElementById('alertas-error-css')) return;
      const link = document.createElement('link');
      link.id = 'alertas-error-css';
      link.rel = 'stylesheet';
      link.href = 'css/alertas_error.css';
      document.head.appendChild(link);
    } catch (e) {
      console.warn('No se pudo cargar css alertas:', e);
    }
  }

  // Función para limpiar el registro de error de un sitio (cuando se recupera)
  window.limpiarErrorSitio = function (nombre) {
    const erroresNotificados = getErroresNotificados();
    if (erroresNotificados[nombre]) {
      delete erroresNotificados[nombre];
      setErroresNotificados(erroresNotificados);
    }
  };

  // Función global para registrar un error y mostrar alert si corresponde
    window.registrarErrorSitio = function (
      nombre,
      url,
      latencia,
      codigo,
      descripcion,
      diagnostics
    ) {
    const clave = nombre;
    const erroresNotificados = getErroresNotificados();
    if (erroresNotificados[clave]) return; // Ya se notificó este sitio hasta que se recupere
    erroresNotificados[clave] = true;
    setErroresNotificados(erroresNotificados);
    let label = '',
      desc = '';
    if (
      window.TEXTOS_ACTUAL &&
      window.TEXTOS_ACTUAL.httpStatus &&
      window.TEXTOS_ACTUAL.httpCodes
    ) {
      const info = window.TEXTOS_ACTUAL.httpCodes.find(
        (e) => e.code === codigo
      );
      if (info) {
        label = info.label;
        desc = info.description;
      }
    }
    let mensaje = `ALERTA: Error detectado en "${nombre}"\n`;
    mensaje += `URL: ${url}\n`;
    if (latencia !== undefined) mensaje += `Latencia: ${latencia} ms\n`;
    mensaje += `Código: ${codigo}`;
    if (label) mensaje += ` - ${label}`;
    mensaje += `\n`;
    // Priorizar la descripción específica enviada por la función (`descripcion`),
    // si existe. Si no, usar la descripción genérica del código (`desc`).
    if (descripcion) mensaje += `Descripción: ${descripcion}`;
    else if (desc) mensaje += `Descripción: ${desc}`;

    // Añadir detalles de diagnóstico (DNS, TCP, attempts) si están presentes
    try {
      if (diagnostics) {
        mensaje += `\n\nDiagnostics: ${JSON.stringify(diagnostics)}`;
      }
    } catch (e) {
      // ignore JSON errors
    }
    mostrarNotificacionError(mensaje);
  };

  // Crea una notificación flotante con el mensaje y botón de copiar
  function mostrarNotificacionError(mensaje) {
    // Crear contenedor si no existe
    if (typeof document === 'undefined' || !document.body) return;

    ensureAlertasCss();

    let contenedor = document.getElementById('notificaciones-errores');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'notificaciones-errores';
      document.body.appendChild(contenedor);
    }

    // Crear la notificación
    const notif = document.createElement('div');
    notif.classList.add('notif-alarma');

    // Texto seleccionable
    const texto = document.createElement('div');
    texto.textContent = mensaje;
    texto.classList.add('texto');
    notif.appendChild(texto);

    // Botón copiar
    const btnCopiar = document.createElement('button');
    const LABEL_COPIAR =
      (window.TEXTOS_ACTUAL &&
        window.TEXTOS_ACTUAL.general &&
        window.TEXTOS_ACTUAL.general.BTN_COPIAR) ||
      'Copiar';
    const LABEL_COPIADO =
      (window.TEXTOS_ACTUAL &&
        window.TEXTOS_ACTUAL.general &&
        window.TEXTOS_ACTUAL.general.BTN_COPIADO) ||
      '¡Copiado!';
    btnCopiar.textContent = LABEL_COPIAR;
    btnCopiar.classList.add('btn-copiar');
    btnCopiar.onclick = function () {
      // Intentar usar clipboard API, con fallback a execCommand
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(mensaje)
          .then(() => {
            btnCopiar.textContent = LABEL_COPIADO;
            setTimeout(
              () => {
                btnCopiar.textContent = LABEL_COPIAR;
              },
              typeof ALERTAS_COPY_LABEL_RESET_MS !== 'undefined'
                ? ALERTAS_COPY_LABEL_RESET_MS
                : 1500
            );
          })
          .catch((err) => {
            console.warn('Clipboard API falló, intentando fallback:', err);
            fallbackCopyText(mensaje, btnCopiar, LABEL_COPIAR, LABEL_COPIADO);
          });
      } else {
        fallbackCopyText(mensaje, btnCopiar, LABEL_COPIAR, LABEL_COPIADO);
      }
    };
    notif.appendChild(btnCopiar);

    // Botón cerrar
    const btnCerrar = document.createElement('button');
    btnCerrar.textContent = '×';
    btnCerrar.classList.add('btn-cerrar');
    btnCerrar.onclick = function () {
      contenedor.removeChild(notif);
    };
    btnCerrar.setAttribute('aria-label', 'Cerrar notificación');
    notif.appendChild(btnCerrar);

    contenedor.appendChild(notif);
    // Auto-cerrar después del tiempo configurado
    setTimeout(
      () => {
        if (contenedor.contains(notif)) contenedor.removeChild(notif);
      },
      typeof ALERTAS_AUTO_CLOSE_MS !== 'undefined'
        ? ALERTAS_AUTO_CLOSE_MS
        : 30000
    );
  }

  // Fallback de copia para navegadores sin Clipboard API
  function fallbackCopyText(text, btn, labelCopiar, labelCopiado) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        btn.textContent = labelCopiado;
        setTimeout(
          () => {
            btn.textContent = labelCopiar;
          },
          typeof ALERTAS_COPY_LABEL_RESET_MS !== 'undefined'
            ? ALERTAS_COPY_LABEL_RESET_MS
            : 1500
        );
      } else {
        console.warn('fallbackCopyText: execCommand(copy) no fue exitoso');
      }
    } catch (e) {
      console.warn('fallbackCopyText error:', e);
    }
  }
})();
