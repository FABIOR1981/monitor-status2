// Archivo de traducción - Español
// Este archivo solo contiene los textos en español
// No debe contener lógica, solo datos
const TEXTOS_ES = {
  general: {
    PAGE_TITLE: 'Monitor de Estado de Servicios',
    LAST_UPDATE: 'Última actualización:',
    LOADING: 'Cargando...',
    INFO_BAR:
      'Los datos se actualizan automáticamente cada 5 minutos usando un Proxy Serverless.',
    ADVERTENCIA_FALLO_GLOBAL_HTML:
      'Datos de monitoreo no disponibles/no confiables. Se detectó una latencia crítica generalizada, posiblemente debido a una sobrecarga del sistema de monitoreo. Por favor, espere el próximo ciclo o actualice la página.',
    MOTIVO_FALLO_PRO: 'Motivo Pro:',
    FALLO_CRITICO_GRUPO: 'Falló el 100% del grupo crítico:',
    FALLO_CRITICO_LATENCIA_PARTE1: '% de los servicios superaron el umbral de',
    FALLO_CRITICO_RED: 'No hay resultados disponibles (Fallo de red total)',
    DURACION_LABEL: 'Duración del historial:',
    DURACION_HORA_SINGULAR: 'hora',
    DURACION_HORA_PLURAL: 'horas',
    DURACION_MEDICIONES: 'mediciones',
    BTN_REINICIAR: 'Reiniciar Monitoreo',
    BTN_COPIAR: 'Copiar',
    BTN_COPIADO: '¡Copiado!',
    BTN_CERRAR: 'Cerrar',
  },
  velocidad: {
    VERY_FAST: 'MUY RÁPIDO',
    FAST: 'RÁPIDO',
    NORMAL: 'NORMAL',
    SLOW: 'LENTO',
    CRITICAL: 'CRÍTICO',
    RISK: 'RIESGO',
    EXTREME_RISK: 'RIESGO EXTREMO',
  },
  estados: {
    DOWN: 'CAÍDA',
    DOWN_ERROR: 'CAÍDA/ERROR',
  },
  httpCodes: [
    {
      code: 0,
      label: 'Sin conexión',
      description:
        'No se pudo establecer conexión con el servidor. Puede ser DNS inexistente (el dominio no existe, se marca caído directamente), timeout o conexión rechazada (en estos casos el sistema además verifica directamente desde tu navegador antes de confirmar la caída).',
    },
    {
      code: 301,
      label: 'Redireccionamiento permanente',
      description: 'El recurso se ha movido permanentemente a una nueva URL.',
    },
    {
      code: 302,
      label: 'Redireccionamiento temporal',
      description: 'El recurso está temporalmente en una URL diferente.',
    },
    {
      code: 304,
      label: 'No modificado',
      description: 'El recurso no ha cambiado desde la última solicitud.',
    },
    {
      code: 400,
      label: 'Solicitud incorrecta',
      description: 'Solicitud mal formada o inválida.',
    },
    {
      code: 401,
      label: 'No autorizado',
      description: 'Se requiere autenticación para acceder al recurso.',
    },
    {
      code: 402,
      label: 'Pago requerido',
      description: 'Reservado para uso futuro en sistemas de pago.',
    },
    {
      code: 403,
      label: 'Acceso prohibido',
      description:
        'Acceso prohibido, incluso con autenticación válida. En este monitor suele significar que un WAF/firewall bloqueó al proxy (por venir de un servidor cloud) — el sitio puede estar funcionando normalmente para usuarios reales. El sistema verifica directamente desde tu navegador (🖥️) para confirmarlo.',
    },
    {
      code: 404,
      label: 'No encontrado',
      description: 'El recurso solicitado no existe en el servidor.',
    },
    {
      code: 405,
      label: 'Método no permitido',
      description: 'El método HTTP usado no está permitido para este recurso.',
    },
    {
      code: 406,
      label: 'No aceptable',
      description:
        'El servidor no puede generar una respuesta aceptable según los headers Accept.',
    },
    {
      code: 408,
      label: 'Tiempo agotado',
      description:
        'El sitio respondió, pero el proxy tardó más de 25 segundos en obtener la respuesta (SLOW_RESPONSE). No es una caída: el servicio funciona pero de forma extremadamente lenta.',
    },
    {
      code: 409,
      label: 'Conflicto',
      description:
        'La solicitud entra en conflicto con el estado actual del servidor.',
    },
    {
      code: 410,
      label: 'Ya no disponible',
      description:
        'El recurso fue eliminado permanentemente y no tiene dirección de reenvío.',
    },
    {
      code: 418,
      label: 'Soy una tetera',
      description:
        'Código humorístico (RFC 2324). Algunos servicios lo usan para rechazar solicitudes.',
    },
    {
      code: 429,
      label: 'Demasiadas solicitudes',
      description:
        'Se ha superado el límite de tasa (Rate Limit) del servicio. Al igual que el 403, puede tratarse de un WAF limitando al proxy — no necesariamente el sitio está caído para usuarios reales.',
    },
    {
      code: 500,
      label: 'Error del servidor',
      description: 'Error interno genérico del servidor.',
    },
    {
      code: 501,
      label: 'No implementado',
      description:
        'El servidor no soporta la funcionalidad requerida para completar la solicitud.',
    },
    {
      code: 502,
      label: 'Puerta de enlace incorrecta',
      description:
        'Un proxy/gateway recibió una respuesta inválida del servidor de origen.',
    },
    {
      code: 503,
      label: 'Servicio no disponible',
      description:
        'El servidor está temporalmente sobrecargado, en mantenimiento o inactivo.',
    },
    {
      code: 504,
      label: 'Tiempo agotado de puerta de enlace',
      description:
        'Un proxy/gateway no recibió respuesta a tiempo del servidor de origen.',
    },
  ],
};

// Construir el objeto httpStatus automáticamente desde el array de códigos
// Esto evita duplicar la información y mantiene todo sincronizado
TEXTOS_ES.httpStatus = {};
TEXTOS_ES.httpCodes.forEach((item) => {
  TEXTOS_ES.httpStatus[item.code] = item.label;
});
TEXTOS_ES.httpStatus.GENERIC = 'Error HTTP';

TEXTOS_ES.tabla = {
  HEADER_SERVICE: 'Servicio',
  HEADER_URL: 'URL',
  HEADER_LATENCY_ACTUAL: 'Latencia Actual',
  HEADER_STATUS_ACTUAL: 'Estado Actual',
  HEADER_PROMEDIO_MS: 'Promedio ',
  HEADER_PROMEDIO_STATUS: 'Estado Promedio',
  HEADER_ACTION: 'Acción',
};

TEXTOS_ES.leyenda = {
  title_browser: 'Leyenda del Monitor de Estado',
  main_header: 'Umbrales de Latencia y Justificación Operacional',
  link_volver: 'Volver a la Aplicación',
  intro:
    'Los colores y símbolos reflejan el tiempo de respuesta (latencia) medido. La justificación se basa en la Psicología de la Interacción y el Significado Operacional del rendimiento. IMPORTANTE: el sistema mide de dos formas distintas (🌐 proxy e 🖥️ directo), y cada una usa su propia escala de umbrales porque no son comparables entre sí — mirá la sección "¿Qué significan los iconos 🌐 y 🖥️?" más abajo.',
  umbrales: [
    {
      key: 'very_fast',
      className: 'status-very-fast',
      emoji: '🚀',
      label: 'MUY RÁPIDO',
      range_text: '🖥️ Directo: < 300 ms  ·  🌐 Proxy: < 600 ms',
      summary: 'Rendimiento Óptimo (Instantáneo para el Usuario)',
      details:
        'Estándar Dorado. El cerebro humano percibe cualquier respuesta por debajo de los 100 ms como instantánea (Regla de Nielsen). Mantener el umbral hasta 300 ms asegura una experiencia fluida. Significado Operacional: El sistema está operando en condiciones óptimas y con alta eficiencia.',
    },
    {
      key: 'fast',
      className: 'status-fast',
      emoji: '⭐',
      label: 'RÁPIDO',
      range_text: '🖥️ Directo: 300–500 ms  ·  🌐 Proxy: 600–1000 ms',
      summary: 'Interacción Fluida sin Molestias (Percepción Inconsciente)',
      details:
        'Límite de la Percepción Inconsciente. La demora es notable pero el usuario no la percibe como una espera molesta. Significado Operacional: Rendimiento excelente, buen punto de control para procesos rápidos de backend.',
    },
    {
      key: 'normal',
      className: 'status-normal',
      emoji: '✅',
      label: 'NORMAL',
      range_text: '🖥️ Directo: 500–800 ms  ·  🌐 Proxy: 1000–1600 ms',
      summary: 'Rendimiento Aceptable (El Foco se Mantiene)',
      details:
        'La Distracción Comienza. A partir de 500 ms el usuario puede comenzar a desviarse, aunque puede mantener su hilo de pensamiento. Significado Operacional: Rendimiento aceptable, pero acercándose a donde la sensación de espera se consolida.',
    },
    {
      key: 'slow',
      className: 'status-slow',
      emoji: '⚠️',
      label: 'LENTO',
      range_text: '🖥️ Directo: 800–1500 ms  ·  🌐 Proxy: 1600–3000 ms',
      summary: 'Demora Molesta (Distractor Activo / Alerta Temprana)',
      details:
        'Límite del 1 Segundo. La demora se convierte en un distractor activo. La experiencia está notablemente degradada. Significado Operacional: Alerta Temprana. El servidor o la red experimentan estrés. Momento de investigar.',
    },
    {
      key: 'critical',
      className: 'status-critical',
      emoji: '🐌',
      label: 'CRÍTICO',
      range_text: '🖥️ Directo: 1500–3000 ms  ·  🌐 Proxy: 3000–6000 ms',
      summary: 'Riesgo de Abandono del Usuario (3 Segundos / Fallo Inminente)',
      details:
        'Pérdida de Foco y Frustración. El límite crítico (3 segundos) donde los usuarios abandonan una página web. Significado Operacional: Fallo Inminente. Indica carga extremadamente pesada o cuellos de botella severos.',
    },
    {
      key: 'risk',
      className: 'status-risk',
      emoji: '🚨',
      label: 'RIESGO',
      range_text: '🖥️ Directo: 3000–5000 ms  ·  🌐 Proxy: 6000–10000 ms',
      summary: 'Fallo Funcional y Colapso (5 Segundos / Alarma)',
      details:
        'Fallo Funcional. Las demoras superiores a 5 segundos son consideradas un fallo funcional en muchos sistemas. Significado Operacional: ALARMA. El servicio está al borde del colapso o no sirve peticiones de manera confiable.',
    },
    {
      key: 'extreme_risk',
      className: 'status-extreme-risk',
      emoji: '🔥',
      label: 'RIESGO EXTREMO',
      range_text: '🖥️ Directo: 5000–99999 ms  ·  🌐 Proxy: 10000–99999 ms',
      summary: 'Latencia Inaceptable (CAOS / Abandono Asegurado)',
      details:
        'CAOS/Limbo. Rango antes del timeout máximo. Es casi seguro que el usuario abandonó la acción. Significado Operacional: El servidor no puede procesar la solicitud en un tiempo razonable. Requiere atención INMEDIATA.',
    },
    {
      key: 'down',
      className: 'status-down',
      emoji: '❌',
      label: 'FALLO TOTAL',
      range_text: '≥ 99999 ms',
      summary: 'Caída Confirmada (Timeout Excedido)',
      details:
        'Caída Confirmada. El valor de PENALIZACION_FALLO ha sido superado. Significado Operacional: El servicio está caído, la ruta es inaccesible, o el servidor se negó a responder.',
    },
  ],
  http_codes_title: 'Códigos de Estado HTTP y Fallos del Sistema',
  http_codes_description:
    'Cuando un servicio devuelve un código de estado fuera del rango 2xx (Éxito), el monitor lo clasifica visualmente como ❌ FALLO TOTAL, pero muestra el código real entre paréntesis (ej: ❌ Caída (404)).',
  iconos_title: '¿Qué significan los iconos 🌐 y 🖥️?',
  iconos_intro:
    'Este monitor verifica cada sitio de dos formas posibles. Por eso hay dos escalas de umbrales distintas (ver tabla de arriba): comparar un tiempo 🌐 contra los umbrales 🖥️ (o viceversa) da una lectura equivocada.',
  iconos: [
    {
      emoji: '🌐',
      label: 'Proxy (internet pública)',
      desc: 'Medición hecha desde un servidor de Netlify. Es la medición por defecto. Como viaja por internet (a veces cruzando países/continentes), naturalmente tiene más latencia — por eso su escala de umbrales es más permisiva.',
    },
    {
      emoji: '🖥️',
      label: 'Directo (tu navegador)',
      desc: 'Medición hecha desde tu propio navegador, generalmente cuando el proxy reportó una caída (para descartar que sea un WAF bloqueando al proxy y no una caída real). Refleja tu experiencia real, por eso usa la escala más estricta.',
    },
  ],
  iconos_nota_borde:
    'Un borde azul a la izquierda de una fila indica que la última medición de ese sitio fue directa (🖥️).',
  iconos_nota_promedio:
    'Si un sitio tiene mediciones mixtas (algunas por proxy, otras directas), la columna "Promedio" muestra ambos valores por separado, por ejemplo: 620 ms 🌐 / 45 ms 🖥️.',
};

TEXTOS_ES.leyenda.codigos_error = [
  {
    code: '2xx',
    label: 'OK / Éxito',
    description:
      'La conexión y el servicio respondieron correctamente (Latencia medida).',
  },
];

TEXTOS_ES.httpCodes
  .filter((item) => item.code === 0 || item.code >= 400)
  .forEach((item) => {
    TEXTOS_ES.leyenda.codigos_error.push({
      code: item.code.toString(),
      label: item.label,
      description: item.description,
    });
  });

// Solo asignar los textos a la variable global
// La lógica de carga está en i18n.js
window.TEXTOS_ACTUAL = TEXTOS_ES;
