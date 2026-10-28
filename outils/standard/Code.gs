/**
 * Code.gs — Apps Script de réception Google Sheets (référence du standard).
 *
 * À déployer comme application Web (« Exécuter en tant que : moi », accès
 * « Tout le monde ») puis à coller l'URL /exec dans `LP_CONFIG.sheet` ou dans la
 * constante ENDPOINT_SHEET de lead-handler.js.
 *
 * Le handler envoie un corps plat `application/x-www-form-urlencoded` et attend
 * une réponse JSON `{"status":"ok"}`.
 */
var SHEET_ID = 'REMPLACER_PAR_ID_DE_LA_FEUILLE';
var SHEET_NAME = 'Leads';

var COLUMNS = [
  'date', 'formId', 'form_name', 'site', 'nom', 'prenom', 'mail', 'telephone',
  'telephone_verifie', 'code_postal', 'societe', 'consentement', 'solution', 'enjeu',
  'source', 'categorie', 'coordonnee', 'user', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_content', 'utm_term', 'utm_typ', 'ltm_source', 'ltm_category',
  'ltm_user', 'gclid', 'msclkid', 'page_url', 'referrer', 'consent_analytics',
  'consent_marketing', 'autre_info_fj'
];

function doPost(e) {
  try {
    var params = e.parameter || {};
    // honeypot : le handler envoie toujours website="" — un remplissage signale un bot
    if (params.website) {
      return json({ statut: 'ignore', status: 'ok' });
    }
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
    }
    var row = COLUMNS.map(function (key) {
      if (key === 'date') return new Date();
      return params[key] || '';
    });
    sheet.appendRow(row);
    return json({ statut: 'ok', status: 'ok' });
  } catch (error) {
    return json({ statut: 'erreur', status: 'error', message: String(error) });
  }
}

function doGet() {
  return json({ status: 'ok', message: 'Endpoint de collecte actif.' });
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
