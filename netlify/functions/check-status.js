const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');

// Configuración de agentes limpios y eficientes a nivel de producción
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false // Deshabilitamos en este intento para forzar cierres de socket limpios y evitar penalizaciones de reuso en WAFs estrictos
});

const httpAgent = new http.Agent({
  keepAlive: false
});

exports.handler = async (event, context) => {
  const targetUrl = event.queryStringParameters.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parámetro 'url' requerido." }),
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeoutMs = 15000; // 15 segundos para absorber la latencia perimetral
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const startTime = Date.now();
    const parsed = new URL(targetUrl);
    const agentToUse = parsed.protocol === 'http:' ? httpAgent : httpsAgent;

    // Diagnóstico DNS aislado de la métrica principal
    try {
      await dns.lookup(parsed.hostname);
    } catch (dnsErr) {
      console.warn(`[DNS WARN] ${parsed.hostname}: ${dnsErr.message}`);
    }

    // Cabeceras de simulación de alta fidelidad (Evita firmas automatizadas de automatización)
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };

    let responseStatus = 0;
    let totalTime = 0;
    const attemptsDiagnostics = [];

    // Intento Directo utilizando configuración limpia
    try {
      const resp = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow', // Vital para seguir el ruteo interno de Aduanas (?1)
        agent: agentToUse,
        headers: browserHeaders,
      });

      totalTime = Date.now() - startTime;
      responseStatus = resp.status;
      
      attemptsDiagnostics.push({
        attempt: 1,
        status: resp.status,
        time: totalTime
      });

      // Si el servidor responde con éxito, cerramos inmediatamente y retornamos
      clearTimeout(timeoutId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: responseStatus, time: totalTime, attempts: attemptsDiagnostics }),
      };

    } catch (directErr) {
      console.warn(`[DIRECT FETCH FAILED] para ${targetUrl}: ${directErr.message}`);
      attemptsDiagnostics.push({
        attempt: 1,
        error: directErr.message,
        time: Date.now() - startTime
      });
    }

    // Mecanismo de Respaldo: Fallback Proxies (Si la ruta directa de Netlify está degradada)
    const defaultProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
    ];

    let proxies = defaultProxies;
    try {
      if (process.env.FALLBACK_PROXIES) {
        proxies = JSON.parse(process.env.FALLBACK_PROXIES);
      }
    } catch (e) {
      proxies = defaultProxies;
    }

    const proxyAttempts = [];
    for (const proxyBase of proxies) {
      const proxyUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
      const pStart = Date.now();
      try {
        const presp = await fetch(proxyUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': browserHeaders['User-Agent'] }
        });
        
        const pEnd = Date.now();
        proxyAttempts.push({ proxy: proxyBase, status: presp.status, time: pEnd - pStart });

        if (presp.ok) {
          clearTimeout(timeoutId);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 200,
              time: pEnd - startTime,
              proxy: proxyBase,
              attempts: attemptsDiagnostics,
              proxyAttempts,
            }),
          };
        }
      } catch (pe) {
        proxyAttempts.push({ proxy: proxyBase, error: pe.message, time: Date.now() - pStart });
      }
    }

    throw new Error('All attempts and proxies failed');

  } catch (error) {
    clearTimeout(timeoutId);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 0,
        time: 99999,
        error: error.message,
        diagnostics: { errorName: error.name, errorMessage: error.message }
      }),
    };
  }
};