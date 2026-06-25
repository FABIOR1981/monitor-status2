======================================================
ESTRUCTURA DEL PROYECTO monitor-status-test (CORREGIDA)
======================================================

monitor-status-test/
├── index.html <-- Frontend HTML (Estructura principal del monitor)
├── leyenda.html <-- Página de leyenda de umbrales
├── webs.json <-- URLs a monitorizar (ubicado en raíz)
├── package.json <-- Dependencias de Node (node-fetch, abort-controller)
├── netlify.toml <-- Configuración Netlify (funciones serverless)
├── README.md <-- Documentación principal del proyecto
|
├── .vscode/ <-- Configuración de VS Code
│ └── settings.json <-- Configuración de cSpell (diccionario español)
|
├── js/ <-- Directorio de scripts JavaScript
│ ├── script.js <-- Lógica principal (Monitorización, Historial, Temas)
│ ├── config.js <-- Constantes de configuración (umbrales, temas, etc.)
│ ├── i18n_es.js <-- Textos en español
│ ├── i18n_en.js <-- Textos en inglés
│ └── leyenda_script.js <-- Lógica de la página de leyenda
|
├── css/ <-- Directorio de estilos CSS
│ ├── monitor_base.css <-- Estilos base compartidos
│ ├── monitor_def.css <-- Tema estándar (default)
│ ├── monitor_pro.css <-- Tema PRO (información avanzada)
│ ├── monitor_min.css <-- Tema minimalista
│ ├── leyenda_base.css <-- Estilos base de la leyenda
│ ├── leyenda_def.css <-- Tema estándar para leyenda
│ ├── leyenda_pro.css <-- Tema PRO para leyenda
│ └── leyenda_min.css <-- Tema minimalista para leyenda
|
├── netlify/ <-- Carpeta de configuración de Netlify
│ └── functions/
│ └── check-status.js <-- Función Serverless (Proxy HTTP para verificación)
|
└── docs/ <-- Directorio de documentación
├── readme.md <-- Índice principal de documentación
├── arquitectura.md <-- Flujo de datos y arquitectura del sistema

# Estructura del proyecto

Resumen práctico de los archivos y carpetas principales.

Raíz del proyecto (resumen):

- `index.html` — Interfaz principal del monitor.
- `leyenda.html` — Página con la explicación de estados y umbrales.
- `webs.json` — Lista de sitios/servicios a monitorear.
- `package.json` — Dependencias (si vas a ejecutar o empaquetar funciones).
- `netlify.toml` — Configuración para Netlify (funciones y redirects).

Carpetas importantes:

- `js/` — Lógica del frontend: `script.js`, `config.js`, `i18n_*`, `leyenda_script.js`.
- `css/` — Temas y estilos (`monitor_def.css`, `monitor_pro.css`, `monitor_min.css`, `leyenda_*.css`).
- `netlify/functions/` — Funciones serverless (p. ej. `check-status.js`).
- `docs/` — Documentación del proyecto.

Descripción breve de archivos clave

- `script.js`: carga `webs.json`, invoca la función proxy, guarda historial en `sessionStorage`, calcula promedios y actualiza la UI.
- `config.js`: constantes globales (umbrales, temas, endpoints).
- `check-status.js`: función serverless que actúa como proxy para medir latencia y evitar problemas de CORS.
- `i18n_*`: archivos con textos para la interfaz (es, en).

Consejo rápido

Mantén `webs.json` ordenado por prioridad y usa grupos (`CRITICO`, `PRODUCCION`, `STAGING`) para visualizar primero lo más importante.
