# voiture-nouveau-range-rover — livraison fonctionnelle

Standard appliqué : **MEMOIRE-SESSION-CONTINUATION** (version 1.0.0).

## Identité CRM

- `formId` : `ADW_LP_VOITURE_NOUVEAU_RANGE_ROVER`
- Source de secours : `LP VOITURE NOUVEAU RANGE ROVER`
- `form_name` : `wf-form-`
- Formulaire ciblé : `form[id="wf-form-"]`, `form[id="wf-form-"]`

## Ce qui est en place

- soumission autonome, sans dépendance à l'hébergement Webflow ;
- envoi **en parallèle** vers le CRM HelloLead et Google Sheets ;
- confirmation affichée uniquement si au moins une livraison a réussi ;
- validations e-mail, code postal, téléphone mobile français et consentement ;
- honeypot `website` silencieux ;
- tracking UTM / `ltm_*` / click IDs filtré par le consentement (`user_cookie_preferences`) ;
- événement GTM `formulaire_lead`, ou `formulaire_micro_entrepreneur` lorsque le champ dédié vaut « Oui » ;
- vérification du mobile par SMS avant tout envoi du lead ;
- APIs de contrôle : `lpLead.preview()`, `lpLead.googleSheetPreview()`, `lpTracking.inspect()`,
  `smsVerification.estVerifie()`, `smsVerification.numeroVerifie()`.

## Configuration à valider en production

1. Enregistrer `ADW_LP_VOITURE_NOUVEAU_RANGE_ROVER` côté CRM HelloLead.
2. Autoriser l'origine publique de la LP en CORS sur l'API SMS.
3. Vérifier la réception réelle du lead dans le CRM et dans la feuille Google.
4. Tester un SMS réel (envoi, expiration, usage unique, renvoi à 120 s).
5. Contrôler l'événement dans GTM en mode Aperçu, avec consentement accordé.
