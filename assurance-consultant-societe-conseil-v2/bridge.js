/*!
 * bridge.js — relais de la LP parente pour une iframe de landing page.
 *
 * Contexte : `assurance-consultant-societe-conseil-v2` est une page wrapper qui
 * affiche une LP dans une iframe. Tant que la LP enfant est servie sur la même
 * origine (cas actuel : `../assurance-consultants-societe-conseil/`), elle porte
 * elle-même son gestionnaire de lead et sa vérification SMS : ce relais reste
 * alors inactif. Il devient nécessaire lorsque l'iframe pointe vers une LP
 * hébergée sur un autre domaine, qui ne peut pas appeler l'API SMS en CORS.
 *
 * Protocole `ubepro-assurance-v1` :
 *   enfant -> parent : bridge-ready
 *   parent -> enfant : bridge-init {nonce}
 *   enfant -> parent : consent-state {analytics, marketing}
 *   parent -> enfant : landing-url {url}
 *   enfant -> parent : sms-request {requestId, telephone, action, code}
 *   parent -> enfant : sms-response {requestId, status, ok, data}
 *
 * L'ancien format des LP du parc (`bridge: 'ubepro-assurance-v1'`, messages
 * `consent-state-request` et `landing-url-request`) est également accepté.
 */
(function (window, document) {
  'use strict';

  var CHANNEL = 'ubepro-assurance-v1';
  var SMS_ENDPOINT = 'https://mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php';
  var COOKIE_CONSENT = 'user_cookie_preferences';

  // Origines autorisées à piloter le relais. Ajouter ici les domaines réels de
  // déploiement des LP affichées en iframe externe.
  var allowedParents = [
    window.location.origin
  ];
  // Origines des LP enfants pouvant être affichées (iframe externe uniquement).
  var allowedChildren = [
    window.location.origin
  ];

  var frame = document.getElementById('lp-assurance-frame');
  if (!frame || !window.postMessage) return;

  var nonce = null;
  var childOrigin = null;

  function originOf(url) {
    try { return new URL(url, window.location.href).origin; } catch (e) { return null; }
  }

  function childOriginAllowed(origin) {
    if (origin === window.location.origin) return true; // même origine : relais inutile
    return allowedChildren.indexOf(origin) !== -1;
  }

  function refuse(reason) {
    if (window.console && console.warn) console.warn('[bridge] message ignoré :', reason);
  }

  function consentState() {
    var state = { essential: true, analytics: false, marketing: false };
    var parts = (document.cookie || '').split(';');
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].replace(/^\s+/, '');
      if (c.indexOf(COOKIE_CONSENT + '=') === 0) {
        try {
          var parsed = JSON.parse(decodeURIComponent(c.substring(COOKIE_CONSENT.length + 1)));
          state.analytics = !!parsed.analytics;
          state.marketing = !!parsed.marketing;
        } catch (e) { /* cookie illisible */ }
      }
    }
    return state;
  }

  function landingUrl() {
    var consent = consentState();
    var url = window.location.href.split('#')[0];
    try {
      var stored = window.sessionStorage.getItem('lp_public_landing_url_v1');
      if (stored) url = stored;
    } catch (e) { /* ignore */ }
    if (!consent.analytics) url = url.split('?')[0];
    return url;
  }

  function reply(message) {
    if (!childOrigin) return;
    try { frame.contentWindow.postMessage(message, childOrigin); } catch (e) { /* ignore */ }
  }

  function normaliseTel(value) {
    var digits = String(value || '').replace(/[^\d+]/g, '');
    if (digits.indexOf('+33') === 0) digits = '0' + digits.slice(3);
    return digits.replace(/\D/g, '');
  }

  function handleSms(data) {
    var requestId = data.requestId || data.request_id;
    var telephone = normaliseTel(data.telephone);
    var action = data.action;
    if (!requestId) return;
    if (action !== 'envoyer_code' && action !== 'verifier_code') {
      reply({ channel: CHANNEL, type: 'sms-response', requestId: requestId,
              status: 422, ok: false, data: { status: 'error', message: 'Action inconnue.' } });
      return;
    }
    if (!/^0[67]\d{8}$/.test(telephone)) {
      reply({ channel: CHANNEL, type: 'sms-response', requestId: requestId,
              status: 422, ok: false,
              data: { status: 'error', message: 'Mobile français attendu (10 chiffres, 06 ou 07).' } });
      return;
    }
    if (action === 'verifier_code' && !/^\d{6}$/.test(String(data.code || ''))) {
      reply({ channel: CHANNEL, type: 'sms-response', requestId: requestId,
              status: 422, ok: false,
              data: { status: 'error', message: 'Le code comporte 6 chiffres.' } });
      return;
    }
    var params = { action: action, telephone: telephone };
    if (action === 'verifier_code') params.code = String(data.code);

    window.fetch(SMS_ENDPOINT, { method: 'POST', credentials: 'omit', body: new URLSearchParams(params) })
      .then(function (response) {
        return response.text().catch(function () { return ''; }).then(function (text) {
          var json = null;
          try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }
          reply({ channel: CHANNEL, type: 'sms-response', requestId: requestId,
                  status: response.status, ok: response.ok, data: json || {} });
        });
      })
      .catch(function () {
        reply({ channel: CHANNEL, type: 'sms-response', requestId: requestId,
                status: 0, ok: false, data: { status: 'error', message: 'Connexion impossible.' } });
      });
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.channel !== CHANNEL && data.bridge !== CHANNEL) return;
    if (event.source !== frame.contentWindow) return refuse('source de fenêtre inconnue');
    if (!childOriginAllowed(event.origin)) return refuse('origine non autorisée : ' + event.origin);
    childOrigin = event.origin;

    if (event.origin === window.location.origin) {
      // même origine : la LP enfant gère elle-même CRM, Sheets et SMS
      return;
    }

    switch (data.type) {
      case 'bridge-ready':
        nonce = 'n' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        reply({ channel: CHANNEL, type: 'bridge-init', nonce: nonce });
        break;
      case 'consent-state':
      case 'consent-state-request':
        reply({ channel: CHANNEL, type: 'consent-state', consent: consentState() });
        break;
      case 'landing-url':
      case 'landing-url-request':
        reply({ channel: CHANNEL, type: 'landing-url', url: landingUrl() });
        break;
      case 'sms-request':
        if (!nonce || data.nonce !== nonce) return refuse('nonce invalide');
        handleSms(data);
        break;
      default:
        refuse('type inconnu : ' + data.type);
    }
  });

  // API de contrôle pour vérifier la configuration réelle de l'iframe
  window.lpBridge = {
    frameOrigin: function () { return originOf(frame.getAttribute('src')); },
    sameOrigin: function () { return originOf(frame.getAttribute('src')) === window.location.origin; },
    consent: consentState,
    landingUrl: landingUrl,
    allowedChildren: allowedChildren.slice()
  };
})(window, document);
