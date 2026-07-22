// Umbrales de latencia (en milisegundos)
const UMBRALES_LATENCIA = {
  MUY_RAPIDO: 300,
  RAPIDO: 500,
  NORMAL: 800,
  LENTO: 1500,
  CRITICO: 3000,
  RIESGO: 5000,
  PENALIZACION_FALLO: 99999,
};

// -----------------------------
// 1) Temas y archivos CSS (UI)
// -----------------------------
const TEMA_DEFAULT = 'def';
const TEMA_PRO = 'pro';
const TEMA_PRO2 = 'pro2';
const TEMA_MIN = 'min';
const TEMA_OSC = 'osc';

const TEMA_FILES = {
  [TEMA_DEFAULT]: 'css/monitor_def.css',
  [TEMA_PRO]: 'css/monitor_pro.css',
  [TEMA_PRO2]: 'css/monitor_pro2.css',
  [TEMA_MIN]: 'css/monitor_min.css',
  [TEMA_OSC]: 'css/monitor_osc.css',
};

const TEMA_TOGGLE_PAIRS = {
  [TEMA_DEFAULT]: TEMA_OSC,
  [TEMA_OSC]: TEMA_DEFAULT,
  [TEMA_PRO2]: TEMA_PRO,
  [TEMA_PRO]: TEMA_PRO2,
};

// CORREGIDO: TEMAS_BASICOS incluye def Y osc (ambos ocultan funciones avanzadas)
const TEMAS_BASICOS = [TEMA_DEFAULT, TEMA_OSC];

const DEFAULT_LEYENDA_TEMA = TEMA_DEFAULT;
const LEYENDA_TEMA_FILES = {
  default: 'css/leyenda_claro.css',
  def: 'css/leyenda_claro.css',
  pro2: 'css/leyenda_claro.css',
  min: 'css/leyenda_claro.css',
  pro: 'css/leyenda_oscuro.css',
  osc: 'css/leyenda_oscuro.css',
};

// -----------------------------
// 2) Umbrales y estados
// -----------------------------
const ESTADO_ERROR_CONEXION = 0;

const HTTP_STATUS_SUCCESS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
};

const HTTP_STATUS_ERROR = {
  NO_CONNECTION: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  IM_A_TEAPOT: 418,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// -----------------------------
// 3) Proxy, frecuencia y archivos
// -----------------------------
const PROXY_ENDPOINT = '/.netlify/functions/check-status';
const FRECUENCIA_MONITOREO_MS = 5 * 60 * 1000;

const WEBSITES_FILE = 'data/webs.json';
const PSI_BASE_URL = 'https://pagespeed.web.dev/report?url=';

// -----------------------------
// 4) Opciones de historial/duración
// -----------------------------
const HORAS_DISPONIBLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DURACION_OPCIONES = {};
HORAS_DISPONIBLES.forEach((horas) => {
  const key = `${horas}h`;
  DURACION_OPCIONES[key] = {
    mediciones: horas * 12,
    etiqueta: horas === 1 ? '1 hora' : `${horas} horas`,
  };
});

const DURACION_DEFAULT = '1h';
const MAX_HISTORIAL_ENTRIES = DURACION_OPCIONES[DURACION_DEFAULT].mediciones;

// -----------------------------
// 5) I18N (archivos de idioma)
// -----------------------------
// CORREGIDO: Solo idiomas existentes (es, en)
const I18N_FILES = {
  es: 'lang/i18n_es.js',
  en: 'lang/i18n_en.js',
};

const DEFAULT_LANG = 'es';

// -----------------------------
// 6) Detección de fallo global
// -----------------------------
const GRUPO_CRITICO_NOMBRE = 'CRITICO';
const UMBRAL_FALLO_GLOBAL_MS = 9000;
const PORCENTAJE_FALLO_GLOBAL = 0.8;

// -----------------------------
// 7) Configuraciones de alertas en frontend (UI)
// -----------------------------
const ALERTAS_AUTO_CLOSE_MS = 30000;
const ALERTAS_COPY_LABEL_RESET_MS = 1500;
