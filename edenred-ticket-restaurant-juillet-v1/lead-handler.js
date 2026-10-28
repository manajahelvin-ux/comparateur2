/*!
 * lead-handler.js — gestionnaire de lead autonome (standard MEMOIRE-SESSION-CONTINUATION)
 * ------------------------------------------------------------------------------------
 * Remplace la soumission Webflow. Fonctionne sans hébergement Webflow, envoie le lead
 * en parallèle vers le CRM HelloLead et Google Sheets, n'affiche la confirmation que
 * si au moins une livraison a réussi, applique les validations, le honeypot, le
 * tracking filtré par consentement et bloque l'envoi tant que le mobile n'est pas
 * vérifié par SMS (module verification-sms.js).
 *
 * Configuration par page : window.LP_CONFIG (injecté dans index.html).
 *   {
 *     site: 'assurance-tns',
 *     formId: 'ADW_LP_ASSURANCE_TNS',
 *     sourceSecours: 'LP TNS',
 *     formName: 'Assurance-TNS-Form',
 *     selectors: ['#wf-form-Assurance-TNS-Pro-Form'],
 *     microField: 'reponse_3',       // optionnel : Oui -> formulaire_micro_entrepreneur
 *     sheet: '...',                   // optionnel : surcharge de l'endpoint Sheets
 *     crm: '...',                     // optionnel : surcharge de l'endpoint CRM
 *     version: '1.0.0'
 *   }
 *
 * APIs de contrôle qualité (console) :
 *   lpLead.preview()            aperçu du payload CRM
 *   lpLead.googleSheetPreview() aperçu du payload Sheets
 *   lpLead.status()             état des dernières livraisons
 *   lpTracking.inspect()        tracking retenu après filtrage du consentement
 */
(function (window, document) {
  'use strict';

  var CFG = window.LP_CONFIG || null;
  if (!CFG || !CFG.formId) {
    // Page sans formulaire de lead (catégorie C ou page de contenu) : rien à faire.
    return;
  }
  if (window.__lpLeadLoaded) return;
  window.__lpLeadLoaded = true;

  /* ------------------------------------------------------------------ constantes */
  var ENDPOINT_CRM = CFG.crm || 'https://mc.hellolead.pro/mon_compte/api/webflow/get_information.php';
  var ENDPOINT_SHEET = CFG.sheet ||
    'https://script.google.com/macros/s/AKfycbwrbyCb9-cAMIRPGNvnb-aM-CkhQAerrkfP3_HSw-ewmThxsn4vbZt5daaq2aOnL01a1w/exec';
  var TIMEOUT_CRM = 12000;
  var TIMEOUT_SHEET = 15000;
  var STORAGE_TRACKING = 'lp_tracking_v1';
  var STORAGE_PAGE_URL = 'lp_tracking_page_url_v1';
  var STORAGE_PUBLIC_URL = 'lp_public_landing_url_v1';
  var COOKIE_CONSENT = 'user_cookie_preferences';
  var LS_CONSENT = 'ubeproCookiePreferencesV1';

  var SELECTORS = (CFG.selectors && CFG.selectors.length) ? CFG.selectors
    : ['form.form-ass', 'form.form-globale', 'form[data-form="multistep"]'];

  var TEL_NAMES = ['telephone', 'tel', 'phone', 'portable', 'mobile'];
  var MAIL_NAMES = ['mail', 'email', 'courriel'];
  var IDENTITY_NAMES = ['nom', 'prenom', 'societe', 'raison_sociale', 'civilite', 'ville',
    'code_postal', 'adresse', 'fonction', 'effectif'];
  var SYSTEM_NAMES = ['source', 'categorie', 'coordonnee', 'user', 'typ', 'site',
    'gclid', 'msclkid', 'fbclid', 'gbraid', 'wbraid', 'ttclid'];
  var CLICK_IDS = ['gclid', 'msclkid', 'fbclid', 'gbraid', 'wbraid', 'ttclid'];

  /* ------------------------------------------------------- utilitaires génériques */
  function norm(name) {
    // mêmes règles que outils/audit.py : minuscules, sans accents ni séparateurs,
    // suffixe numérique toléré ("telephone-2", "Nom 2", "Email")
    if (!name) return '';
    var s = String(name).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[\s_\-.]+/g, '');
  }

  function baseName(name) {
    return norm(name).replace(/\d+$/, '');
  }

  function matchAlias(name, aliases) {
    var b = baseName(name);
    if (!b) return false;
    for (var i = 0; i < aliases.length; i++) {
      if (b === norm(aliases[i]) || b.indexOf(norm(aliases[i])) === 0) return true;
    }
    return false;
  }

  function trim(value) {
    return (value == null ? '' : String(value)).replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el) return false;
    if (el.type === 'hidden') return false;
    if (el.offsetParent !== null) return true;
    if (el.getClientRects && el.getClientRects().length) return true;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    return !!(style && style.display !== 'none' && style.visibility !== 'hidden');
  }

  function uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) { /* ignore */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function timeoutAfter(ms) {
    return new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, ms);
    });
  }

  /* ---------------------------------------------------------------- consentement */
  function readCookie(name) {
    var parts = (document.cookie || '').split(';');
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].replace(/^\s+/, '');
      if (c.indexOf(name + '=') === 0) return decodeURIComponent(c.substring(name.length + 1));
    }
    return null;
  }

  function consentState() {
    var state = { essential: true, analytics: false, marketing: false };
    var raw = readCookie(COOKIE_CONSENT);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        state.analytics = !!parsed.analytics;
        state.marketing = !!parsed.marketing;
        return state;
      } catch (e) { /* cookie illisible : on reste en refus */ }
    }
    try {
      var ls = window.localStorage.getItem(LS_CONSENT);
      if (ls) {
        var p = JSON.parse(ls);
        state.analytics = !!(p.analytics || p.analytics_storage === 'granted');
        state.marketing = !!(p.marketing || p.ad_storage === 'granted');
      }
    } catch (e) { /* ignore */ }
    return state;
  }

  /* -------------------------------------------------------------------- tracking */
  function readParams() {
    var out = {};
    try {
      var sp = new URLSearchParams(window.location.search);
      sp.forEach(function (value, key) {
        if (value) out[key] = value;
      });
    } catch (e) { /* ignore */ }
    return out;
  }

  function cleanReferrer() {
    if (!document.referrer) return '';
    try {
      var u = new URL(document.referrer);
      if (u.hostname === window.location.hostname) return '';
      return u.protocol + '//' + u.hostname + u.pathname;
    } catch (e) { return ''; }
  }

  function collectTracking() {
    var params = readParams();
    var raw = {
      utm_source: params.utm_source || '',
      utm_medium: params.utm_medium || '',
      utm_campaign: params.utm_campaign || '',
      utm_content: params.utm_content || '',
      utm_term: params.utm_term || '',
      utm_category: params.utm_category || '',
      utm_typ: params.utm_typ || '',
      ltm_source: params.ltm_source || '',
      ltm_category: params.ltm_category || '',
      ltm_user: params.ltm_user || '',
      ltm_typ: params.ltm_typ || '',
      hash: window.location.hash ? window.location.hash.replace(/^#/, '').slice(0, 120) : '',
      gclid: params.gclid || '',
      msclkid: params.msclkid || '',
      fbclid: params.fbclid || '',
      gbraid: params.gbraid || '',
      wbraid: params.wbraid || '',
      ttclid: params.ttclid || '',
      page_url: window.location.href,
      referrer: cleanReferrer()
    };
    // persistance de session : le tracking survit à la navigation interne
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(STORAGE_TRACKING) || '{}');
      Object.keys(saved).forEach(function (k) {
        if (!raw[k]) raw[k] = saved[k];
      });
    } catch (e) { /* ignore */ }
    try { window.sessionStorage.setItem(STORAGE_TRACKING, JSON.stringify(raw)); } catch (e) { /* ignore */ }
    try {
      window.sessionStorage.setItem(STORAGE_PAGE_URL, window.location.href);
      if (!window.sessionStorage.getItem(STORAGE_PUBLIC_URL)) {
        window.sessionStorage.setItem(STORAGE_PUBLIC_URL, window.location.href.split('#')[0]);
      }
    } catch (e) { /* ignore */ }
    return raw;
  }

  function trackingFor(payloadKind) {
    var consent = consentState();
    var raw = collectTracking();
    var out = {};
    var analyticsKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'utm_category', 'utm_typ', 'ltm_source', 'ltm_category', 'ltm_user', 'ltm_typ', 'hash',
      'page_url', 'referrer'];
    if (consent.analytics) {
      analyticsKeys.forEach(function (k) { if (raw[k]) out[k] = raw[k]; });
    }
    if (consent.marketing) {
      CLICK_IDS.forEach(function (k) { if (raw[k]) out[k] = raw[k]; });
      var userData = {};
      CLICK_IDS.forEach(function (k) { if (raw[k]) userData[k] = raw[k]; });
      if (Object.keys(userData).length) out.user_data = userData;
    }
    out.consent_analytics = consent.analytics ? 'oui' : 'non';
    out.consent_marketing = consent.marketing ? 'oui' : 'non';
    if (payloadKind === 'sheet') {
      // la feuille garde toujours la source de secours propre à la LP
      if (!out.utm_source && !out.ltm_source) out.source_secours = CFG.sourceSecours || '';
    }
    return out;
  }

  /* ------------------------------------------------------- sélection du formulaire */
  function findForms() {
    var found = [];
    SELECTORS.forEach(function (sel) {
      try {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (f) {
          if (found.indexOf(f) === -1) found.push(f);
        });
      } catch (e) { /* sélecteur invalide */ }
    });
    return found;
  }

  function isLeadForm(el) {
    if (!el || el.tagName !== 'FORM') return false;
    for (var i = 0; i < SELECTORS.length; i++) {
      try { if (el.matches(SELECTORS[i])) return true; } catch (e) { /* ignore */ }
    }
    return false;
  }

  function formFields(form) {
    return Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'))
      .filter(function (el) { return !!el.name; });
  }

  function resolveField(form, aliases) {
    var fields = formFields(form);
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
      if (matchAlias(el.name, aliases)) return el;
    }
    return null;
  }

  function telField(form) { return resolveField(form, TEL_NAMES); }
  function mailField(form) { return resolveField(form, MAIL_NAMES); }

  /* -------------------------------------------------------------- étape finale */
  function finalButton(form) {
    var candidates = form.querySelectorAll(
      '[data-form="submit-btn"], .bouton-valider, input[type="submit"], button[type="submit"]');
    for (var i = 0; i < candidates.length; i++) {
      if (visible(candidates[i])) return candidates[i];
    }
    return null;
  }

  function isLastStep(form) {
    // Si la page n'a pas de bouton final identifiable, on n'entrave pas la soumission.
    var anyButton = form.querySelector('[data-form="submit-btn"], .bouton-valider, input[type="submit"], button[type="submit"]');
    if (!anyButton) return true;
    return !!finalButton(form);
  }

  /* ------------------------------------------------------------------ honeypot */
  function ensureHoneypot(form) {
    var hp = form.querySelector('input[name="website"]');
    if (hp) return hp;
    hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website';
    hp.id = 'lp-hp-website';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
    form.appendChild(hp);
    return hp;
  }

  /* ------------------------------------------------------------------ messages */
  function failBox(form) {
    var wrap = form.parentNode;
    var box = wrap && wrap.querySelector ? wrap.querySelector('.w-form-fail') : null;
    if (!box) box = document.querySelector('.w-form-fail');
    return box;
  }

  function say(form, message, ok) {
    var box = failBox(form);
    if (box) {
      box.style.display = 'block';
      box.style.color = ok ? '#1a7f37' : '';
      var target = box.querySelector('.lp-message') || box;
      target.textContent = message;
      if (box !== target && !box.querySelector('.lp-message')) {
        var p = document.createElement('div');
        p.className = 'lp-message';
        p.textContent = message;
        box.appendChild(p);
      }
      box.setAttribute('role', 'alert');
      return;
    }
    var own = form.querySelector('.lp-form-message');
    if (!own) {
      own = document.createElement('div');
      own.className = 'lp-form-message';
      own.style.cssText = 'margin:12px 0;padding:10px 12px;border-radius:6px;font-size:14px;';
      form.appendChild(own);
    }
    own.style.background = ok ? '#e8f5e9' : '#fdecea';
    own.style.color = ok ? '#1a7f37' : '#c62828';
    own.textContent = message;
    own.setAttribute('role', 'alert');
  }

  function clearSay(form) {
    var box = failBox(form);
    if (box) box.style.display = 'none';
    var own = form.querySelector('.lp-form-message');
    if (own) own.parentNode.removeChild(own);
  }

  function hideSuccess() {
    Array.prototype.forEach.call(document.querySelectorAll('.w-form-done'), function (el) {
      el.removeAttribute('data-lp-confirme');
      el.style.display = 'none';
    });
    var own = document.getElementById('lp-merci');
    if (own) own.parentNode.removeChild(own);
  }

  // Certaines LP portent leur propre écran de confirmation (tunnel maison) :
  // on l'active au lieu d'en fabriquer un autre, pour garder le design d'origine.
  function customConfirmation(form) {
    var done = form.querySelector('.step-done, [data-step="done"]');
    if (!done) return null;
    Array.prototype.forEach.call(form.querySelectorAll('.step'), function (step) {
      if (step === done) return;
      step.classList.remove('is-active');
      step.style.display = 'none';
    });
    done.classList.add('is-active');
    return done;
  }

  function showSuccess(form) {
    var done = null;
    var wrap = form.parentNode;
    if (wrap && wrap.querySelector) done = wrap.querySelector('.w-form-done');
    if (!done) {
      var blocks = document.querySelectorAll('.w-form-done');
      for (var i = 0; i < blocks.length; i++) {
        // on ignore les blocs de la bannière cookies ou d'un autre formulaire
        if (blocks[i].closest && blocks[i].closest('.cookie-form')) continue;
        done = blocks[i];
        break;
      }
    }
    if (done) {
      // marqueur lu par le garde de script.js : seule une confirmation issue
      // d'une livraison réelle peut rester visible
      form.style.display = 'none';
      done.setAttribute('data-lp-confirme', '1');
      done.style.display = 'block';
      return;
    }
    var own = customConfirmation(form);
    if (own) {
      own.setAttribute('data-lp-confirme', '1');
      return;
    }
    form.style.display = 'none';
    var div = document.createElement('div');
    div.id = 'lp-merci';
    div.className = 'w-form-done';
    div.setAttribute('data-lp-confirme', '1');
    div.style.cssText = 'display:block;padding:18px;border-radius:8px;background:#e8f5e9;color:#1a7f37;font-size:16px;';
    div.setAttribute('role', 'status');
    div.textContent = CFG.merci || 'Merci, votre demande a bien été enregistrée. Un conseiller vous contacte rapidement.';
    form.parentNode.insertBefore(div, form);
  }

  /* -------------------------------------------------------- collecte des données */
  function questionLabel(form, key) {
    var idx = String(key).replace(/^reponse/, '');
    var q = form.querySelector('input[name="question' + idx + '"], [name="question' + idx + '"]');
    if (q) {
      if (q.value) return trim(q.value);
      if (q.tagName !== 'INPUT') return trim(q.textContent);
    }
    // question_i / reponse_i des formulaires génériques
    var qi = form.querySelector('[name="question' + idx.replace(/_\d+$/, '') + '"]');
    if (qi && qi.value) return trim(qi.value);
    return '';
  }

  function collectData(form) {
    var data = {};
    var reponses = [];
    var grouped = {};

    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      var name = el.name;
      if (!name || el.type === 'submit' || el.type === 'button' || el.disabled) return;
      if (name === 'website') return; // honeypot
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(el.value || 'Oui');
      } else if (el.type === 'radio') {
        if (!el.checked) return;
        grouped[name] = [el.value];
      } else {
        var v = trim(el.value);
        if (!v) return;
        data[name] = v;
      }
    });

    Object.keys(grouped).forEach(function (name) {
      var values = grouped[name];
      data[name] = values.join(' | ');
    });

    // réponses aux questions : libellé + valeur
    Object.keys(grouped).forEach(function (name) {
      if (name.indexOf('reponse') !== 0) return;
      reponses.push({ champ: name, question: questionLabel(form, name), reponse: data[name] });
    });

    // champs système complétés par le tracking (source, categorie, user…)
    SYSTEM_NAMES.forEach(function (name) {
      if (data[name]) return;
      var el = form.querySelector('[name="' + name + '"]');
      if (el && trim(el.value)) data[name] = trim(el.value);
    });

    // Filtrage par consentement : aucun click ID sans consentement marketing,
    // aucune donnée analytics sans consentement analytics.
    var consent = consentState();
    CLICK_IDS.forEach(function (k) {
      if (!consent.marketing) delete data[k];
      else if (!data[k]) {
        var h = form.querySelector('[name="' + k + '"]');
        if (h && trim(h.value)) data[k] = trim(h.value);
      }
    });
    if (!consent.analytics) {
      Object.keys(data).forEach(function (k) {
        if (k.indexOf('utm_') === 0 || k.indexOf('ltm_') === 0 || k === 'page_url') delete data[k];
      });
    }

    // Page sans champ « source » exploitable : la source de secours propre à la LP
    if (!data.source || /^source par defaut$/i.test(data.source)) {
      data.source = CFG.sourceSecours || '';
    }

    return { data: data, reponses: reponses };
  }

  function identity(form) {
    var tel = telField(form);
    var mail = mailField(form);
    var nom = resolveField(form, ['nom', 'nom_de_famille', 'lastname']);
    var prenom = resolveField(form, ['prenom', 'firstname']);
    var cp = resolveField(form, ['code_postal', 'codepostal', 'cp', 'zip']);
    return {
      telephone: tel ? trim(tel.value) : '',
      mail: mail ? trim(mail.value) : '',
      nom: nom ? trim(nom.value) : '',
      prenom: prenom ? trim(prenom.value) : '',
      code_postal: cp ? trim(cp.value) : '',
      telephone_champ: tel,
      mail_champ: mail
    };
  }

  function normaliseTel(value) {
    var digits = String(value || '').replace(/[^\d+]/g, '');
    if (digits.indexOf('+33') === 0) digits = '0' + digits.slice(3);
    return digits.replace(/\D/g, '');
  }

  function buildPayload(form, kind) {
    var collected = collectData(form);
    var id = identity(form);
    var tracking = trackingFor(kind === 'sheet' ? 'sheet' : 'crm');
    var data = collected.data;

    var tel = normaliseTel(id.telephone);
    if (tel) data.telephone = tel;

    var solution = '';
    for (var i = 0; i < collected.reponses.length; i++) {
      if (collected.reponses[i].champ.indexOf('reponse_1') === 0 && collected.reponses[i].reponse) {
        solution = collected.reponses[i].reponse;
        break;
      }
    }
    if (!solution && collected.reponses.length) solution = collected.reponses[0].reponse || '';

    var enjeu = collected.reponses.filter(function (r) {
      return r.question && r.reponse;
    }).map(function (r) { return r.question + ' : ' + r.reponse; }).join(' / ');

    var payload = {
      formId: CFG.formId,
      form_name: CFG.formName || CFG.site || '',
      site: CFG.site || '',
      version_handler: CFG.version || '1.0.0',
      nom: id.nom,
      prenom: id.prenom,
      mail: id.mail,
      telephone: tel,
      code_postal: id.code_postal,
      consentement: data.consentement || '',
      telephone_verifie: data.telephone_verifie === 'oui' ? 'oui' : 'non',
      solution: solution,
      enjeu: enjeu,
      source: data.source || CFG.sourceSecours || '',
      categorie: data.categorie || '',
      coordonnee: data.coordonnee || '',
      user: data.user || '',
      reponses: collected.reponses,
      website: ''
    };

    Object.keys(data).forEach(function (k) {
      if (payload[k] === undefined) payload[k] = data[k];
    });
    Object.keys(tracking).forEach(function (k) { payload[k] = tracking[k]; });

    if (!payload.source) payload.source = CFG.sourceSecours || '';
    return payload;
  }

  /* ------------------------------------------------------------------ livraisons */
  function crmEnvelope(payload) {
    var flatten = {};
    flatten.formId = payload.formId;
    flatten.form_name = payload.form_name;
    flatten.site = payload.site;
    flatten.version_handler = payload.version_handler;
    ['nom', 'prenom', 'mail', 'telephone', 'code_postal', 'consentement', 'telephone_verifie',
      'solution', 'enjeu', 'source', 'categorie', 'coordonnee', 'user', 'website'].forEach(function (k) {
      flatten[k] = payload[k];
    });
    Object.keys(payload).forEach(function (k) { if (flatten[k] === undefined) flatten[k] = payload[k]; });
    return { payload: { formId: CFG.formId, id: uuid(), data: flatten } };
  }

  function sendCrm(payload) {
    var body = JSON.stringify(crmEnvelope(payload));
    var ctrl = window.AbortController ? new AbortController() : null;
    var request = window.fetch(ENDPOINT_CRM, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (response) {
      return response.text().catch(function () { return ''; }).then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        var ok = !!(response.ok && (json ? (json.status === 'ok' || json.success === true ||
          json.ok === true || json.result === 'ok') : true));
        return { ok: ok, status: response.status, mode: 'cors', response: json };
      });
    }).catch(function (error) {
      if (error && error.message === 'timeout') {
        return { ok: false, status: 0, mode: 'cors', error: 'timeout' };
      }
      // CORS ou réseau : repli no-cors, livraison transmise mais non confirmée
      var sent = false;
      try {
        if (window.navigator && window.navigator.sendBeacon) {
          sent = window.navigator.sendBeacon(ENDPOINT_CRM, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
        }
      } catch (e) { sent = false; }
      if (!sent) {
        try {
          window.fetch(ENDPOINT_CRM, {
            method: 'POST', mode: 'no-cors', credentials: 'omit',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body
          });
          sent = true;
        } catch (e) { sent = false; }
      }
      return { ok: sent, status: 0, mode: 'nocors', confirmed: false, error: String(error && error.message || error) };
    });
    if (ctrl) setTimeout(function () { try { ctrl.abort(); } catch (e) { /* ignore */ } }, TIMEOUT_CRM);
    return Promise.race([request, timeoutAfter(TIMEOUT_CRM + 500).then(function () {
      return { ok: false, status: 0, mode: 'cors', error: 'timeout' };
    })]);
  }

  function sheetBody(payload) {
    var params = new URLSearchParams();
    ['formId', 'form_name', 'site', 'version_handler', 'nom', 'prenom', 'mail', 'telephone',
      'code_postal', 'consentement', 'telephone_verifie', 'solution', 'enjeu', 'source',
      'categorie', 'coordonnee', 'user', 'website', 'utm_source', 'utm_medium', 'utm_campaign',
      'utm_content', 'utm_term', 'utm_category', 'utm_typ', 'ltm_source', 'ltm_category',
      'ltm_user', 'ltm_typ', 'hash', 'page_url', 'referrer', 'source_secours',
      'consent_analytics', 'consent_marketing', 'gclid', 'msclkid', 'fbclid', 'gbraid',
      'wbraid', 'ttclid'].forEach(function (k) {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
        params.append(k, typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : String(payload[k]));
      }
    });
    params.append('website', '');
    payload.reponses.forEach(function (r, i) {
      var n = i + 1;
      if (r.question) params.append('question_' + n, r.question);
      if (r.reponse) params.append('reponse_' + n, r.reponse);
    });
    // champs bruts du formulaire conservés (hors tracking déjà ajouté)
    Object.keys(payload).forEach(function (k) {
      if (params.has(k)) return;
      if (k === 'reponses' || k === 'user_data') return;
      var value = payload[k];
      if (value === undefined || value === null || value === '' || typeof value === 'object') return;
      params.append(k, String(value));
    });
    params.append('autre_info_fj', payload.enjeu || '');
    return params;
  }

  function sendSheet(payload) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var request = window.fetch(ENDPOINT_SHEET, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: sheetBody(payload).toString(),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (response) {
      return response.text().catch(function () { return ''; }).then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        var ok = !!(response.ok && (!json || json.status === 'ok' || json.result === 'ok' || json.success === true));
        return { ok: ok, status: response.status, response: json };
      });
    }).catch(function (error) {
      return { ok: false, status: 0, error: String(error && error.message || error) };
    });
    if (ctrl) setTimeout(function () { try { ctrl.abort(); } catch (e) { /* ignore */ } }, TIMEOUT_SHEET);
    return Promise.race([request, timeoutAfter(TIMEOUT_SHEET + 500).then(function () {
      return { ok: false, status: 0, error: 'timeout' };
    })]);
  }

  /* ---------------------------------------------------------------- soumission */
  var inFlight = false;
  var lastStatus = null;

  function validate(form) {
    var id = identity(form);
    if (id.mail_champ && id.mail) {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(id.mail)) {
        return { ok: false, message: 'Merci de saisir une adresse e-mail valide.', field: id.mail_champ };
      }
    }
    var cp = resolveField(form, ['code_postal', 'codepostal', 'cp', 'zip']);
    if (cp && trim(cp.value) && !/^\d{5}$/.test(trim(cp.value).replace(/\s/g, ''))) {
      return { ok: false, message: 'Le code postal doit comporter 5 chiffres.', field: cp };
    }
    if (id.telephone_champ) {
      var tel = normaliseTel(id.telephone);
      if (!/^0[67]\d{8}$/.test(tel)) {
        return {
          ok: false,
          message: 'Merci de saisir un numéro de mobile français valide (10 chiffres commençant par 06 ou 07).',
          field: id.telephone_champ
        };
      }
    }
    var consent = form.querySelector('input[name="consentement"]:checked, input[name="consentement_1"]:checked');
    if (consent && consent.value && /^non$/i.test(consent.value)) {
      return { ok: false, message: 'Le consentement est nécessaire pour traiter votre demande.' };
    }
    var requiredConsent = form.querySelector('input[name^="consentement"][required]');
    if (requiredConsent && !form.querySelector('input[name^="consentement"]:checked')) {
      return { ok: false, message: 'Merci d\u2019accepter les conditions avant de valider.' };
    }
    return { ok: true };
  }

  function checkSms(form) {
    var tel = telField(form);
    if (!tel) return { ok: true };
    var value = normaliseTel(trim(tel.value));
    if (!value) return { ok: true };
    if (!window.smsVerification) {
      return {
        ok: false,
        message: 'La vérification par SMS est momentanément indisponible. Merci de réessayer dans un instant.'
      };
    }
    if (!window.smsVerification.estVerifie()) {
      return { ok: false, message: 'Merci de vérifier votre numéro de mobile par SMS avant de valider.' };
    }
    if (typeof window.smsVerification.numeroVerifie === 'function' &&
        normaliseTel(window.smsVerification.numeroVerifie()) !== value) {
      return { ok: false, message: 'Le numéro saisi a changé : merci de le vérifier à nouveau par SMS.' };
    }
    return { ok: true };
  }

  function saveLocal(form) {
    try {
      var fields = ['nom', 'prenom', 'societe', 'code_postal', 'mail', 'telephone', 'civilite', 'ville'];
      fields.forEach(function (name) {
        var el = form.querySelector('input[name="' + name + '"]');
        if (el && trim(el.value)) window.localStorage.setItem(name, trim(el.value));
      });
      var src = form.querySelector('input[name="source"]');
      if (src) window.localStorage.setItem('source', trim(src.value) + ' TYP');
    } catch (e) { /* ignore */ }
  }

  function pushEvent(form, payload, deliveries) {
    var micro = false;
    if (CFG.microField) {
      var el = form.querySelector('input[name="' + CFG.microField + '"]:checked');
      micro = !!(el && /^oui$/i.test(trim(el.value)));
    }
    var eventName = micro ? 'formulaire_micro_entrepreneur' : 'formulaire_lead';
    window.dataLayer = window.dataLayer || [];
    var consent = consentState();
    var evt = {
      event: eventName,
      form_id: CFG.formId,
      form_name: payload.form_name,
      site: payload.site,
      solution: payload.solution,
      telephone_verifie: payload.telephone_verifie,
      livraison_crm: deliveries.crm && deliveries.crm.ok ? 'ok' : 'echec',
      livraison_sheets: deliveries.sheet && deliveries.sheet.ok ? 'ok' : 'echec',
      consent_analytics: consent.analytics ? 'oui' : 'non',
      consent_marketing: consent.marketing ? 'oui' : 'non'
    };
    if (consent.analytics) {
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_typ',
        'ltm_source', 'ltm_category', 'ltm_user'].forEach(function (k) {
        if (payload[k]) evt[k] = payload[k];
      });
      evt.page_url = payload.page_url || window.location.href;
    }
    if (consent.marketing && payload.user_data) evt.user_data = payload.user_data;
    window.dataLayer.push(evt);
  }

  function submitLead(form) {
    if (inFlight) return Promise.resolve(false);
    clearSay(form);
    hideSuccess();

    var check = validate(form);
    if (!check.ok) {
      say(form, check.message);
      if (check.field && check.field.focus) check.field.focus();
      return Promise.resolve(false);
    }
    var sms = checkSms(form);
    if (!sms.ok) {
      say(form, sms.message);
      return Promise.resolve(false);
    }

    var payload = buildPayload(form, 'crm');
    var sheetPayload = buildPayload(form, 'sheet');
    inFlight = true;
    var button = finalButton(form);
    var label = button && button.value;
    if (button) {
      if (button.tagName === 'INPUT') button.value = 'Envoi…';
      else button.textContent = 'Envoi…';
      button.disabled = true;
    }

    return Promise.all([sendCrm(payload), sendSheet(sheetPayload)]).then(function (results) {
      var deliveries = { crm: results[0], sheet: results[1] };
      lastStatus = deliveries;
      inFlight = false;
      if (button) {
        button.disabled = false;
        if (button.tagName === 'INPUT') button.value = label || 'Valider';
        else button.textContent = label || 'Valider';
      }
      if (deliveries.crm.ok || deliveries.sheet.ok) {
        saveLocal(form);
        pushEvent(form, payload, deliveries);
        showSuccess(form);
        var link = new URLSearchParams(window.location.search).get('ltm_typ');
        if (link) {
          var url = window.location.protocol + '//' + window.location.hostname + '/' + link;
          setTimeout(function () { window.location.href = url; }, 600);
        }
        return true;
      }
      say(form, 'Votre demande n\u2019a pas pu être transmise. Merci de vérifier votre connexion et de réessayer.');
      return false;
    }).catch(function () {
      inFlight = false;
      if (button) {
        button.disabled = false;
        if (button.tagName === 'INPUT') button.value = label || 'Valider';
        else button.textContent = label || 'Valider';
      }
      say(form, 'Une erreur est survenue pendant l\u2019envoi. Merci de réessayer.');
      return false;
    });
  }

  /* ------------------------------------------------------ neutralisation / écoute */
  function neutralise(form) {
    // Les handlers jQuery du formulaire (Webflow .w-form, ancien gestionnaire intégré,
    // redirection ltm_typ) sont retirés : c'est notre pipeline qui les remplace.
    // Formly envoie par jQuery `$form.submit()` : ce chemin n'émet pas d'événement
    // natif, il faut donc réinstaller notre propre handler jQuery, appelé en dernier.
    if (window.jQuery) {
      try { window.jQuery(form).off('submit'); } catch (e) { /* ignore */ }
      try {
        window.jQuery(form).on('submit.lphandler', function (e) {
          if (e && e.preventDefault) e.preventDefault();
          handleForm(form);
        });
      } catch (e) { /* ignore */ }
    }
    // Ancienne interface SMS injectée par les bundles patchés (Axialys / SMS Partner)
    Array.prototype.forEach.call(
      form.querySelectorAll('.sms-send, .sms-check, .sms-code-wrap, .sms-msg'),
      function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    // Doublons de champ caché telephone_verifie : le module SMS gère le sien
    var flags = form.querySelectorAll('input[name="telephone_verifie"]');
    for (var i = 1; i < flags.length; i++) flags[i].parentNode.removeChild(flags[i]);
    // Anciens blocs statiques de vérification SMS
    Array.prototype.forEach.call(
      document.querySelectorAll('.content-telephone-verification'),
      function (el) { el.style.display = 'none'; });
  }

  function handleForm(form) {
    if (!form || form.tagName !== 'FORM') return;
    if (!isLastStep(form)) return; // étape intermédiaire Formly : on ne fait rien
    var hp = form.querySelector('input[name="website"]');
    if (hp && trim(hp.value)) return; // honeypot rempli : silence total
    submitLead(form);
  }

  function guard(event) {
    var form = event.target;
    if (!isLeadForm(form)) return;
    event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    handleForm(form);
  }

  var initDone = false;
  function init() {
    if (initDone) return;
    var forms = findForms();
    if (!forms.length) return; // DOM pas encore prêt : nouvel essai sur DOMContentLoaded
    initDone = true;
    forms.forEach(function (form) {
      neutralise(form);
      ensureHoneypot(form);
      // Le module SMS a besoin de connaître le formulaire réel
      window.__lpLeadForms = forms;
    });

    // 1. chemin jQuery (Formly : $form.submit()) — capté au niveau document
    document.addEventListener('submit', guard, true);

    // 2. filet de sécurité : form.submit() natif appelé directement (sans événement)
    try {
      var proto = window.HTMLFormElement && window.HTMLFormElement.prototype;
      if (proto && !proto.__lpSubmitPatched) {
        var original = proto.submit;
        proto.submit = function () {
          if (isLeadForm(this)) {
            handleForm(this);
            return;
          }
          return original.apply(this, arguments);
        };
        proto.__lpSubmitPatched = true;
      }
    } catch (e) {
      // jsdom / navigateurs anciens : la propriété est non modifiable, le handler
      // jQuery installé plus haut garantit déjà la capture.
    }

    // 3. état initial : aucun faux message de réussite, et garde permanente :
    //    un bloc de succès ne peut être affiché que par notre propre confirmation
    hideSuccess();
    if (window.MutationObserver) {
      Array.prototype.forEach.call(document.querySelectorAll('.w-form-done'), function (el) {
        try {
          new MutationObserver(function () {
            if (!el.hasAttribute('data-lp-confirme') && el.style.display !== 'none') {
              el.style.display = 'none';
            }
          }).observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
        } catch (e) { /* ignore */ }
      });
    }
  }

  init();
  document.addEventListener('DOMContentLoaded', init);

  /* ------------------------------------------------------------------- APIs QA */
  window.lpTracking = {
    inspect: function () { return trackingFor('crm'); },
    raw: function () { return collectTracking(); },
    consent: function () { return consentState(); }
  };

  window.lpLead = {
    config: CFG,
    forms: findForms,
    preview: function () {
      var form = findForms()[0];
      return form ? crmEnvelope(buildPayload(form, 'crm')) : null;
    },
    googleSheetPreview: function () {
      var form = findForms()[0];
      return form ? sheetBody(buildPayload(form, 'sheet')).toString() : null;
    },
    status: function () { return lastStatus; },
    submit: function () { var f = findForms()[0]; return f ? submitLead(f) : Promise.resolve(false); },
    version: CFG.version || '1.0.0'
  };
  window.ubeproLead = window.lpLead;
  window.tnsLead = window.lpLead;
})(window, document);
