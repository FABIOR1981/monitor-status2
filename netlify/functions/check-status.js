const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const https = require('https');
const http = require('http');
const dns = require('dns').promises;

// =======================================================
// CONFIGURACIÓN DE AGENTES - keepAlive:true para reutilizar conexiones
// y reducir overhead de SSL handshake en cada request
// =======================================================
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
  freeSocketTimeout: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
});

// =======================================================
// CONFIGURACIÓN DE TIMEOUTS
// =======================================================
const TIMEOUT_MS = 25000;          // 25s para el sitio real (era 15s)
const RETRY_DELAY_MS = 2000;       // 2s entre reintentos
const MAX_RETRIES = 2;             // Máximo 2 reintentos

// =======================================================
// HEADERS SIMPLIFICADOS - Menos fingerprinting de bot
// =======================================================
const simpleHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

// Headers mínimos para reintentos (algunos WAFs bloquean headers complejos)
const minimalHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': '*/*',
};

// =======================================================
// FUNCIÓN AUXILIAR: Sleep para delay entre reintentos
// =======================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =======================================================
// FUNCIÓN AUXILIAR: Realizar fetch con timeout y diagnóstico
// =======================================================
async function fetchWithDiagnostics(targetUrl, options, attemptNum) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startTime = Date.now();

  try {
    const parsed = new URL(targetUrl);
    const agentToUse = parsed.protocol === 'http:' ? httpAgent : httpsAgent;

    const resp = await fetch(targetUrl, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
      agent: agentToUse,
    });

    const totalTime = Date.now() - startTime;
    clearTimeout(timeoutId);

    return {
      success: true,
      status: resp.status,
      time: totalTime,
      attempt: attemptNum,
      headers: Object.fromEntries(resp.headers),
    };

  } catch (error) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    // Clasificar el tipo de error para diagnóstico
    let errorType = 'UNKNOWN';
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      errorType = 'TIMEOUT';
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'CONN_REFUSED';
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      errorType = 'DNS_ERROR';
    } else if (error.code === 'ETIMEDOUT') {
      errorType = 'CONN_TIMEOUT';
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
      errorType = 'SSL_ERROR';
    } else if (error.message && error.message.includes('timeout')) {
      errorType = 'TIMEOUT';
    } else if (error.message && error.message.includes('certificate')) {
      errorType = 'SSL_ERROR';
    }

    return {
      success: false,
      error: error.message,
      errorType: errorType,
      errorCode: error.code || error.name,
      elapsed: elapsed,
      attempt: attemptNum,
    };
  }
}

// =======================================================
// FUNCIÓN PRINCIPAL: Handler de Netlify
// =======================================================
exports.handler = async (event, context) => {
  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: "Parámetro 'url' requerido." }),
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const diagnostics = {
    url: targetUrl,
    attempts: [],
    dns: null,
    finalMethod: null,
  };

  try {
    // =======================================================
    // PASO 1: Verificar DNS (con timeout propio)
    // =======================================================
    try {
      const parsed = new URL(targetUrl);
      const dnsStart = Date.now();
      const dnsResult = await dns.lookup(parsed.hostname);
      diagnostics.dns = {
        resolved: true,
        hostname: parsed.hostname,
        ip: dnsResult.address,
        family: dnsResult.family,
        time: Date.now() - dnsStart,
      };
    } catch (dnsErr) {
      diagnostics.dns = {
        resolved: false,
        error: dnsErr.message,
        code: dnsErr.code,
      };
      // Si DNS falla, el sitio realmente no es accesible
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 0,
          time: 99999,
          error: `DNS failed: ${dnsErr.message}`,
          errorType: 'DNS_ERROR',
          diagnostics,
        }),
      };
    }

    // =======================================================
    // PASO 2: Intento principal con GET + headers simples
    // =======================================================
    let result = await fetchWithDiagnostics(targetUrl, {
      method: 'GET',
      headers: simpleHeaders,
      compress: true,
    }, 1);

    diagnostics.attempts.push(result);

    if (result.success) {
      diagnostics.finalMethod = 'GET_direct';
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: result.status,
          time: result.time,
          diagnostics,
        }),
      };
    }

    // =======================================================
    // PASO 3: Reintento 1 - Con headers mínimos (menos fingerprinting)
    // Algunos WAFs bloquean headers complejos pero permiten requests simples
    // =======================================================
    if (result.errorType === 'TIMEOUT' || result.errorType === 'CONN_TIMEOUT') {
      await sleep(RETRY_DELAY_MS);

      result = await fetchWithDiagnostics(targetUrl, {
        method: 'GET',
        headers: minimalHeaders,
        compress: false,
      }, 2);

      diagnostics.attempts.push(result);

      if (result.success) {
        diagnostics.finalMethod = 'GET_minimal_headers';
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: result.status,
            time: result.time,
            diagnostics,
          }),
        };
      }
    }

    // =======================================================
    // PASO 4: Reintento 2 - Con método HEAD (más rápido, menos datos)
    // Algunos servidores responden más rápido a HEAD que a GET
    // =======================================================
    if (result.errorType === 'TIMEOUT' || result.errorType === 'CONN_TIMEOUT') {
      await sleep(RETRY_DELAY_MS);

      result = await fetchWithDiagnostics(targetUrl, {
        method: 'HEAD',
        headers: minimalHeaders,
        compress: false,
      }, 3);

      diagnostics.attempts.push(result);

      if (result.success) {
        diagnostics.finalMethod = 'HEAD_minimal_headers';
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: result.status,
            time: result.time,
            diagnostics,
          }),
        };
      }
    }

    // =======================================================
    // PASO 5: Si llegamos aquí, el sitio realmente no responde
    // o está bloqueando nuestro proxy. Distinguir el tipo de error.
    // =======================================================
    const lastAttempt = diagnostics.attempts[diagnostics.attempts.length - 1];
    const isReallyDown = lastAttempt.errorType === 'CONN_REFUSED' ||
                         lastAttempt.errorType === 'DNS_ERROR' ||
                         (lastAttempt.elapsed < 5000 && lastAttempt.errorType !== 'TIMEOUT');

    // Si el error fue timeout después de 25s, puede ser que el sitio está muy lento
    // pero no caído. Reportamos como timeout en lugar de "sin conexión"
    const isSlow = lastAttempt.errorType === 'TIMEOUT' && lastAttempt.elapsed >= TIMEOUT_MS - 1000;

    if (isSlow) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 408,  // Request Timeout (más preciso que 0)
          time: lastAttempt.elapsed,
          error: 'El sitio respondió muy lentamente (timeout)',
          errorType: 'SLOW_RESPONSE',
          diagnostics,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 0,
        time: 99999,
        error: lastAttempt.error,
        errorType: lastAttempt.errorType,
        diagnostics,
      }),
    };

  } catch (unexpectedError) {
    // Error inesperado en el propio proxy (no del sitio)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 0,
        time: 99999,
        error: `Proxy error: ${unexpectedError.message}`,
        errorType: 'PROXY_ERROR',
        diagnostics,
      }),
    };
  }
};
