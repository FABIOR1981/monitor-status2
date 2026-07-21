# Monitor de Disponibilidad de Servicios 🚀

## ¿Qué es?

Un sistema de monitoreo en tiempo real que verifica automáticamente cada 5 minutos el **estado** y **tiempo de respuesta** de tus servicios web. Te alerta cuando algo va mal antes de que tus usuarios lo noten.

## Características principales

- ✅ **Monitoreo automático** cada 5 minutos
- 📊 **7 niveles de clasificación** desde "Muy Rápido" hasta "Caído"
- 🎨 **5 temas visuales** con alternancia claro/oscuro
- 🌍 **Multiidioma** (Español, Inglés, extensible)
- 📈 **Historial configurable** de 1 a 9 horas
- 🚨 **Detección inteligente** de fallos globales vs individuales
- 📱 **Diseño responsive** para cualquier dispositivo
- 🔍 **Expansión de errores** con detalles completos (temas avanzados)
- 🛡️ **Verificación dual**: proxy serverless + verificación directa por navegador
- 🌐/🖥️ **Indicadores de fuente**: distingue mediciones por proxy (internet) vs directas (red interna)
- 🧱 **Manejo de WAF**: detecta y evita falsos positivos por bloqueos de firewall

---

El sistema revisa automáticamente tus servicios y te muestra su estado de forma visual e intuitiva, para que siempre sepas si todo funciona bien.

## Inicio Rápido

### Desplegar en Netlify

# Monitor de Disponibilidad de Servicios

Este documento reúne la información principal sobre el proyecto: qué hace, cómo empezar rápido y dónde encontrar la documentación técnica.

Qué hace

- Monitorea periódicamente tus sitios y APIs, mide latencia y estado, y muestra un tablero visual con alertas y un historial por sesión.

Principales características

- Monitoreo automático con intervalo configurable.
- Clasificación de latencia en niveles claros (desde "Muy rápido" hasta "Caído").
- Historial por sesión para seguir tendencias recientes.
- Temas visuales (incluye alternancia claro/oscuro) y soporte i18n (es/en).

Inicio rápido

1. Agrega tus servicios en `data/webs.json` (nombre, URL, grupo, orden).
2. Despliega en Netlify (o abre `index.html` localmente) y accede al tablero.
3. Para cambiar tema o idioma usa los parámetros `?tema=` y `?lang=` en la URL.

### ¿Cómo funciona la verificación dual?

El monitor intenta verificar tus servicios de **dos formas**:

1. **Proxy serverless** (🌐): desde los servidores de Netlify en internet pública.
2. **Verificación directa** (🖥️): desde tu navegador, por la red interna.

**¿Por qué dos?** Algunos sitios usan WAF (firewall) que bloquea requests desde servidores cloud como Netlify. Cuando el proxy falla, el sistema verifica directamente desde tu navegador para confirmar si el sitio realmente está caído o solo bloqueó el proxy.

**Indicadores visuales:**
- 🌐 = Medición vía proxy (internet pública)
- 🖥️ = Medición directa desde tu navegador (red interna)
- Borde azul izquierdo en la fila = última medición fue directa
- Promedios separados: si hay mediciones mixtas, muestra ambos

Ejemplo de acceso:

```
https://tu-monitor.netlify.app/           ← Tema por defecto
https://tu-monitor.netlify.app/?tema=pro   ← Tema profesional
https://tu-monitor.netlify.app/?lang=en   ← Interfaz en inglés
```

Dónde encontrar la documentación técnica

- Carpeta `docs/` (principal): `docs/readme.md`.
- Guías específicas:
  - `docs/configuracion.md` — ajustes y personalización
  - `docs/arquitectura.md` — cómo funciona internamente
  - `docs/estructura.md` — organización de archivos
  - `docs/justificacion_rangos_latencia.md` — por qué esos umbrales
  - `docs/resolución de problemas.md` — solución de problemas comunes

Licencia

- MIT — consultá el archivo `LICENSE` para detalles.


