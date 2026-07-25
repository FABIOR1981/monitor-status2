# Monitor de Disponibilidad de Servicios 🚀

## ¿Qué es?

Un sistema de monitoreo en tiempo real que verifica automáticamente cada 5
minutos el **estado** y **tiempo de respuesta** de tus servicios web. Te
alerta cuando algo va mal antes de que tus usuarios lo noten.

## Características principales

- ✅ **Monitoreo automático** cada 5 minutos
- 📊 **7 niveles de clasificación** desde "Muy Rápido" hasta "Caído"
- 🎨 **2 temas visuales** (claro/oscuro), alternables con un botón
- 🗂️ **2 vistas**: tabla y tarjetas (con animación de carga mientras llegan los datos)
- 🌍 **Multiidioma** (Español, Inglés, Francés — extensible)
- 📈 **Historial configurable** de 1 a 9 horas
- 🚨 **Detección inteligente** de fallos globales vs individuales
- 📱 **Diseño responsive** para cualquier dispositivo
- 🔍 **Expansión de errores** con detalles completos
- 🛡️ **Verificación dual**: proxy serverless + verificación directa por navegador
- 🌐/🖥️ **Indicadores de fuente**: distingue mediciones por proxy (internet) vs directas (red interna)
- 🧱 **Manejo de WAF**: detecta y evita falsos positivos por bloqueos de firewall
- ⚙️ **ABM de sitios** integrado (`abm-webs.html`), con guardado directo a GitHub

El sistema revisa automáticamente tus servicios y te muestra su estado de
forma visual e intuitiva, para que siempre sepas si todo funciona bien.

## Inicio rápido

1. Agregá tus servicios en `data/webs.json` (nombre, URL, grupo, orden) — o usá `abm-webs.html` desde la propia interfaz.
2. Desplegá en Netlify (o abrí `index.html` localmente) y accedé al tablero.
3. Para cambiar tema o idioma usá los parámetros `?tema=` y `?lang=` en la URL.

```
https://tu-monitor.netlify.app/            ← Tema claro (por defecto)
https://tu-monitor.netlify.app/?tema=osc   ← Tema oscuro
https://tu-monitor.netlify.app/?lang=en    ← Interfaz en inglés
https://tu-monitor.netlify.app/?lang=fr    ← Interfaz en francés
```

## ¿Cómo funciona la verificación dual?

El monitor intenta verificar tus servicios de **dos formas**:

1. **Proxy serverless** (🌐): desde los servidores de Netlify en internet pública.
2. **Verificación directa** (🖥️): desde tu navegador, por la red interna.

**¿Por qué dos?** Algunos sitios usan WAF (firewall) que bloquea requests
desde servidores cloud como Netlify. Cuando el proxy falla, el sistema
verifica directamente desde tu navegador para confirmar si el sitio
realmente está caído o solo bloqueó el proxy.

**Indicadores visuales:**

- 🌐 = Medición vía proxy (internet pública)
- 🖥️ = Medición directa desde tu navegador (red interna)
- Borde azul izquierdo en la fila = última medición fue directa
- Promedios separados: si hay mediciones mixtas, muestra ambos

## Dónde encontrar la documentación técnica

- `docs/estructura.md` — organización de archivos y carpetas.
- `docs/js-arquitectura.md` — qué contiene cada archivo de `js/`, dependencias y orden de carga.
- `docs/arquitectura.md` — cómo funciona internamente el flujo de monitoreo.
- `docs/configuracion.md` — ajustes y personalización (umbrales, idiomas, temas).
- `docs/justificacion_rangos_latencia.md` — por qué esos umbrales de latencia.
- `docs/resolucion-de-problemas.md` — solución de problemas comunes.
- `docs/flujo-guardado.md` — cómo `abm-webs.html` guarda cambios directo a GitHub.
