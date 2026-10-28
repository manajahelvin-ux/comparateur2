/**
 * Banc de test « messages de succès » — régression du remerciement automatique.
 *
 * Bug corrigé : le garde `lp2site-doctor` de script.js (version 2) programmait
 * `swapFailIfNeeded()` sur des minuteries au chargement (3,2 s / 4 s / 5 s / 6,5 s).
 * Résultat : le bloc de remerciement s'affichait tout seul à l'ouverture de chaque
 * page, et un bandeau vert « Merci ! Vos réponses ont bien été enregistrées. »
 * apparaissait en bas de l'écran, sans aucune soumission.
 *
 * Ce banc vérifie, sur les 138 pages :
 *   1. plus aucune minuterie ni aucun code d'affichage automatique de succès ;
 *   2. après avoir rejoué toutes les minuteries de la page (≈ 8 s simulées),
 *      aucun bloc de succès n'est visible et aucun bandeau vert n'existe ;
 *   3. le garde re-masque bien un bloc de succès affiché par un autre script ;
 *   4. sur les pages de formulaire, la confirmation n'apparaît qu'après une
 *      soumission réellement livrée (et reste impossible sans livraison).
 *
 * Usage : node outils/test-messages.mjs [--site slug] [--verbose]
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

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils', 'audit-lp.json'), 'utf8'));
const sites = audit.filter(r => !onlySite || r.site === onlySite);

let checks = 0;
const failures = [];

function confirmationVisible(window) {
  // confirmation légitime : bloc Webflow, bandeau créé par le gestionnaire, ou
  // écran de confirmation propre à la LP (tunnel maison, classe is-active)
  const nodes = Array.from(window.document.querySelectorAll(
    '.w-form-done, #lp-merci, .step-done.is-active, [data-step="done"].is-active'));
  return nodes.filter(el => {
    const style = el.getAttribute('style') || '';
    if (/display\s*:\s*none/i.test(style)) return false;
    if (el.id === 'lp-merci') return true;
    if (el.classList.contains('is-active')) return true;
    return /display\s*:\s*block/i.test(style);
  });
}

function check(site, name, condition, detail) {
  checks += 1;
  if (!condition) {
    failures.push(`${site} :: ${name}${detail ? ' — ' + detail : ''}`);
    if (verbose) console.log(`   ✗ ${name}${detail ? ' — ' + detail : ''}`);
  } else if (verbose) {
    console.log(`   ✓ ${name}`);
  }
}

/** Bloc du garde lp2site-doctor extrait du vrai script.js. */
function doctorBlock(site) {
  const src = fs.readFileSync(path.join(ROOT, site, 'script.js'), 'utf8');
  const start = src.indexOf('/* [lp2site-doctor] garde formulaire');
  if (start === -1) return null;
  const end = src.indexOf('/* script.js', start);
  return src.slice(start, end === -1 ? start + 6000 : end);
}

function visible(el) {
  const style = el.getAttribute('style') || '';
  if (/display\s*:\s*none/i.test(style)) return false;
  const cls = el.getAttribute('class') || '';
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
  return !cls.includes('w-form-done') || true;
}

/** Rejoue toutes les minuteries programmées par le bloc, en simulation. */
function flushTimers(window, timers) {
  let guard = 0;
  while (timers.length && guard < 200) {
    guard += 1;
    const task = timers.shift();
    try { task.fn.apply(window, task.args); } catch (e) { /* le bloc se protège déjà */ }
  }
}

function makeEnv(site) {
  const html = fs.readFileSync(path.join(ROOT, site, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: `https://${site}.lp.comparateurpro.fr/`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // jsdom n'a pas de layout : tout élément est « visible » par défaut, ce qui
  // reproduit le pire cas du bug (offsetParent non nul partout).
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return this.tagName === 'BODY' ? null : window.document.body; },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value() { return [{ width: 100, height: 20 }]; },
  });

  return { window, dom };
}

const GREEN_BANNER = /0b7a5b/i;

async function runSite(site, categorie) {
  const source = fs.readFileSync(path.join(ROOT, site, 'script.js'), 'utf8');

  /* 1 — plus aucun code d'affichage automatique dans le bundle */
  check(site, '1. aucune minuterie automatique (passes2)', !source.includes('passes2'));
  check(site, '1. plus de swapFailIfNeeded', !source.includes('swapFailIfNeeded'));
  check(site, '1. plus de bandeau lp2site-merci', !source.includes('lp2site-merci'));
  check(site, '1. plus de faux « Merci ! Vos réponses »', !source.includes('Vos réponses ont bien été enregistrées'));
  check(site, '1. plus de couleur verte de bandeau (#0b7a5b)', !GREEN_BANNER.test(source));

  const block = doctorBlock(site);
  check(site, '1. garde lp2site-doctor présent', !!block);
  if (!block) return;
  check(site, '1. garde nommé v3', block.includes('garde formulaire v3'));

  /* 2 — exécution du garde réel + rejeu de ses minuteries */
  const { window, dom } = makeEnv(site);
  const timers = [];
  window.setTimeout = (fn, delay) => { timers.push({ fn, delay: delay || 0 }); return timers.length; };
  window.clearTimeout = () => {};
  try { window.eval(block); } catch (error) {
    check(site, '2. garde exécutable', false, error.message);
    dom.window.close();
    return;
  }
  flushTimers(window, timers);

  const doc = window.document;
  const doneBlocks = () => Array.from(doc.querySelectorAll('.w-form-done'));

  check(site, '2. aucun remerciement visible après 8 s simulées',
    confirmationVisible(window).length === 0,
    confirmationVisible(window).map(el => el.getAttribute('class')).join(', '));
  check(site, '2. tous les blocs de succès masqués',
    doneBlocks().every(el => (el.getAttribute('style') || '').includes('none')));
  check(site, '2. aucun bandeau vert', !doc.getElementById('lp2site-merci'));
  const green = Array.from(doc.querySelectorAll('[style]')).filter(el =>
    GREEN_BANNER.test(el.getAttribute('style') || ''));
  check(site, '2. aucun élément vert de confirmation', green.length === 0);

  /* 3 — un autre script affiche un bloc de succès : le garde le re-masque */
  const target = doneBlocks()[0];
  if (target) {
    target.style.display = 'block';
    await new Promise(r => setTimeout(r, 0));
    await Promise.resolve();
    check(site, '3. succès parasite re-masqué', (target.getAttribute('style') || '').includes('none'));
  }

  /* 4 — confirmation possible uniquement après livraison réelle */
  if (categorie === 'A_TEL' || categorie === 'B_MAIL') {
    const cfgMatch = fs.readFileSync(path.join(ROOT, site, 'index.html'), 'utf8')
      .match(/window\.LP_CONFIG=(\{[\s\S]*?\});<\/script>/);
    const cfg = cfgMatch ? JSON.parse(cfgMatch[1]) : null;
    check(site, '4. LP_CONFIG présent', !!cfg);
    if (cfg) {
      const env = makeEnv(site);
      const { window: w } = env;
      w.LP_CONFIG = cfg;
      const calls = [];
      w.fetch = (url, options = {}) => {
        calls.push(String(url));
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"status":"ok"}') });
      };
      w.navigator.sendBeacon = () => true;
      const $ = jqueryFactory(w);
      w.jQuery = w.$ = $;
      w.document.cookie = 'user_cookie_preferences=' + encodeURIComponent(JSON.stringify(
        { essential: true, analytics: true, marketing: true })) + '; path=/';
      w.eval(fs.readFileSync(path.join(ROOT, site, 'lead-handler.js'), 'utf8'));
      const hasSms = fs.existsSync(path.join(ROOT, site, 'verification-sms.js'));
      if (hasSms) w.eval(fs.readFileSync(path.join(ROOT, site, 'verification-sms.js'), 'utf8'));

      await new Promise(r => setTimeout(r, 20));
      check(site, '4. rien d’affiché au chargement', confirmationVisible(w).length === 0);
      check(site, '4. aucun envoi au chargement', calls.length === 0);

      // soumission réelle (numéro non vérifié) : doit rester sans confirmation
      const form = w.document.querySelector(cfg.selectors[0]);
      if (form) {
        const set = (el, v) => { if (el) { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); } };
        const byName = n => form.querySelector(`input[name="${n}"]`);
        set(byName('nom'), 'Durand');
        set(byName('prenom'), 'Marie');
        set(byName('mail'), 'marie.durand@example.com');
        set(byName('telephone'), '0612345678');
        $(form).submit();
        await new Promise(r => setTimeout(r, 40));
        const afterSubmit = confirmationVisible(w);
        if (categorie === 'B_MAIL') {
          // page sans SMS : la livraison simulée réussit, la confirmation est légitime
          check(site, '4. confirmation après livraison réelle', afterSubmit.length === 1);
          check(site, '4. confirmation marquée comme légitime',
            afterSubmit.every(el => el.hasAttribute('data-lp-confirme')));
        } else {
          // page avec SMS : sans numéro vérifié, aucune livraison ni confirmation
          check(site, '4. pas de remerciement sans livraison', afterSubmit.length === 0);
          check(site, '4. formulaire toujours visible', form.style.display !== 'none');
        }
      }
      env.dom.window.close();
    }
  }

  dom.window.close();
}

for (const row of sites) {
  if (verbose) console.log(`\n### ${row.site}`);
  try {
    await runSite(row.site, row.categorie);
  } catch (error) {
    failures.push(`${row.site} :: exception — ${error.message}`);
  }
}

console.log(`\nPages testées : ${sites.length}`);
console.log(`Contrôles     : ${checks}`);
console.log(`Échecs        : ${failures.length}`);
if (failures.length) {
  const grouped = {};
  failures.forEach(f => {
    const [site, name] = f.split(' :: ');
    (grouped[name] = grouped[name] || []).push(site);
  });
  Object.keys(grouped).forEach(name => {
    console.log(`- ${name} (${grouped[name].length}) : ${grouped[name].slice(0, 6).join(', ')}`);
  });
  process.exitCode = 1;
}
