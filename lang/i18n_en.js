// Translation file - English
// This file only contains English texts
// Should not contain logic, only data
const TEXTOS_EN = {
  general: {
    PAGE_TITLE: 'Service Status Monitor',
    LAST_UPDATE: 'Last Update:',
    LOADING: 'Loading...',
    INFO_BAR:
      'Data is automatically updated every 5 minutes using a Serverless Proxy.',
    ADVERTENCIA_FALLO_GLOBAL_HTML:
      'Monitoring data unavailable/unreliable. Widespread critical latency detected, possibly due to a monitoring system overload. Please wait for the next cycle or refresh the page.',
    MOTIVO_FALLO_PRO: 'Pro Reason:',
    FALLO_CRITICO_GRUPO: '100% of the critical group failed:',
    FALLO_CRITICO_LATENCIA_PARTE1: '% of services exceeded the threshold of',
    FALLO_CRITICO_RED: 'No results available (Total network failure)',
    DURACION_LABEL: 'History duration:',
    DURACION_HORA_SINGULAR: 'hour',
    DURACION_HORA_PLURAL: 'hours',
    DURACION_MEDICIONES: 'measurements',
    BTN_REINICIAR: 'Restart Monitoring',
    BTN_COPIAR: 'Copy',
    BTN_COPIADO: 'Copied!',
    BTN_CERRAR: 'Close',
  },

  velocidad: {
    VERY_FAST: 'VERY FAST',
    FAST: 'FAST',
    NORMAL: 'NORMAL',
    SLOW: 'SLOW',
    CRITICAL: 'CRITICAL',
    RISK: 'RISK',
    EXTREME_RISK: 'EXTREME RISK',
  },

  estados: {
    DOWN: 'DOWN',
    DOWN_ERROR: 'DOWN/ERROR',
  },
  httpCodes: [
    {
      code: 0,
      label: 'No connection',
      description:
        'Could not connect to the server. Can be a non-existent DNS (the domain does not exist, marked down immediately) or a timeout/refused connection (in these cases the system also verifies directly from your browser before confirming the outage).',
    },
    {
      code: 301,
      label: 'Moved permanently',
      description: 'The resource has been permanently moved to a new URL.',
    },
    {
      code: 302,
      label: 'Moved temporarily',
      description: 'The resource is temporarily located at a different URL.',
    },
    {
      code: 304,
      label: 'Not modified',
      description: 'The resource has not changed since the last request.',
    },
    {
      code: 400,
      label: 'Bad request',
      description: 'Malformed or invalid request.',
    },
    {
      code: 401,
      label: 'Unauthorized',
      description: 'Authentication required to access the resource.',
    },
    {
      code: 402,
      label: 'Payment required',
      description: 'Reserved for future use in payment systems.',
    },
    {
      code: 403,
      label: 'Forbidden',
      description:
        'Access denied, even with valid authentication. In this monitor it usually means a WAF/firewall blocked the proxy (because it comes from a cloud server) — the site may be working fine for real users. The system verifies directly from your browser (🖥️) to confirm.',
    },
    {
      code: 404,
      label: 'Not found',
      description: 'The requested resource does not exist on the server.',
    },
    {
      code: 405,
      label: 'Method not allowed',
      description: 'The HTTP method used is not allowed for this resource.',
    },
    {
      code: 406,
      label: 'Not acceptable',
      description:
        'The server cannot generate an acceptable response according to Accept headers.',
    },
    {
      code: 408,
      label: 'Request timeout',
      description:
        'The site responded, but the proxy took more than 25 seconds to get a response (SLOW_RESPONSE). Not an outage: the service works but extremely slowly.',
    },
    {
      code: 409,
      label: 'Conflict',
      description:
        'The request conflicts with the current state of the server.',
    },
    {
      code: 410,
      label: 'Gone',
      description:
        'The resource was permanently deleted and has no forwarding address.',
    },
    {
      code: 418,
      label: "I'm a teapot",
      description:
        'Humorous code (RFC 2324). Some services use it to reject requests.',
    },
    {
      code: 429,
      label: 'Too many requests',
      description:
        'The service rate limit was exceeded. Like 403, this can be a WAF throttling the proxy — the site is not necessarily down for real users.',
    },
    {
      code: 500,
      label: 'Internal server error',
      description: 'Generic internal server error.',
    },
    {
      code: 501,
      label: 'Not implemented',
      description:
        'The server does not support the functionality required to complete the request.',
    },
    {
      code: 502,
      label: 'Bad gateway',
      description:
        'A proxy/gateway received an invalid response from the origin server.',
    },
    {
      code: 503,
      label: 'Service unavailable',
      description:
        'The server is temporarily overloaded, under maintenance, or offline.',
    },
    {
      code: 504,
      label: 'Gateway timeout',
      description:
        'A proxy/gateway did not receive a timely response from the origin server.',
    },
  ],
};

// Construir el objeto httpStatus automáticamente desde el array de códigos
// Esto evita duplicar la información y mantiene todo sincronizado
TEXTOS_EN.httpStatus = {};
TEXTOS_EN.httpCodes.forEach((item) => {
  TEXTOS_EN.httpStatus[item.code] = item.label;
});
TEXTOS_EN.httpStatus.GENERIC = 'HTTP Error';

TEXTOS_EN.tabla = {
  HEADER_SERVICE: 'Service',
  HEADER_URL: 'URL',
  HEADER_LATENCY_ACTUAL: 'Current Latency',
  HEADER_STATUS_ACTUAL: 'Current Status',
  HEADER_PROMEDIO_MS: 'Average',
  HEADER_PROMEDIO_STATUS: 'Average Status',
  HEADER_ACTION: 'Action',
};

TEXTOS_EN.leyenda = {
  title_browser: 'Status Monitor Legend',
  main_header: 'Latency Thresholds and Operational Justification',
  link_volver: 'Back to Application',
  intro:
    'Colors and symbols reflect the measured response time (latency). The justification is based on Interaction Psychology and the Operational Meaning of performance. IMPORTANT: the system measures in two different ways (\ud83c\udf10 proxy and \ud83d\udda5\ufe0f direct), and each one uses its own threshold scale because they are not directly comparable — see the "What do the \ud83c\udf10 and \ud83d\udda5\ufe0f icons mean?" section below.',
  umbrales: [
    {
      key: 'very_fast',
      className: 'status-very-fast',
      emoji: '🚀',
      label: 'VERY FAST',
      range_text: '\ud83d\udda5\ufe0f Direct: < 300 ms  \u00b7  \ud83c\udf10 Proxy: < 600 ms',
      summary: 'Optimal Performance (Instantaneous to the User)',
      details:
        "Golden Standard. The human brain perceives responses under 100 ms as instant (Nielsen's guideline). Keeping the threshold up to 300 ms ensures a smooth experience. Operational Meaning: The system is operating in optimal conditions.",
    },
    {
      key: 'fast',
      className: 'status-fast',
      emoji: '⭐',
      label: 'FAST',
      range_text: '\ud83d\udda5\ufe0f Direct: 300\u2013500 ms  \u00b7  \ud83c\udf10 Proxy: 600\u20131000 ms',
      summary: 'Fluid Interaction without Noticeable Wait',
      details:
        'Limit of Unconscious Perception. The delay is noticeable but not perceived as a bothersome wait. Operational Meaning: Excellent performance; good control point for fast backend processes.',
    },
    {
      key: 'normal',
      className: 'status-normal',
      emoji: '✅',
      label: 'NORMAL',
      range_text: '\ud83d\udda5\ufe0f Direct: 500\u2013800 ms  \u00b7  \ud83c\udf10 Proxy: 1000\u20131600 ms',
      summary: 'Acceptable Performance (User Maintains Focus)',
      details:
        'Begin of Distraction. From 500 ms the user may start to divert attention, although they can maintain their thought flow. Operational Meaning: Acceptable performance but approaching where wait sensation consolidates.',
    },
    {
      key: 'slow',
      className: 'status-slow',
      emoji: '⚠️',
      label: 'SLOW',
      range_text: '\ud83d\udda5\ufe0f Direct: 800\u20131500 ms  \u00b7  \ud83c\udf10 Proxy: 1600\u20133000 ms',
      summary: 'Annoying Delay (Active Distractor / Early Alert)',
      details:
        '1 second limit. The delay becomes an active distractor. Experience is noticeably degraded. Operational Meaning: Early Alert. Server or network under stress; investigate.',
    },
    {
      key: 'critical',
      className: 'status-critical',
      emoji: '🐌',
      label: 'CRITICAL',
      range_text: '\ud83d\udda5\ufe0f Direct: 1500\u20133000 ms  \u00b7  \ud83c\udf10 Proxy: 3000\u20136000 ms',
      summary: 'Abandonment Risk (3 Seconds / Imminent Failure)',
      details:
        'Loss of Focus and Frustration. The critical boundary (3 seconds) where users may abandon pages. Operational Meaning: Imminent Failure. Heavy load or severe bottlenecks.',
    },
    {
      key: 'risk',
      className: 'status-risk',
      emoji: '🚨',
      label: 'RISK',
      range_text: '\ud83d\udda5\ufe0f Direct: 3000\u20135000 ms  \u00b7  \ud83c\udf10 Proxy: 6000\u201310000 ms',
      summary: 'Functional Failure and Collapse (5 Seconds / Alarm)',
      details:
        'Functional Failure. Delays longer than 5 seconds are often considered a functional failure. Operational Meaning: ALARM. Service near collapse or unreliable request handling.',
    },
    {
      key: 'extreme_risk',
      className: 'status-extreme-risk',
      emoji: '🔥',
      label: 'EXTREME RISK',
      range_text: '\ud83d\udda5\ufe0f Direct: 5000\u201399999 ms  \u00b7  \ud83c\udf10 Proxy: 10000\u201399999 ms',
      summary: 'Unacceptable Latency (Chaos / Guaranteed Abandonment)',
      details:
        'Chaos/Limbo. Range before maximum timeout. The user likely abandoned the action. Operational Meaning: Server cannot process requests in reasonable time. Immediate attention required.',
    },
    {
      key: 'down',
      className: 'status-down',
      emoji: '❌',
      label: 'DOWN',
      range_text: '≥ 99999 ms',
      summary: 'Confirmed Outage (Timeout Exceeded)',
      details:
        'Confirmed Outage. The PENALIZACION_FALLO value was exceeded. Operational Meaning: Service is down, route is unreachable, or server refused to respond.',
    },
  ],
  http_codes_title: 'HTTP Status Codes and System Failures',
  http_codes_description:
    'When a service returns a status code outside the 2xx range (Success), the monitor visually classifies it as ❌ DOWN, but it displays the real status code (e.g., ❌ Down (404)).',
  iconos_title: 'What do the 🌐 and 🖥️ icons mean?',
  iconos_intro:
    'This monitor checks each site in two possible ways. That is why there are two different threshold scales (see table above): comparing a 🌐 time against the 🖥️ thresholds (or vice versa) gives a wrong reading.',
  iconos: [
    {
      emoji: '🌐',
      label: 'Proxy (public internet)',
      desc: 'Measurement taken from a Netlify server. This is the default measurement. Since it travels over the internet (sometimes across countries/continents), it naturally has more latency — that is why its threshold scale is more lenient.',
    },
    {
      emoji: '🖥️',
      label: 'Direct (your browser)',
      desc: 'Measurement taken from your own browser, usually when the proxy reported an outage (to rule out a WAF blocking the proxy rather than a real outage). Reflects your real experience, hence the stricter scale.',
    },
  ],
  iconos_nota_borde:
    'A blue left border on a row indicates that the last measurement for that site was direct (🖥️).',
  iconos_nota_promedio:
    'If a site has mixed measurements (some via proxy, some direct), the "Average" column shows both values separately, e.g.: 620 ms 🌐 / 45 ms 🖥️.',
};

TEXTOS_EN.leyenda.codigos_error = [
  {
    code: '2xx',
    label: 'OK / Success',
    description:
      'The connection and service responded correctly (latency measured).',
  },
];

TEXTOS_EN.httpCodes
  .filter((item) => item.code === 0 || item.code >= 400)
  .forEach((item) => {
    TEXTOS_EN.leyenda.codigos_error.push({
      code: item.code.toString(),
      label: item.label,
      description: item.description,
    });
  });

// Solo asignar los textos a la variable global
// La lógica de carga está en i18n.js
window.TEXTOS_ACTUAL = TEXTOS_EN;
