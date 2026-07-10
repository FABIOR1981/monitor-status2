const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');

// Optimizamos el agente HTTPS para mantener la conexión activa (Keep-Alive)
// Esto es clave para reutilizar la negociación TLS/SSL en ejecuciones consecutivas
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,             // Habilitado para no negociar SSL desde cero en cada petición
  keepAliveMsecs: 60000,       // Mantiene el socket abierto por 60 segundos
  maxSockets: 100,             // Permite paralelismo limpio
  maxFreeSockets: 10
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000
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
  const timeoutMs = 15000; // 15 segundos para dar margen holgado a redes estatales externas
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const startTime = Date.now();

    let agentToUse;
    try {
      const parsed = new URL(targetUrl);
      agentToUse = parsed.protocol === 'http:' ? httpAgent : httpsAgent;

      // Diagnósticos rápidos de DNS para los logs de Netlify
      let dnsInfo = null;
      try {
        const lookup = await dns.lookup(parsed.hostname);
        dnsInfo = { address: lookup.address, family: lookup.family };
        console.log(`DNS lookup para ${parsed.hostname}: ${lookup.address}`);
      } catch (e) {
        dnsInfo = { error: e.message };
        console.warn(`DNS lookup falló para ${parsed.hostname}: ${e.message}`);
      }

      // Prueba TCP previa al fetch propiamente dicho
      const port = parsed.protocol === 'http:' ? 80 : 443;
      const tcpResult = await (async function testTcp(host, port, tmo) {
        return new Promise((resolve) => {
          const socket = net.createConnection({ host, port }, () => {
            socket.destroy();
            resolve({ ok: true });
          });
          socket.setTimeout(4000); // 4 segundos máximo para el handshake TCP puro
          socket.on('error', (err) => {
            socket.destroy();
            resolve({ ok: false, error: err.message });
          });
          socket.on('timeout', () => {
            socket.destroy();
            resolve({ ok: false, error: 'tcp_timeout' });
          });
        });
      })(parsed.hostname, port, timeoutMs);

      console.log(`TCP test para ${parsed.hostname}:${port} -> ${JSON.stringify(tcpResult)}`);
    } catch (e) {
      agentToUse = undefined;
    }

    // Cabeceras de simulación de navegador actualizadas para saltar filtros WAF de agentes
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8,en-US;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    };

    // Configuramos la secuencia de intentos alternando agentes para evitar rigideces TLS
    const attemptConfigs = [
      { agent: agentToUse, headers: browserHeaders },
      { agent: undefined, headers: browserHeaders }, 
      { agent: undefined, headers: browserHeaders }
    ];

    let lastError = null;
    let attemptIndex = 0;
    const attemptsDiagnostics = [];

    for (const cfg of attemptConfigs) {
      attemptIndex++;
      const attemptStart = Date.now();
      try {
        console.log(`Intento ${attemptIndex} para ${targetUrl} (agent=${cfg.agent ? 'KeepAlive' : 'Default'})`);
        const resp = await fetch(targetUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow', // Muy importante para Aduanas Clientes por sus redirecciones internas (?1)
          agent: cfg.agent,
          headers: cfg.headers,
        });

        const attemptEnd = Date.now();
        const attemptTime = attemptEnd - attemptStart;
        const totalTime = attemptEnd - startTime;
        
        attemptsDiagnostics.push({
          attempt: attemptIndex,
          status: resp.status,
          time: attemptTime,
          agent: !!cfg.agent
        });

        clearTimeout(timeoutId);
        console.log(`Éxito en intento ${attemptIndex} para ${targetUrl} - Status ${resp.status}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: resp.status, time: totalTime, attempts: attemptsDiagnostics }),
        };
      } catch (errAttempt) {
        const attemptEnd = Date.now();
        attemptsDiagnostics.push({
          attempt: attemptIndex,
          error: errAttempt.message,
          time: attemptEnd - attemptStart,
          agent: !!cfg.agent
        });
        console.warn(`Intento ${attemptIndex} falló para ${targetUrl}: ${errAttempt.message}`);
        lastError = errAttempt;
        
        if (attemptIndex < attemptConfigs.length) {
          await new Promise((r) => setTimeout(r, 500 * attemptIndex)); // Pequeña pausa incremental entre intentos
        }
      }
    }

    // Si los intentos directos fallan por completo, saltamos al bloque de Fallback Proxies
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
      console.warn('Error parseando FALLBACK_PROXIES, usando valores por defecto');
      proxies = defaultProxies;
    }

    let proxyLastError = null;
    const proxyAttempts = [];
    
    for (const proxyBase of proxies) {
      const proxyUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
      const pStart = Date.now();
      try {
        console.log(`Intentando proxy alternativo: ${proxyUrl}`);
        const presp = await fetch(proxyUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: browserHeaders,
        });
        
        const pEnd = Date.now();
        const pTime = pEnd - pStart;
        const totalTimeProxy = pEnd - startTime;
        proxyAttempts.push({ proxy: proxyBase, status: presp.status, time: pTime });

        if (presp.ok) {
          clearTimeout(timeoutId);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 200,
              time: totalTimeProxy,
              proxy: proxyBase,
              attempts: attemptsDiagnostics,
              proxyAttempts,
            }),
          };
        }
      } catch (pe) {
        const pEnd = Date.now();
        proxyAttempts.push({ proxy: proxyBase, error: pe.message, time: pEnd - pStart });
        proxyLastError = pe;
        console.warn(`Proxy ${proxyBase} falló: ${pe.message}`);
      }
    }

    // Si llegó hasta acá sin retornar, forzamos el lanzamiento del error combinado
    throw proxyLastError || lastError || new Error('Todos los intentos directos y proxies fallaron');

  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error de conexión absoluto para ${targetUrl}: ${error.name} - ${error.message}`);

    const diagnostics = {
      errorName: error.name,
      errorMessage: error.message
    };

    // Estructura de retorno idéntica al estándar del monitor para pintar en UI
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 0,
        time: 99999, // Penalización de fallo por desconexión/timeout
        error: `${error.name}: ${error.message}`,
        diagnostics,
      }),
    };
  }
};