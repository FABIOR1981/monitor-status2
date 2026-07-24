// Fichier de traduction - Français
// Ce fichier contient uniquement les textes en français
// Il ne doit pas contenir de logique, seulement des données
const TEXTOS_FR = {
  general: {
    PAGE_TITLE: "Moniteur d'État des Services",
    LAST_UPDATE: 'Dernière mise à jour :',
    LOADING: 'Chargement...',
    INFO_BAR:
      'Les données sont mises à jour automatiquement toutes les 5 minutes via un Proxy Serverless.',
    ADVERTENCIA_FALLO_GLOBAL_HTML:
      'Données de surveillance indisponibles/non fiables. Une latence critique généralisée a été détectée, probablement due à une surcharge du système de surveillance. Veuillez attendre le prochain cycle ou actualiser la page.',
    MOTIVO_FALLO_PRO: 'Motif Pro :',
    FALLO_CRITICO_GRUPO: 'Échec de 100 % du groupe critique :',
    FALLO_CRITICO_LATENCIA_PARTE1: '% des services ont dépassé le seuil de',
    FALLO_CRITICO_RED: 'Aucun résultat disponible (Échec réseau total)',
    DURACION_LABEL: "Durée de l'historique :",
    DURACION_HORA_SINGULAR: 'heure',
    DURACION_HORA_PLURAL: 'heures',
    DURACION_MEDICIONES: 'mesures',
    BTN_REINICIAR: 'Redémarrer la surveillance',
    BTN_COPIAR: 'Copier',
    BTN_COPIADO: 'Copié !',
    BTN_CERRAR: 'Fermer',
  },
  velocidad: {
    VERY_FAST: 'TRÈS RAPIDE',
    FAST: 'RAPIDE',
    NORMAL: 'NORMAL',
    SLOW: 'LENT',
    CRITICAL: 'CRITIQUE',
    RISK: 'RISQUE',
    EXTREME_RISK: 'RISQUE EXTRÊME',
  },
  estados: {
    DOWN: 'HORS SERVICE',
    DOWN_ERROR: 'HORS SERVICE/ERREUR',
  },
  httpCodes: [
    {
      code: 0,
      label: 'Aucune connexion',
      description:
        "Impossible d'établir une connexion avec le serveur. Cela peut être un DNS inexistant (le domaine n'existe pas, marqué directement comme hors service), un délai d'attente dépassé ou une connexion refusée (dans ces cas, le système vérifie aussi directement depuis votre navigateur avant de confirmer la panne).",
    },
    {
      code: 301,
      label: 'Redirection permanente',
      description: "La ressource a été déplacée de façon permanente vers une nouvelle URL.",
    },
    {
      code: 302,
      label: 'Redirection temporaire',
      description: 'La ressource se trouve temporairement à une URL différente.',
    },
    {
      code: 304,
      label: 'Non modifié',
      description: "La ressource n'a pas changé depuis la dernière requête.",
    },
    {
      code: 400,
      label: 'Requête incorrecte',
      description: 'Requête mal formée ou invalide.',
    },
    {
      code: 401,
      label: 'Non autorisé',
      description: "Une authentification est requise pour accéder à la ressource.",
    },
    {
      code: 402,
      label: 'Paiement requis',
      description: "Réservé pour un usage futur dans les systèmes de paiement.",
    },
    {
      code: 403,
      label: 'Accès interdit',
      description:
        "Accès interdit, même avec une authentification valide. Dans ce moniteur, cela signifie généralement qu'un WAF/pare-feu a bloqué le proxy (car il provient d'un serveur cloud) — le site peut fonctionner normalement pour les utilisateurs réels. Le système vérifie directement depuis votre navigateur (🖥️) pour le confirmer.",
    },
    {
      code: 404,
      label: 'Introuvable',
      description: "La ressource demandée n'existe pas sur le serveur.",
    },
    {
      code: 405,
      label: 'Méthode non autorisée',
      description: "La méthode HTTP utilisée n'est pas autorisée pour cette ressource.",
    },
    {
      code: 406,
      label: 'Non acceptable',
      description:
        "Le serveur ne peut pas générer une réponse acceptable selon les en-têtes Accept.",
    },
    {
      code: 408,
      label: "Délai d'attente dépassé",
      description:
        "Le site a répondu, mais le proxy a mis plus de 25 secondes à obtenir la réponse (SLOW_RESPONSE). Ce n'est pas une panne : le service fonctionne mais de façon extrêmement lente.",
    },
    {
      code: 409,
      label: 'Conflit',
      description:
        "La requête entre en conflit avec l'état actuel du serveur.",
    },
    {
      code: 410,
      label: 'Disparu',
      description:
        "La ressource a été supprimée de façon permanente et n'a pas d'adresse de redirection.",
    },
    {
      code: 418,
      label: 'Je suis une théière',
      description:
        "Code humoristique (RFC 2324). Certains services l'utilisent pour rejeter des requêtes.",
    },
    {
      code: 429,
      label: 'Trop de requêtes',
      description:
        "La limite de requêtes (Rate Limit) du service a été dépassée. Comme pour le 403, il peut s'agir d'un WAF limitant le proxy — le site n'est pas nécessairement hors service pour les utilisateurs réels.",
    },
    {
      code: 500,
      label: 'Erreur du serveur',
      description: 'Erreur interne générique du serveur.',
    },
    {
      code: 501,
      label: 'Non implémenté',
      description:
        "Le serveur ne prend pas en charge la fonctionnalité requise pour compléter la requête.",
    },
    {
      code: 502,
      label: 'Passerelle incorrecte',
      description:
        "Un proxy/passerelle a reçu une réponse invalide du serveur d'origine.",
    },
    {
      code: 503,
      label: 'Service indisponible',
      description:
        'Le serveur est temporairement surchargé, en maintenance ou inactif.',
    },
    {
      code: 504,
      label: "Délai d'attente de la passerelle dépassé",
      description:
        "Un proxy/passerelle n'a pas reçu de réponse à temps du serveur d'origine.",
    },
  ],
};

// Construire l'objet httpStatus automatiquement à partir du tableau de codes
// Cela évite de dupliquer l'information et garde tout synchronisé
TEXTOS_FR.httpStatus = {};
TEXTOS_FR.httpCodes.forEach((item) => {
  TEXTOS_FR.httpStatus[item.code] = item.label;
});
TEXTOS_FR.httpStatus.GENERIC = 'Erreur HTTP';

TEXTOS_FR.tabla = {
  HEADER_SERVICE: 'Service',
  HEADER_URL: 'URL',
  HEADER_LATENCY_ACTUAL: 'Latence Actuelle',
  HEADER_STATUS_ACTUAL: 'État Actuel',
  HEADER_PROMEDIO_MS: 'Moyenne ',
  HEADER_PROMEDIO_STATUS: 'État Moyen',
  HEADER_ACTION: 'Action',
};

TEXTOS_FR.leyenda = {
  title_browser: "Légende du Moniteur d'État",
  main_header: 'Seuils de Latence et Justification Opérationnelle',
  link_volver: "Retour à l'Application",
  intro:
    "Les couleurs et symboles reflètent le temps de réponse (latence) mesuré. La justification est basée sur la Psychologie de l'Interaction et la Signification Opérationnelle de la performance. IMPORTANT : le système mesure de deux façons différentes (🌐 proxy et 🖥️ direct), et chacune utilise sa propre échelle de seuils car elles ne sont pas comparables entre elles — voir la section « Que signifient les icônes 🌐 et 🖥️ ? » ci-dessous.",
  umbrales: [
    {
      key: 'very_fast',
      className: 'status-very-fast',
      emoji: '🚀',
      label: 'TRÈS RAPIDE',
      range_text: '🖥️ Direct : < 300 ms  ·  🌐 Proxy : < 600 ms',
      summary: "Performance Optimale (Instantané pour l'Utilisateur)",
      details:
        "Standard d'Or. Le cerveau humain perçoit toute réponse inférieure à 100 ms comme instantanée (Règle de Nielsen). Maintenir le seuil jusqu'à 300 ms garantit une expérience fluide. Signification Opérationnelle : Le système fonctionne dans des conditions optimales et avec une haute efficacité.",
    },
    {
      key: 'fast',
      className: 'status-fast',
      emoji: '⭐',
      label: 'RAPIDE',
      range_text: '🖥️ Direct : 300–500 ms  ·  🌐 Proxy : 600–1000 ms',
      summary: 'Interaction Fluide sans Gêne (Perception Inconsciente)',
      details:
        "Limite de la Perception Inconsciente. Le délai est notable mais l'utilisateur ne le perçoit pas comme une attente gênante. Signification Opérationnelle : Excellente performance, bon point de contrôle pour les processus rapides de backend.",
    },
    {
      key: 'normal',
      className: 'status-normal',
      emoji: '✅',
      label: 'NORMAL',
      range_text: '🖥️ Direct : 500–800 ms  ·  🌐 Proxy : 1000–1600 ms',
      summary: "Performance Acceptable (L'Attention se Maintient)",
      details:
        "Le Début de la Distraction. À partir de 500 ms, l'utilisateur peut commencer à se déconcentrer, bien qu'il puisse maintenir le fil de sa pensée. Signification Opérationnelle : Performance acceptable, mais s'approchant du point où la sensation d'attente s'installe.",
    },
    {
      key: 'slow',
      className: 'status-slow',
      emoji: '⚠️',
      label: 'LENT',
      range_text: '🖥️ Direct : 800–1500 ms  ·  🌐 Proxy : 1600–3000 ms',
      summary: 'Délai Gênant (Distraction Active / Alerte Précoce)',
      details:
        "Limite de la Seconde. Le délai devient une distraction active. L'expérience est notablement dégradée. Signification Opérationnelle : Alerte Précoce. Le serveur ou le réseau subissent un stress. Moment d'enquêter.",
    },
    {
      key: 'critical',
      className: 'status-critical',
      emoji: '🐌',
      label: 'CRITIQUE',
      range_text: '🖥️ Direct : 1500–3000 ms  ·  🌐 Proxy : 3000–6000 ms',
      summary: "Risque d'Abandon de l'Utilisateur (3 Secondes / Échec Imminent)",
      details:
        "Perte d'Attention et Frustration. La limite critique (3 secondes) où les utilisateurs abandonnent une page web. Signification Opérationnelle : Échec Imminent. Indique une charge extrêmement lourde ou des goulots d'étranglement sévères.",
    },
    {
      key: 'risk',
      className: 'status-risk',
      emoji: '🚨',
      label: 'RISQUE',
      range_text: '🖥️ Direct : 3000–5000 ms  ·  🌐 Proxy : 6000–10000 ms',
      summary: 'Échec Fonctionnel et Effondrement (5 Secondes / Alarme)',
      details:
        "Échec Fonctionnel. Les délais supérieurs à 5 secondes sont considérés comme un échec fonctionnel dans de nombreux systèmes. Signification Opérationnelle : ALARME. Le service est au bord de l'effondrement ou ne répond pas aux requêtes de manière fiable.",
    },
    {
      key: 'extreme_risk',
      className: 'status-extreme-risk',
      emoji: '🔥',
      label: 'RISQUE EXTRÊME',
      range_text: '🖥️ Direct : 5000–99999 ms  ·  🌐 Proxy : 10000–99999 ms',
      summary: 'Latence Inacceptable (CHAOS / Abandon Assuré)',
      details:
        "CHAOS/Limbes. Plage avant le délai d'attente maximal. Il est presque certain que l'utilisateur a abandonné l'action. Signification Opérationnelle : Le serveur ne peut pas traiter la requête dans un délai raisonnable. Nécessite une attention IMMÉDIATE.",
    },
    {
      key: 'down',
      className: 'status-down',
      emoji: '❌',
      label: 'ÉCHEC TOTAL',
      range_text: '≥ 99999 ms',
      summary: "Panne Confirmée (Délai d'Attente Dépassé)",
      details:
        "Panne Confirmée. La valeur de PENALIZACION_FALLO a été dépassée. Signification Opérationnelle : Le service est hors service, la route est inaccessible, ou le serveur a refusé de répondre.",
    },
  ],
  http_codes_title: "Codes d'État HTTP et Échecs du Système",
  http_codes_description:
    "Lorsqu'un service renvoie un code d'état hors de la plage 2xx (Succès), le moniteur le classe visuellement comme ❌ ÉCHEC TOTAL, mais affiche le code réel entre parenthèses (ex : ❌ Hors service (404)).",
  iconos_title: 'Que signifient les icônes 🌐 et 🖥️ ?',
  iconos_intro:
    "Ce moniteur vérifie chaque site de deux façons possibles. C'est pourquoi il existe deux échelles de seuils différentes (voir tableau ci-dessus) : comparer un temps 🌐 aux seuils 🖥️ (ou inversement) donne une lecture erronée.",
  iconos: [
    {
      emoji: '🌐',
      label: 'Proxy (internet public)',
      desc: "Mesure effectuée depuis un serveur Netlify. C'est la mesure par défaut. Comme elle transite par internet (parfois en traversant des pays/continents), elle a naturellement plus de latence — c'est pourquoi son échelle de seuils est plus permissive.",
    },
    {
      emoji: '🖥️',
      label: 'Direct (votre navigateur)',
      desc: "Mesure effectuée depuis votre propre navigateur, généralement lorsque le proxy a signalé une panne (pour écarter l'hypothèse d'un WAF bloquant le proxy plutôt qu'une vraie panne). Reflète votre expérience réelle, c'est pourquoi elle utilise l'échelle la plus stricte.",
    },
  ],
  iconos_nota_borde:
    "Une bordure bleue à gauche d'une ligne indique que la dernière mesure de ce site était directe (🖥️).",
  iconos_nota_promedio:
    "Si un site a des mesures mixtes (certaines par proxy, d'autres directes), la colonne « Moyenne » affiche les deux valeurs séparément, par exemple : 620 ms 🌐 / 45 ms 🖥️.",
};

TEXTOS_FR.leyenda.codigos_error = [
  {
    code: '2xx',
    label: 'OK / Succès',
    description:
      'La connexion et le service ont répondu correctement (Latence mesurée).',
  },
];

TEXTOS_FR.httpCodes
  .filter((item) => item.code === 0 || item.code >= 400)
  .forEach((item) => {
    TEXTOS_FR.leyenda.codigos_error.push({
      code: item.code.toString(),
      label: item.label,
      description: item.description,
    });
  });

// Assigner uniquement les textes à la variable globale
// La logique de chargement se trouve dans i18n.js
window.TEXTOS_ACTUAL = TEXTOS_FR;
