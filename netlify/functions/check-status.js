const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const https = require('https');
const http = require('http');
const dns = require('dns').promises;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 10,
  timeout: 60000,
});
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 60000,
});

const TIMEOUT_MS = 30000;

// Más User-Agents para rotar
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

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

  const diagnostics = { url: targetUrl, attempts: [] };

  async function tryFetch(url, method, useMinimalHeaders, attemptNum, customTimeout) {
    const controller = new AbortController();
    const timeoutMs = customTimeout || TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const parsed = new URL(url);
      const agentToUse = parsed.protocol === 'http:' ? httpAgent : httpsAgent;
      const userAgent = USER_AGENTS[attemptNum % USER_AGENTS.length];

      const requestHeaders = useMinimalHeaders
        ? { 'User-Agent': userAgent }
        : {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
          };

      const resp = await fetch(url, {
        method: method,
        signal: controller.signal,
        redirect: 'follow',
        agent: agentToUse,
        headers: requestHeaders,
        compress: true,
      });

      const totalTime = Date.now() - startTime;
      clearTimeout(timeoutId);

      return {
        success: true,
        status: resp.status,
        time: totalTime,
        attempt: attemptNum,
        method: method,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      let errorType = 'UNKNOWN';
      if (error.name === 'AbortError') errorType = 'TIMEOUT';
      else if (error.code === 'ECONNREFUSED') errorType = 'CONN_REFUSED';
      else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') errorType = 'DNS_ERROR';
      else if (error.code === 'ETIMEDOUT') errorType = 'CONN_TIMEOUT';
      else if (error.code === 'EPROTO' || error.code === 'ECONNRESET') errorType = 'CONN_RESET';
      else if (error.message && error.message.includes('timeout')) errorType = 'TIMEOUT';
      else if (error.message && error.message.includes('certificate')) errorType = 'CERT_ERROR';

      return {
        success: false,
        error: error.message,
        errorType: errorType,
        elapsed: elapsed,
        attempt: attemptNum,
        method: method,
      };
    }
  }

  // PASO 1: DNS
  let dnsResolved = false;
  let httpUrl = null;
  try {
    const parsed = new URL(targetUrl);
    await dns.lookup(parsed.hostname);
    dnsResolved = true;
    // Preparar URL HTTP alternativa por si HTTPS falla
    if (parsed.protocol === 'https:') {
      httpUrl = 'http://' + parsed.hostname + parsed.pathname + parsed.search;
    }
  } catch (dnsErr) {
    // DNS falló, intentar con HTTP en lugar de HTTPS
    try {
      const parsed = new URL(targetUrl);
      httpUrl = 'http://' + parsed.hostname + parsed.pathname + parsed.search;
      await dns.lookup(parsed.hostname);
      dnsResolved = true;
    } catch (dnsErr2) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          status: 0, time: 99999,
          error: 'DNS failed: ' + dnsErr.message,
          errorType: 'DNS_ERROR', down: true, diagnostics,
        }),
      };
    }
  }

  // PASO 2: HEAD con headers mínimos
  let result = await tryFetch(targetUrl, 'HEAD', true, 1);
  diagnostics.attempts.push(result);

  if (result.success) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ status: result.status, time: result.time, diagnostics }),
    };
  }

  // PASO 3: GET con headers mínimos
  if (result.errorType === 'TIMEOUT' || result.errorType === 'CONN_TIMEOUT' || 
      result.errorType === 'CONN_RESET') {
    await new Promise(r => setTimeout(r, 1500));
    result = await tryFetch(targetUrl, 'GET', true, 2);
    diagnostics.attempts.push(result);

    if (result.success) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ status: result.status, time: result.time, diagnostics }),
      };
    }
  }

  // PASO 4: GET con headers completos
  if (result.errorType === 'TIMEOUT' || result.errorType === 'CONN_TIMEOUT' ||
      result.errorType === 'CONN_RESET') {
    await new Promise(r => setTimeout(r, 1500));
    result = await tryFetch(targetUrl, 'GET', false, 3);
    diagnostics.attempts.push(result);

    if (result.success) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ status: result.status, time: result.time, diagnostics }),
      };
    }
  }

  // PASO 5: Intentar con HTTP en lugar de HTTPS (algunos WAF bloquean HTTPS pero no HTTP)
  if (httpUrl && !result.success) {
    await new Promise(r => setTimeout(r, 1000));
    result = await tryFetch(httpUrl, 'GET', true, 4, 15000);
    diagnostics.attempts.push(result);

    if (result.success) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ status: result.status, time: result.time, diagnostics }),
      };
    }
  }

  // PASO 6: Último intento con timeout más largo
  if (!result.success && (result.errorType === 'TIMEOUT' || result.errorType === 'CONN_TIMEOUT')) {
    await new Promise(r => setTimeout(r, 2000));
    result = await tryFetch(targetUrl, 'GET', false, 5, 45000);
    diagnostics.attempts.push(result);

    if (result.success) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ status: result.status, time: result.time, diagnostics }),
      };
    }
  }

  // CAÍDO REAL - analizar el último intento
  const lastAttempt = diagnostics.attempts[diagnostics.attempts.length - 1];

  if (lastAttempt.errorType === 'DNS_ERROR') {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        status: 0, time: 99999,
        error: 'Dominio no resuelve (DNS_ERROR)',
        errorType: 'DNS_ERROR',
        down: true, diagnostics,
      }),
    };
  }

  if (lastAttempt.errorType === 'CONN_REFUSED') {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        status: 0, time: 99999,
        error: 'Conexión rechazada (servidor activo pero puerto cerrado)',
        errorType: 'CONN_REFUSED',
        down: true, diagnostics,
      }),
    };
  }

  if (lastAttempt.errorType === 'TIMEOUT' || lastAttempt.errorType === 'CONN_TIMEOUT') {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        status: 408, time: lastAttempt.elapsed || 99999,
        error: 'El sitio responde muy lentamente o no responde (timeout)',
        errorType: 'SLOW_RESPONSE', diagnostics,
      }),
    };
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      status: 0, time: 99999,
      error: lastAttempt.error || 'Error desconocido',
      errorType: lastAttempt.errorType || 'UNKNOWN',
      down: true, diagnostics,
    }),
  };
};
