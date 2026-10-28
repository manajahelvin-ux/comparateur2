/**
 * Banc de test des formulaires de lead — jsdom + vrai jQuery 3.7.1.
 *
 * Le chemin testé est celui de la production : Formly déclenche l'envoi par
 * `$form.submit()` (jQuery), pas par un simple submit natif.
 *
 * Usage : node outils/test-formulaires.mjs [--site slug] [--verbose]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jqueryFactory = require('jquery');

const args = process.argv.slice(2);
const onlySite = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;
const verbose = args.includes('--verbose');

const CRM_URL = 'https://mc.hellolead.pro/mon_compte/api/webflow/get_information.php';
const SHEET_URL = 'https://script.google.com/macros/s/';
const SMS_URL = 'https://mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php';

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils', 'audit-lp.json'), 'utf8'));
const sites = audit.filter(r => ['A_TEL', 'B_MAIL'].includes(r.categorie) && (!onlySite || r.site === onlySite));

let checks = 0;
const failures = [];

function check(site, name, condition, detail) {
  checks += 1;
  if (!condition) {
    failures.push(`${site} :: ${name}${detail ? ' — ' + detail : ''}`);
    if (verbose) console.log(`   ✗ ${name}${detail ? ' — ' + detail : ''}`);
  } else if (verbose) {
    console.log(`   ✓ ${name}`);
  }
}

function readConfig(html) {
  const m = html.match(/window\.LP_CONFIG=(\{[\s\S]*?\});<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function makeEnv(site) {
  const file = path.join(ROOT, site, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const cfg = readConfig(html);
  if (!cfg) throw new Error('LP_CONFIG absent');

  const dom = new JSDOM(html, {
    url: `https://${site}.lp.comparateurpro.fr/?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=TEST123&ltm_source=ADW_TEST&ltm_user=42`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // jsdom n'a pas de layout : on rend les éléments « visibles » pour le garde
  // de dernière étape (bouton final) et pour la détection des champs.
  const proto = window.HTMLElement.prototype;
  Object.defineProperty(proto, 'offsetParent', {
    configurable: true,
    get() {
      if (this.tagName === 'BODY') return null;
      return window.document.body;
    },
  });
  Object.defineProperty(proto, 'getClientRects', {
    configurable: true,
    value() {
      if (this.tagName === 'FORM' || !this.ownerDocument) return [];
      if (String(this.type || '').toLowerCase() === 'hidden') return [];
      return [{ width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20 }];
    },
  });

  window.LP_CONFIG = cfg;

  const fetchCalls = [];
  let responder = () => ({ status: 200, body: { status: 'ok' } });

  window.fetch = (url, options = {}) => {
    const call = {
      url: String(url),
      options,
      body: options.body,
      method: options.method || 'GET',
      mode: options.mode,
    };
    fetchCalls.push(call);
    const reply = responder(call) || {};
    const status = reply.status || 200;
    const body = reply.body === undefined ? {} : reply.body;
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    const doReject = reply.networkError;
    return new Promise((resolve, reject) => {
      if (doReject) {
        reject(new TypeError('Failed to fetch'));
        return;
      }
      setTimeout(() => {
        resolve({
          ok: status >= 200 && status < 300,
          status,
          text: () => Promise.resolve(text),
          json: () => Promise.resolve(JSON.parse(text || '{}')),
        });
      }, 0);
    });
  };

  window.navigator.sendBeacon = (url, data) => {
    fetchCalls.push({ url: String(url), options: {}, body: data, method: 'BEACON', mode: 'nocall' });
    return true;
  };

  window.AbortController = window.AbortController || class { abort() {} };

  // Consentement complet par défaut
  window.document.cookie = 'user_cookie_preferences=' +
    encodeURIComponent(JSON.stringify({ essential: true, analytics: true, marketing: true })) +
    '; path=/';

  const $ = jqueryFactory(window);
  window.jQuery = window.$ = $;

  window.eval(fs.readFileSync(path.join(ROOT, site, 'lead-handler.js'), 'utf8'));
  const smsPath = path.join(ROOT, site, 'verification-sms.js');
  const hasSms = fs.existsSync(smsPath);
  if (hasSms) window.eval(fs.readFileSync(smsPath, 'utf8'));

  const form = window.document.querySelectorAll(cfg.selectors[0])[0];
  return { window, dom, $, cfg, form, fetchCalls, hasSms, setResponder: fn => { responder = fn; }, html };
}

function normName(name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_\-.]+/g, '').replace(/\d+$/, '');
}

function field(form, names) {
  return Array.from(form.querySelectorAll('input, select, textarea'))
    .find(el => names.includes(normName(el.name)));
}

function fillForm(env) {
  const { window, form } = env;
  const set = (el, value) => {
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  set(field(form, ['nom']), 'Durand');
  set(field(form, ['prenom']), 'Marie');
  set(field(form, ['mail', 'email']), 'marie.durand@example.com');
  set(field(form, ['telephone']), '0612345678');
  set(field(form, ['codepostal']), '75011');
  set(field(form, ['societe']), 'Durand Conseil');
  const consent = form.querySelector('input[name="consentement"][value="oui"], input[name="consentement_1"][value="oui"]');
  if (consent) { consent.checked = true; consent.dispatchEvent(new window.Event('change', { bubbles: true })); }
  // quelques réponses de questionnaire
  ['reponse_1_1', 'reponse_1', 'reponse_2'].forEach(name => {
    const el = form.querySelector(`input[name="${name}"]`);
    if (el && (el.type === 'radio' || el.type === 'checkbox')) {
      el.checked = true;
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
  });
}

function crmPayload(calls) {
  const call = calls.find(c => c.url === CRM_URL && c.method !== 'BEACON');
  if (!call) return null;
  try { return JSON.parse(call.body); } catch (e) { return null; }
}

async function settle(times = 6) {
  for (let i = 0; i < times; i++) await new Promise(r => setTimeout(r, 5));
}

async function runSite(site, categorie) {
  const env = makeEnv(site);
  const { window, $, form, cfg, fetchCalls, setResponder, html, hasSms } = env;
  const withSms = categorie === 'A_TEL' && hasSms;
  check(site, 'configuration présente', !!cfg);
  check(site, 'formulaire ciblé présent', !!form, cfg.selectors.join(', '));
  if (!form) return;

  fillForm(env);

  if (!withSms) {
    /* 1 bis — page sans téléphone saisissable : envoi direct, sans SMS */
    fetchCalls.length = 0;
    $(form).submit();
    await settle(10);
    check(site, '1bis. envoi direct sans SMS', fetchCalls.some(c => c.url === CRM_URL));
    check(site, '1bis. aucune interface SMS', !form.querySelector('.lp-sms-envoyer'));
    const p1 = crmPayload(fetchCalls);
    check(site, '1bis. formId transmis', !!p1 && p1.payload.formId === cfg.formId);
    env.dom.window.close();
    return;
  }

  /* 1 — soumission refusée sans vérification SMS */
  fetchCalls.length = 0;
  $(form).submit();
  await settle();
  check(site, '1. refus sans SMS', fetchCalls.filter(c => c.url === CRM_URL || c.url.includes('script.google.com')).length === 0,
    'aucun appel CRM/Sheets attendu');
  check(site, '1. message de vérification affiché',
    /vérifier votre numéro/i.test(window.document.body.textContent));

  /* 2 — envoi du code */
  fetchCalls.length = 0;
  setResponder(() => ({ status: 200, body: { status: 'ok' } }));
  const sendBtn = form.querySelector('.lp-sms-envoyer');
  check(site, '2. bouton SMS présent', !!sendBtn);
  sendBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
  const smsCall = fetchCalls.find(c => c.url === SMS_URL);
  const params = smsCall ? new URLSearchParams(String(smsCall.body)) : null;
  check(site, '2. appel envoyer_code', !!params && params.get('action') === 'envoyer_code');
  check(site, '2. numéro normalisé', !!params && params.get('telephone') === '0612345678');
  const codeInput = form.querySelector('.lp-sms-code');
  check(site, '2. champ code affiché', codeInput && codeInput.parentNode.style.display !== 'none');

  /* 3 — mauvais code (422) */
  setResponder(call => (call.url === SMS_URL ? { status: 422, body: { status: 'error', message: 'Code invalide.' } } : { status: 200, body: { status: 'ok' } }));
  codeInput.value = '000000';
  form.querySelector('.lp-sms-verifier').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
  check(site, '3. code refusé', window.smsVerification.estVerifie() === false);
  check(site, '3. message API affiché', /Code invalide/i.test(form.textContent));

  /* 4 — bon code */
  setResponder(() => ({ status: 200, body: { status: 'ok' } }));
  codeInput.value = '123456';
  form.querySelector('.lp-sms-verifier').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
  check(site, '4. numéro vérifié', window.smsVerification.estVerifie() === true);
  check(site, '4. numéro mémorisé', window.smsVerification.numeroVerifie() === '0612345678');
  const flag = form.querySelector('input[name="telephone_verifie"]');
  check(site, '4. champ telephone_verifie=oui', !!flag && flag.value === 'oui');
  check(site, '4. badge de vérification', /Numéro vérifié/.test(form.textContent));

  /* 5 — soumission réelle via jQuery */
  fetchCalls.length = 0;
  window.dataLayer = [];
  setResponder(call => {
    if (call.url === CRM_URL) return { status: 200, body: { status: 'ok' } };
    if (call.url.startsWith(SHEET_URL)) return { status: 200, body: { status: 'ok' } };
    return { status: 200, body: { status: 'ok' } };
  });
  $(form).submit();
  await settle(10);
  const payload = crmPayload(fetchCalls);
  check(site, '5. envoi CRM', !!payload);
  check(site, '5. formId transmis', !!payload && payload.payload && payload.payload.formId === cfg.formId,
    payload && payload.payload && payload.payload.formId);
  check(site, '5. enveloppe id (uuid)', !!payload && typeof payload.payload.id === 'string' && payload.payload.id.length > 8);
  check(site, '5. telephone_verifie=oui', !!payload && payload.payload.data.telephone_verifie === 'oui');
  const mailField = field(form, ['mail', 'email']);
  check(site, '5. téléphone transmis',
    !!payload && payload.payload.data.telephone === '0612345678');
  if (mailField) {
    check(site, '5. e-mail transmis',
      !!payload && payload.payload.data.mail === 'marie.durand@example.com');
  }
  check(site, '5. envoi Google Sheets', fetchCalls.some(c => c.url.startsWith(SHEET_URL)));
  const sheetCall = fetchCalls.find(c => c.url.startsWith(SHEET_URL));
  if (sheetCall) {
    const sp = new URLSearchParams(String(sheetCall.body));
    check(site, '5. sheets formId', sp.get('formId') === cfg.formId);
    check(site, '5. sheets telephone', sp.get('telephone') === '0612345678');
  }
  check(site, '5. confirmation affichée',
    Array.from(window.document.querySelectorAll('.w-form-done, #lp-merci'))
      .some(el => el.style.display === 'block'));
  check(site, '5. événement GTM',
    (window.dataLayer || []).some(e => e && (e.event === 'formulaire_lead' || e.event === 'formulaire_micro_entrepreneur')));
  const gtmEvent = (window.dataLayer || []).find(e => e && e.event);
  check(site, '5. GTM form_id', !!gtmEvent && gtmEvent.form_id === cfg.formId);
  check(site, '5. click ID avec consentement marketing', !!payload && payload.payload.data.gclid === 'TEST123');

  /* 8 — les deux livraisons échouent : pas de faux Merci */
  const env2 = makeEnv(site);
  fillForm(env2);
  env2.window.smsVerification._reset();
  // on force la vérification en simulant le parcours SMS complet
  env2.setResponder(() => ({ status: 200, body: { status: 'ok' } }));
  const send2 = env2.form.querySelector('.lp-sms-envoyer');
  send2.dispatchEvent(new env2.window.MouseEvent('click', { bubbles: true }));
  await settle();
  env2.form.querySelector('.lp-sms-code').value = '123456';
  env2.form.querySelector('.lp-sms-verifier').dispatchEvent(new env2.window.MouseEvent('click', { bubbles: true }));
  await settle();
  env2.fetchCalls.length = 0;
  env2.setResponder(() => ({ status: 500, body: { status: 'error' } }));
  env2.$(env2.form).submit();
  await settle(10);
  const done2 = Array.from(env2.window.document.querySelectorAll('.w-form-done, #lp-merci'))
    .some(el => el.style.display === 'block');
  check(site, '8. pas de faux Merci quand tout échoue', done2 === false);
  check(site, '8. erreur visible', /n’a pas pu être transmise|n'a pas pu être transmise/.test(env2.form.parentNode.textContent + env2.form.textContent));
  check(site, '8. formulaire toujours visible', env2.form.style.display !== 'none');
  // nouvel essai possible
  env2.setResponder(() => ({ status: 200, body: { status: 'ok' } }));
  env2.fetchCalls.length = 0;
  env2.$(env2.form).submit();
  await settle(10);
  check(site, '8. nouvel essai accepté', env2.fetchCalls.some(c => c.url === CRM_URL));

  /* 9 — honeypot rempli : silence */
  const env3 = makeEnv(site);
  fillForm(env3);
  const hp = env3.form.querySelector('input[name="website"]');
  check(site, '9. honeypot présent', !!hp);
  if (hp) {
    hp.value = 'spam';
    env3.fetchCalls.length = 0;
    env3.$(env3.form).submit();
    await settle();
    check(site, '9. aucun envoi si honeypot rempli', env3.fetchCalls.length === 0);
  }

  /* 10 / 11 — consentement */
  const env4 = makeEnv(site);
  env4.window.document.cookie = 'user_cookie_preferences=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  env4.window.eval(fs.readFileSync(path.join(ROOT, site, 'lead-handler.js'), 'utf8'));
  fillForm(env4);
  env4.window.smsVerification._reset();
  env4.setResponder(() => ({ status: 200, body: { status: 'ok' } }));
  env4.form.querySelector('.lp-sms-envoyer').dispatchEvent(new env4.window.MouseEvent('click', { bubbles: true }));
  await settle();
  env4.form.querySelector('.lp-sms-code').value = '123456';
  env4.form.querySelector('.lp-sms-verifier').dispatchEvent(new env4.window.MouseEvent('click', { bubbles: true }));
  await settle();
  env4.fetchCalls.length = 0;
  env4.$(env4.form).submit();
  await settle(10);
  const payload4 = crmPayload(env4.fetchCalls);
  check(site, '10. pas de click ID sans consentement', !!payload4 && !payload4.payload.data.gclid);
  check(site, '10. pas d’UTM sans consentement', !!payload4 && !payload4.payload.data.utm_source);
  check(site, '10. source de secours propre',
    !!payload4 && payload4.payload.data.source === cfg.sourceSecours,
    payload4 && payload4.payload.data.source);

  /* 6 — 429 sur le renvoi */
  const env5 = makeEnv(site);
  fillForm(env5);
  env5.setResponder(() => ({ status: 429, body: { status: 'error', message: 'Trop de demandes.', retry_after: 90 } }));
  env5.form.querySelector('.lp-sms-envoyer').dispatchEvent(new env5.window.MouseEvent('click', { bubbles: true }));
  await settle();
  const btn5 = env5.form.querySelector('.lp-sms-envoyer');
  check(site, '6. renvoi désactivé sur 429', btn5.disabled === true);
  check(site, '6. délai restant affiché', /9[0-9]\s*s/.test(btn5.textContent), btn5.textContent);

  /* 7 — 410 sur code expiré */
  const env6 = makeEnv(site);
  fillForm(env6);
  env6.setResponder(call => (call.url === SMS_URL && String(call.body).includes('envoyer_code')
    ? { status: 200, body: { status: 'ok' } }
    : { status: 410, body: { status: 'error', message: 'Code expiré.' } }));
  env6.form.querySelector('.lp-sms-envoyer').dispatchEvent(new env6.window.MouseEvent('click', { bubbles: true }));
  await settle();
  env6.form.querySelector('.lp-sms-code').value = '123456';
  env6.form.querySelector('.lp-sms-verifier').dispatchEvent(new env6.window.MouseEvent('click', { bubbles: true }));
  await settle();
  check(site, '7. message expiration', /Code expiré/i.test(env6.form.textContent));
  check(site, '7. non vérifié après 410', env6.window.smsVerification.estVerifie() === false);

  env.dom.window.close();
  env2.dom.window.close();
  env3.dom.window.close();
  env4.dom.window.close();
  env5.dom.window.close();
  env6.dom.window.close();
}

for (const row of sites) {
  if (verbose) console.log(`\n### ${row.site}`);
  try {
    await runSite(row.site, row.categorie);
  } catch (error) {
    failures.push(`${row.site} :: exception — ${error.message}`);
    if (verbose) console.log('   ✗ exception', error.stack);
  }
}

console.log(`\nSites testés : ${sites.length}`);
console.log(`Contrôles   : ${checks}`);
console.log(`Échecs      : ${failures.length}`);
if (failures.length) {
  const grouped = {};
  failures.forEach(f => {
    const [site, name] = f.split(' :: ');
    (grouped[name] = grouped[name] || []).push(site);
  });
  Object.keys(grouped).slice(0, 40).forEach(name => {
    console.log(`- ${name} (${grouped[name].length}) : ${grouped[name].slice(0, 6).join(', ')}`);
  });
  process.exitCode = 1;
}
