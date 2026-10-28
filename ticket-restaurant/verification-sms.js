/*!
 * verification-sms.js — vérification du mobile par SMS (standard MEMOIRE-SESSION-CONTINUATION)
 * -----------------------------------------------------------------------------------------
 * Ajoute sous le champ téléphone du formulaire de lead un bouton « Recevoir le code »,
 * un champ de code à 6 chiffres et un compteur de renvoi de 120 secondes.
 *
 * Contrat API : https://mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php
 *   POST URLSearchParams — action=envoyer_code|verifier_code, telephone, code
 *
 * Le lead n'est transmis que si le numéro courant est vérifié : lead-handler.js appelle
 * window.smsVerification.estVerifie() / numeroVerifie() avant chaque envoi.
 *
 * API de contrôle (console) : smsVerification.estVerifie(), .numeroVerifie(), .statut()
 */
(function (window, document) {
  'use strict';

  var CFG = window.LP_CONFIG || {};
  var ENDPOINT = CFG.sms || 'https://mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php';
  var COOLDOWN = 120;
  var TEL_SELECTORS = (CFG.selectors && CFG.selectors.length) ? CFG.selectors
    : ['form.form-ass', 'form.form-globale', 'form[data-form="multistep"]'];

  var state = {
    envoye: false,
    verifie: false,
    numero: '',
    timer: null,
    reste: 0,
    dernierStatut: null
  };

  var FALLBACK = {
    422: 'Numéro ou code invalide.',
    404: 'Aucun code envoyé pour ce numéro. Cliquez sur « Recevoir le code ».',
    409: 'Ce code a déjà été utilisé. Merci de demander un nouveau code.',
    410: 'Le code a expiré. Merci de demander un nouveau code.',
    429: 'Veuillez patienter avant de redemander un code.',
    502: 'L\u2019envoi du SMS a échoué. Merci de réessayer dans un instant.'
  };

  function trim(v) { return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); }

  function normaliseTel(value) {
    var digits = String(value || '').replace(/[^\d+]/g, '');
    if (digits.indexOf('+33') === 0) digits = '0' + digits.slice(3);
    return digits.replace(/\D/g, '');
  }

  function mobileValide(value) { return /^0[67]\d{8}$/.test(normaliseTel(value)); }

  function normName(name) {
    if (!name) return '';
    var s = String(name).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[\s_\-.]+/g, '').replace(/\d+$/, '');
  }

  function telephoneField(form) {
    var fields = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (el.type === 'hidden' || el.type === 'submit') continue;
      var n = normName(el.name);
      if (n === 'telephone' || n === 'tel' || n === 'phone' || n === 'portable' || n === 'mobile') return el;
    }
    return null;
  }

  function readJson(response) {
    return response.text().catch(function () { return ''; }).then(function (text) {
      try { return text ? JSON.parse(text) : {}; } catch (e) { return {}; }
    });
  }

  function appel(params) {
    return window.fetch(ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: new URLSearchParams(params)
    }).then(function (response) {
      // le JSON est lu même lorsque le statut HTTP est en erreur
      return readJson(response).then(function (json) {
        return { status: response.status, ok: response.ok, data: json || {} };
      });
    }).catch(function () {
      return { status: 0, ok: false, data: {} };
    });
  }

  function messageErreur(reponse) {
    var json = reponse.data || {};
    return json.message || json.error || FALLBACK[reponse.status] ||
      'Une erreur est survenue. Merci de réessayer.';
  }

  function delaiRestant(reponse) {
    var json = reponse.data || {};
    var cles = ['retry_after', 'retryAfter', 'delai', 'delai_restant', 'restant', 'remaining', 'seconds_remaining'];
    for (var i = 0; i < cles.length; i++) {
      var v = parseInt(json[cles[i]], 10);
      if (!isNaN(v) && v > 0) return v;
    }
    var m = String(messageErreur(reponse)).match(/(\d+)\s*(s|sec|secondes?)/i);
    if (m) return parseInt(m[1], 10);
    return COOLDOWN;
  }

  /* ------------------------------------------------------------------- interface */
  function construireUI(form, phone) {
    var box = document.createElement('div');
    box.className = 'lp-sms-verification';
    box.style.cssText = 'margin:10px 0 14px;font-size:14px;line-height:1.4;';
    box.innerHTML =
      '<button type="button" class="lp-sms-envoyer" style="cursor:pointer;padding:9px 14px;border:0;' +
      'border-radius:6px;background:#111827;color:#fff;font-size:14px;">Recevoir le code par SMS</button>' +
      '<div class="lp-sms-code-wrap" style="display:none;margin-top:8px;">' +
      '<input type="text" class="lp-sms-code" inputmode="numeric" autocomplete="one-time-code" ' +
      'maxlength="6" placeholder="Code à 6 chiffres" style="width:160px;padding:9px 10px;' +
      'border:1px solid #cbd5e1;border-radius:6px;font-size:14px;"> ' +
      '<button type="button" class="lp-sms-verifier" style="cursor:pointer;padding:9px 14px;border:0;' +
      'border-radius:6px;background:#1d4ed8;color:#fff;font-size:14px;">Vérifier</button>' +
      '</div>' +
      '<p class="lp-sms-message" role="status" style="margin:8px 0 0;font-size:13px;"></p>' +
      '<p class="lp-sms-aide" style="margin:4px 0 0;font-size:12px;color:#64748b;">' +
      'Code à 6 chiffres, valable 10 minutes, à usage unique. Un nouveau code remplace l\u2019ancien.</p>';
    phone.insertAdjacentElement('afterend', box);

    var flag = form.querySelector('input[name="telephone_verifie"]');
    if (!flag) {
      flag = document.createElement('input');
      flag.type = 'hidden';
      flag.name = 'telephone_verifie';
      flag.value = 'non';
      form.appendChild(flag);
    }
    return { box: box, flag: flag };
  }

  function initForm(form) {
    if (!form || form.getAttribute('data-lp-sms') === '1') return;
    var phone = telephoneField(form);
    if (!phone) return;
    form.setAttribute('data-lp-sms', '1');

    var ui = construireUI(form, phone);
    var box = ui.box, flag = ui.flag;
    var envoyerBtn = box.querySelector('.lp-sms-envoyer');
    var verifierBtn = box.querySelector('.lp-sms-verifier');
    var codeWrap = box.querySelector('.lp-sms-code-wrap');
    var codeInput = box.querySelector('.lp-sms-code');
    var message = box.querySelector('.lp-sms-message');

    function dire(texte, ok) {
      message.textContent = texte;
      message.style.color = ok ? '#1a7f37' : '#c62828';
    }

    function etatVerifie() {
      state.verifie = true;
      state.numero = normaliseTel(phone.value);
      flag.value = 'oui';
      codeWrap.style.display = 'none';
      envoyerBtn.style.display = 'none';
      dire('✓ Numéro vérifié', true);
      try {
        document.dispatchEvent(new CustomEvent('lp-sms-verified', {
          detail: { telephone: state.numero }
        }));
      } catch (e) { /* ignore */ }
    }

    function reset() {
      state.verifie = false;
      state.envoye = false;
      state.numero = '';
      flag.value = 'non';
      stopCompte();
      envoyerBtn.style.display = '';
      envoyerBtn.disabled = false;
      envoyerBtn.textContent = 'Recevoir le code par SMS';
      codeWrap.style.display = 'none';
      codeInput.value = '';
      dire('');
    }

    function stopCompte() {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      state.reste = 0;
    }

    function compte(secondes) {
      stopCompte();
      state.reste = secondes;
      envoyerBtn.disabled = true;
      var rendre = function () {
        if (state.reste <= 0) {
          stopCompte();
          envoyerBtn.disabled = false;
          envoyerBtn.textContent = 'Renvoyer le code';
          return;
        }
        envoyerBtn.textContent = 'Renvoyer le code (' + state.reste + ' s)';
        state.reste -= 1;
      };
      rendre();
      state.timer = setInterval(rendre, 1000);
    }

    envoyerBtn.addEventListener('click', function () {
      if (!mobileValide(phone.value)) {
        dire('Saisissez un mobile français valide : 10 chiffres commençant par 06 ou 07.');
        return;
      }
      envoyerBtn.disabled = true;
      dire('Envoi en cours…', true);
      appel({ action: 'envoyer_code', telephone: normaliseTel(phone.value) }).then(function (reponse) {
        state.dernierStatut = reponse.status;
        var json = reponse.data || {};
        var echec = json.status === 'error' || json.success === false || json.error;
        if (reponse.ok && !echec) {
          state.envoye = true;
          codeWrap.style.display = 'block';
          codeInput.value = '';
          codeInput.focus();
          dire('Code envoyé par SMS.', true);
          compte(COOLDOWN);
          return;
        }
        if (reponse.status === 429) {
          var reste = delaiRestant(reponse);
          dire(messageErreur(reponse));
          compte(reste);
          return;
        }
        dire(messageErreur(reponse));
        envoyerBtn.disabled = false;
      });
    });

    function verifier() {
      var code = String(codeInput.value || '').replace(/\D/g, '');
      if (code.length !== 6) {
        dire('Le code comporte 6 chiffres.');
        return;
      }
      if (!mobileValide(phone.value)) {
        dire('Saisissez un mobile français valide : 10 chiffres commençant par 06 ou 07.');
        return;
      }
      verifierBtn.disabled = true;
      appel({ action: 'verifier_code', telephone: normaliseTel(phone.value), code: code })
        .then(function (reponse) {
          verifierBtn.disabled = false;
          state.dernierStatut = reponse.status;
          var json = reponse.data || {};
          var echec = json.status === 'error' || json.success === false || json.error;
          if (reponse.ok && !echec) {
            etatVerifie();
            return;
          }
          dire(messageErreur(reponse));
          if (reponse.status === 410 || reponse.status === 409 || reponse.status === 404) {
            stopCompte();
            envoyerBtn.disabled = false;
            envoyerBtn.textContent = 'Demander un nouveau code';
          }
        });
    }

    verifierBtn.addEventListener('click', verifier);
    codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); verifier(); }
    });

    // Numéro modifié après vérification : on repart de zéro
    phone.addEventListener('input', function () {
      if (state.verifie && normaliseTel(phone.value) !== state.numero) reset();
    });
    phone.addEventListener('change', function () {
      if (state.verifie && normaliseTel(phone.value) !== state.numero) reset();
    });
  }

  var initDone = false;
  function init() {
    if (initDone) return;
    var forms = window.__lpLeadForms;
    if (!forms || !forms.length) {
      forms = [];
      TEL_SELECTORS.forEach(function (sel) {
        try {
          Array.prototype.forEach.call(document.querySelectorAll(sel), function (f) { forms.push(f); });
        } catch (e) { /* ignore */ }
      });
    }
    if (!forms.length) return;
    initDone = true;
    forms.forEach(initForm);
  }

  init();
  document.addEventListener('DOMContentLoaded', init);

  window.smsVerification = {
    estVerifie: function () { return !!state.verifie; },
    numeroVerifie: function () { return state.numero; },
    statut: function () { return { envoye: state.envoye, verifie: state.verifie, numero: state.numero, reste: state.reste, dernier_statut: state.dernierStatut }; },
    // utilisé par les tests : réinitialise l'état sans recharger la page
    _reset: function () { state.verifie = false; state.numero = ''; state.envoye = false; }
  };
})(window, document);
