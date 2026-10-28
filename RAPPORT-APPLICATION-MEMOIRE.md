# Rapport d'application des mémoires — parc `comparateur2`

**Date :** 28 octobre 2026
**Branche de session :** `arena/68310784-comparateur2`
**Document de référence :** `MEMOIRE-SESSION-CONTINUATION.md` (projet PorojetMigration, standard v1.0.0)
**Périmètre :** les 138 landing pages du dépôt `manajahelvin-ux/comparateur2`

---

## 1. Objet

La mémoire de session décrit le standard fonctionnel atteint sur le projet
PorojetMigration : formulaires autonomes (sans dépendance à l'hébergement
Webflow), double livraison CRM HelloLead + Google Sheets, confirmation affichée
seulement après livraison réelle, validations, honeypot, tracking filtré par
consentement, événement GTM et vérification du mobile par SMS.

Le dépôt `comparateur2` contenait **138 landing pages exportées de Webflow mais
aucune de ces briques**. Ce rapport documente la vérification du parc, les
corrections appliquées et l'application du standard, page par page.

---

## 1 bis. Correctif ultérieur — remerciement automatique

Un défaut signalé après la première livraison est corrigé sur cette branche : le
garde `lp2site-doctor` v2 de `script.js` affichait seul, 3,2 s après l'ouverture de
chaque page, le bloc de remerciement ou un bandeau vert « Merci ! Vos réponses ont
bien été enregistrées. ». Le garde est passé en v3 dans les 138 `script.js` :
plus aucun affichage automatique, et tout bloc de succès non confirmé par une
livraison réelle est masqué (`data-lp-confirme`). Détail et contrôles :
[`RAPPORT-CORRECTION-MESSAGES.md`](RAPPORT-CORRECTION-MESSAGES.md).

---

## 2. Diagnostic initial (état du dépôt avant intervention)

Reconstitué depuis le commit `01d1187` par `outils/audit.py --git`
(voir `AUDIT-LP.md`, `outils/audit-initial.json`).

| Constat | Mesure |
|---|---|
| Pages analysées | 138 |
| Pages sans `lang="fr"` | 137 (`lang="en"`) |
| Pages sans aucun H1 | 129 |
| Pages avec plusieurs H1 | 4 (dont une page à 17 H1) |
| Pages sans conteneur GTM | 138 |
| Pages avec le message d'erreur Webflow anglais (`Oops! …`) | 113 |
| Pages avec message de succès Webflow anglais | 28 |
| Pages avec `source = "SOURCE PAR DEFAUT"` | 99 |
| Formulaire de lead sans téléphone saisissable | 5 |
| `lead-handler.js` / `verification-sms.js` présents | 0 |
| Gestionnaire autonome CRM / Sheets | 0 (1 seul `script.js` du parc contenait un envoi CRM) |
| Actifs locaux manquants (images, polices, styles) | 0 |

**Cause racine constatée.** Chaque page charge le bundle Webflow `script.js`, qui
contient un gestionnaire `$('.form-redirect').submit()` : il annule la soumission
native, enregistre quelques champs dans `localStorage` et redirige vers `ltm_typ`
après 3 secondes, **sans jamais transmettre le lead**. Les handlers Webflow
tentent en parallèle un POST vers l'hébergement Webflow, d'où l'échec « Oops! »
hors Webflow. Les anciens modules SMS présents dans les bundles visent l'API
Axialys, morte pour ce parc. Aucun envoi CRM ni Google Sheets n'existait.

---

## 3. Corrections appliquées (hors formulaire)

| Correction | Portée |
|---|---|
| `lang="fr"` sur toutes les pages | 137 pages |
| Conteneur **GTM-53SH7D7F** + `noscript` + Consent Mode v2 par défaut (`denied`) | 138 pages |
| H1 unique : titre du hero converti en H1, ou H1 masqué si le titre est un H2 | 129 pages |
| H1 excédentaires rétrogradés en H2 (classes conservées) ou neutralisés en bloc stylé | 4 pages (34 H1) |
| Messages Webflow par défaut traduits (`Oops!`, `Thank you!`, `Please wait`, `Submit`) | 113 pages |
| `SOURCE PAR DEFAUT` remplacée par la source réelle de la LP | 99 pages |
| Champs cachés de tracking complétés (`source`, `categorie`, `coordonnee`, `user`, `gclid`, `msclkid`) | 105 formulaires |

Aucune correction n'a modifié le design : les H1 promus reçoivent la classe
`lp-h1-titre` et une règle `h1:where(.lp-h1-titre)` qui neutralise uniquement les
propriétés héritées du sélecteur de type, sans toucher aux classes existantes.
Les images, polices et styles n'ont pas été modifiés.

---

## 4. Traitement par catégorie

| Catégorie | Sites | Traitement appliqué |
|---|---:|---|
| **A_TEL** | 74 | Gestionnaire autonome + vérification SMS obligatoire + champs de tracking |
| **B_MAIL** | 5 | Gestionnaire autonome sans SMS (téléphone masqué dans le formulaire, aucun numéro saisissable) |
| **C_QUALIF** | 32 | Aucune interception : formulaires de qualification d'un tunnel en deux temps, la capture a lieu sur la page coordonnées correspondante. Champs cachés de tracking complétés uniquement |
| **PAGE** | 27 | Pages de contenu, TYP, mentions légales, remerciement : `lang`, GTM, H1 uniquement |

Cas particuliers :

- `assurance-consultant-societe-conseil-v2` est un **wrapper iframe** : `lang`,
  GTM, H1, plus `bridge.js` (relais parent du protocole `ubepro-assurance-v1`).
  L'iframe pointe vers `../assurance-consultants-societe-conseil/`, donc en
  **même origine** : la LP enfant porte elle-même son gestionnaire et son module
  SMS, le relais reste inactif. Il devient actif si l'iframe est repointée vers
  un domaine externe (voir §9).
- 5 sites `remerciement-*` ont un champ `telephone` en `type="hidden"` : classés
  B_MAIL, sans module SMS, et documentés comme tels.

---

## 5. Standard fonctionnel livré

### 5.1 Fichiers déposés dans chaque LP traitée

- `lead-handler.js` — gestionnaire autonome (79 pages) ;
- `verification-sms.js` — vérification du mobile (74 pages) ;
- `docs/LIVRAISON-FONCTIONNELLE.md` — identité CRM, contrats, checklist production.

### 5.2 Chemin de soumission

Formly envoie le formulaire via jQuery `$form.submit()`, qui **n'émet pas
d'événement natif** : une simple capture de `submit` ne suffit pas. Le handler
traite donc trois chemins :

1. handler jQuery réinstallé **en dernier** sur le formulaire après
   `$(form).off('submit')` — supprime Webflow, l'ancien gestionnaire intégré et la
   redirection `ltm_typ` du bundle ;
2. capture native `submit` au niveau `document` (soumission clavier/navigateur) ;
3. surcharge de `HTMLFormElement.prototype.submit` (appel natif direct).

Un garde de dernière étape empêche toute interception sur les étapes
intermédiaires du formulaire multi-étapes (visibilité du bouton final).

### 5.3 Données transmises

- identité : `nom`, `prenom`, `mail`, `telephone` (normalisé), `code_postal`,
  `societe`, `civilite`, `ville`, `consentement` ;
- `telephone_verifie` = `oui`/`non` ;
- réponses du questionnaire : champs `reponse_*` + tableau
  `question_i : reponse_i` ;
- `solution` (première réponse principale) et `enjeu` (récapitulatif questions/réponses) ;
- champs système `source`, `categorie`, `coordonnee`, `user` et le tracking autorisé.

### 5.4 Livraisons

- **CRM** : `POST https://mc.hellolead.pro/mon_compte/api/webflow/get_information.php`
  avec l'enveloppe `{payload: {formId, id: uuid, data: {...}}}`. Mode CORS prioritaire
  (timeout 12 s, exigence d'une réponse JSON positive) ; repli `sendBeacon` /
  `no-cors` en cas d'échec CORS, la livraison étant alors marquée comme non confirmée.
  Jamais de `no-cors` présenté comme une confirmation applicative.
- **Google Sheets** : `POST` `application/x-www-form-urlencoded` vers l'Apps Script
  de référence, timeout 15 s, réponse `{"status":"ok"}` exigée, `website=""` conservé
  et `autre_info_fj` alimenté par `enjeu`.
- Les deux envois partent **en parallèle**. La confirmation n'est affichée que si
  `crm.ok || sheet.ok`. Si les deux échouent : message d'erreur visible, formulaire
  intact, nouvel essai possible. Aucun faux « Merci » n'est plus possible.

### 5.5 Validations, honeypot, consentement

- e-mail, code postal 5 chiffres, mobile français `^0[67]\d{8}$`, consentement ;
- honeypot `website` créé si absent, invisible, silencieux (aucun envoi, aucun
  événement) ;
- consentement lu dans le cookie `user_cookie_preferences` (bannière du parc),
  avec repli `ubeproCookiePreferencesV1` en `localStorage` ;
- sans consentement analytics : aucun UTM/`ltm_*`/`page_url` transmis ;
- sans consentement marketing : aucun click ID (`gclid`, `msclkid`, `fbclid`,
  `gbraid`, `wbraid`, `ttclid`) ni `user_data`.

### 5.6 Événement GTM

`formulaire_lead`, ou `formulaire_micro_entrepreneur` quand le champ détecté
comme question « micro/auto entrepreneur » vaut *Oui*. L'événement porte
`form_id`, `form_name`, `site`, `solution`, `telephone_verifie`, l'état des deux
livraisons, les consentements, puis le tracking autorisé.

### 5.7 Vérification SMS

`POST` `https://mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php`
en `URLSearchParams` (`action=envoyer_code|verifier_code`).

- bouton « Recevoir le code par SMS » sous le champ téléphone, champ code 6 chiffres ;
- renvoi désactivé avec compte à rebours de 120 s, synchronisé sur le délai renvoyé
  par une réponse 429 (`retry_after`, `retryAfter`, `delai`, `delai_restant`,
  `restant`, `remaining`, `seconds_remaining`, puis nombre extrait du message) ;
- messages API prioritaires sur les messages par défaut, JSON lu même en erreur HTTP
  (422, 404, 409, 410, 429, 502, réseau/CORS) ;
- après succès : `telephone_verifie=oui`, badge « ✓ Numéro vérifié », champ code masqué ;
- modification du numéro = réinitialisation de l'état vérifié ;
- l'envoi du lead est bloqué si le module est absent, si le numéro n'est pas vérifié
  ou si le numéro vérifié diffère du numéro saisi.

### 5.8 APIs de contrôle (console)

```js
lpLead.preview()             // payload CRM
lpLead.googleSheetPreview()  // payload Sheets
lpLead.status()              // état des dernières livraisons
lpTracking.inspect()         // tracking retenu après filtrage du consentement
smsVerification.estVerifie() // booléen
smsVerification.numeroVerifie()
```

---

## 6. Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| `outils/verifier.py` — 138 pages (lang, GTM + noscript + Consent Mode, H1 unique, messages, source, branchements, champs cachés, actifs locaux) | **138/138 conformes** |
| `node --check` sur tous les JS du parc | **293 fichiers, 0 erreur** |
| `outils/test-formulaires.mjs` — jsdom + vrai jQuery 3.7.1, chemin `$form.submit()` | **79 sites, 2 984 contrôles, 0 échec** |
| Actifs locaux (images, polices, CSS, JS) | 0 manquant |
| Service HTTP local des pages traitées | 200 sur pages, styles, bundles, handlers, images |

Scénarios couverts par le banc de test, sur chaque site traité :

1. refus de soumission sans vérification SMS (aucun appel CRM/Sheets) ;
2. envoi du code avec `action=envoyer_code` et numéro normalisé ;
3. code refusé (422) : message API, numéro non vérifié ;
4. code correct : `estVerifie()` vrai, `telephone_verifie=oui`, badge affiché ;
5. soumission par jQuery : CRM (bon `formId`, UUID, `telephone_verifie`), Sheets,
   confirmation affichée, événement GTM, click ID présent avec consentement marketing ;
6. réponse 429 : renvoi désactivé et délai restant affiché ;
7. réponse 410 : message d'expiration, numéro non vérifié ;
8. CRM et Sheets en échec : pas de faux « Merci », erreur visible, nouvel essai accepté ;
9. honeypot rempli : aucun envoi ;
10. sans consentement : aucun click ID, aucun UTM, source de secours propre ;
11. consentement complet : tracking et événement GTM enrichis ;
12. pages B_MAIL : envoi direct sans interface SMS, `formId` correct.

---

## 7. Ce qui ne peut PAS être garanti depuis le sandbox

1. **CRM HelloLead** : chaque `formId` du tableau §8 doit être créé/validé côté CRM.
2. **CORS de l'API SMS** : chaque origine publique de déploiement doit être autorisée,
   sinon la requête échouera chez le visiteur malgré des tests verts en local.
3. **SMS réel** : envoi, réception, expiration, usage unique, renvoi à 120 s.
4. **Google Sheets** : vérifier que l'Apps Script déployé accepte le POST et écrit les
   colonnes attendues (`outils/standard/Code.gs` fournit la référence).
5. **GTM** : mode Aperçu, consentement accordé, contrôle des variables et de `user_data`.
6. **Leads réels** : un lead de test par famille de formulaire, vérifié dans le CRM
   et dans la feuille.
7. **Rendu visuel** : aucune capture navigateur n'a été produite ; les corrections H1
   sont conçues pour être neutres visuellement, mais un contrôle visuel sur les pages
   où un H1 a été promu reste recommandé (liste dans `outils/application-resultat.json`).
8. **Wrapper iframe** : si l'iframe est repointée vers un domaine externe, ajouter
   son origine dans `allowedChildren` de `bridge.js` et autoriser l'origine du wrapper
   côté API SMS.

---

## 8. Identités CRM des pages traitées

| Site | `formId` | Source de secours | Sélecteurs |
|---|---|---|---:|
| `acces-internet-et-telephonie-pro` | `ADW_LP_ACCES_INTERNET_ET_TELEPHONIE_PRO` | `LP ACCES INTERNET ET TELEPHONIE PRO` | 1 |
| `assurance-agriculteur` | `ADW_LP_ASSURANCE_AGRICULTEUR` | `LP ASSURANCE AGRICULTEUR` | 1 |
| `assurance-assurance-professionnelle-iard-cookie` | `ADW_LP_ASSURANCE_ASSURANCE_PROFESSIONNELLE_IARD_COOKIE` | `LP ASSURANCE ASSURANCE PROFESSIONNELLE IARD COOKIE` | 1 |
| `assurance-commerce` | `ADW_LP_ASSURANCE_COMMERCE` | `LP ASSURANCE COMMERCE` | 1 |
| `assurance-consultants-societe-conseil` | `ADW_LP_ASSURANCE_CONSULTANTS_SOCIETE_CONSEIL` | `LP ASSURANCE CONSULTANTS SOCIETE CONSEIL` | 1 |
| `assurance-estheticienne-institut-beaute` | `ADW_LP_ASSURANCE_ESTHETICIENNE_INSTITUT_BEAUTE` | `LP ASSURANCE ESTHETICIENNE INSTITUT BEAUTE` | 1 |
| `assurance-estheticiennes-institut-beaute` | `ADW_LP_ASSURANCE_ESTHETICIENNES_INSTITUT_BEAUTE` | `LP ASSURANCE ESTHETICIENNES INSTITUT BEAUTE` | 1 |
| `assurance-estheticiennes-instituts-beaute-v1` | `ADW_LP_ASSURANCE_ESTHETICIENNES_INSTITUTS_BEAUTE_V1` | `LP ASSURANCE ESTHETICIENNES INSTITUTS BEAUTE V1` | 1 |
| `assurance-iard-v2` | `ADW_LP_ASSURANCE_IARD_V2` | `LP ASSURANCE IARD V2` | 1 |
| `assurance-marchandise` | `ADW_LP_ASSURANCE_MARCHANDISE` | `LP ASSURANCE MARCHANDISE` | 1 |
| `assurance-multirisques` | `ADW_LP_ASSURANCE_MULTIRISQUES` | `LP ASSURANCE MULTIRISQUES` | 1 |
| `assurance-professionnelle-iard` | `ADW_LP_ASSURANCE_PROFESSIONNELLE_IARD` | `LP ASSURANCE PROFESSIONNELLE IARD` | 1 |
| `assurance-professionnelle-tns-v2` | `ADW_LP_ASSURANCE_PROFESSIONNELLE_TNS_V2` | `LP ASSURANCE PROFESSIONNELLE TNS V2` | 1 |
| `assurance-protection-sociale-collective` | `ADW_LP_ASSURANCE_PROTECTION_SOCIALE_COLLECTIVE` | `LP ASSURANCE PROTECTION SOCIALE COLLECTIVE` | 1 |
| `assurance-rc-pro` | `ADW_LP_ASSURANCE_RC_PRO` | `LP ASSURANCE RC PRO` | 1 |
| `assurance-test-telephone` | `ADW_LP_ASSURANCE_TEST_TELEPHONE` | `LP ASSURANCE TEST TELEPHONE` | 1 |
| `assurance-tns` | `ADW_LP_ASSURANCE_TNS` | `LP ASSURANCE TNS` | 1 |
| `assurance-tns-pro-v2-adw` | `ADW_LP_ASSURANCE_TNS_PRO_V2_ADW` | `LP ASSURANCE TNS PRO V2 ADW` | 1 |
| `assurances-professionnelles` | `ADW_LP_ASSURANCES_PROFESSIONNELLES` | `LP ASSURANCES PROFESSIONNELLES` | 1 |
| `automobile` | `ADW_LP_AUTOMOBILE` | `LP AUTOMOBILE` | 1 |
| `ayvens-france` | `ADW_LP_AYVENS_FRANCE` | `LP AYVENS FRANCE` | 1 |
| `cartes-carburant` | `ADW_LP_CARTES_CARBURANT` | `LP CARTES CARBURANT` | 1 |
| `celebrez-le-noel-des-salaries-avec-kadeos` | `ADW_LP_CELEBREZ_LE_NOEL_DES_SALARIES_AVEC_KADEOS` | `LP CELEBREZ LE NOEL DES SALARIES AVEC KADEOS` | 1 |
| `complementaire-retraite-tns-v2` | `ADW_LP_COMPLEMENTAIRE_RETRAITE_TNS_V2` | `LP COMPLEMENTAIRE RETRAITE TNS V2` | 1 |
| `dacia-jogger` | `ADW_LP_DACIA_JOGGER` | `LP DACIA JOGGER` | 1 |
| `ecomobility` | `ADW_LP_ECOMOBILITY` | `LP ECOMOBILITY` | 1 |
| `edenred-kadeos` | `ADW_LP_EDENRED_KADEOS` | `LP EDENRED KADEOS` | 1 |
| `edenred-ticket-restaurant-juillet-v1` | `ADW_LP_EDENRED_TICKET_RESTAURANT_JUILLET_V1` | `LP EDENRED TICKET RESTAURANT JUILLET V1` | 1 |
| `energie` | `ADW_LP_ENERGIE` | `LP ENERGIE` | 1 |
| `fiat-pro` | `ADW_LP_FIAT_PRO` | `LP FIAT PRO` | 1 |
| `formulaire-globale` | `ADW_LP_FORMULAIRE_GLOBALE` | `LP FORMULAIRE GLOBALE` | 1 |
| `gamme-de-rayonnage-actiflip-hd` | `ADW_LP_GAMME_DE_RAYONNAGE_ACTIFLIP_HD` | `LP GAMME DE RAYONNAGE ACTIFLIP HD` | 1 |
| `gamme-de-rayonnage-actiflip-v4` | `ADW_LP_GAMME_DE_RAYONNAGE_ACTIFLIP_V4` | `LP GAMME DE RAYONNAGE ACTIFLIP V4` | 1 |
| `geolocalisation` | `ADW_LP_GEOLOCALISATION` | `LP GEOLOCALISATION` | 1 |
| `geolocalisation-de-flotte` | `ADW_LP_GEOLOCALISATION_DE_FLOTTE` | `LP GEOLOCALISATION DE FLOTTE` | 1 |
| `intuis` | `ADW_LP_INTUIS` | `LP INTUIS` | 1 |
| `lexus-lbx` | `ADW_LP_LEXUS_LBX` | `LP LEXUS LBX` | 1 |
| `lexus-lbx-2` | `ADW_LP_LEXUS_LBX_2` | `LP LEXUS LBX 2` | 2 |
| `mercedes-benz-mercedes-benz-evito` | `ADW_LP_MERCEDES_BENZ_MERCEDES_BENZ_EVITO` | `LP MERCEDES BENZ MERCEDES BENZ EVITO` | 1 |
| `mercedes-benz-nouvel-ecitan-fourgon` | `ADW_LP_MERCEDES_BENZ_NOUVEL_ECITAN_FOURGON` | `LP MERCEDES BENZ NOUVEL ECITAN FOURGON` | 1 |
| `mercedes-benz-sprinter` | `ADW_LP_MERCEDES_BENZ_SPRINTER` | `LP MERCEDES BENZ SPRINTER` | 1 |
| `nicolas-formly` | `ADW_LP_NICOLAS_FORMLY` | `LP NICOLAS FORMLY` | 1 |
| `nissan-ariya` | `ADW_LP_NISSAN_ARIYA` | `LP NISSAN ARIYA` | 1 |
| `nissan-juke` | `ADW_LP_NISSAN_JUKE` | `LP NISSAN JUKE` | 1 |
| `panneaux-photovoltaiques-energie-solaire` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES_ENERGIE_SOLAIRE` | `LP PANNEAUX PHOTOVOLTAIQUES ENERGIE SOLAIRE` | 1 |
| `paritel` | `ADW_LP_PARITEL` | `LP PARITEL` | 1 |
| `paritel-vous-rembourse` | `ADW_LP_PARITEL_VOUS_REMBOURSE` | `LP PARITEL VOUS REMBOURSE` | 1 |
| `primagaz` | `ADW_LP_PRIMAGAZ` | `LP PRIMAGAZ` | 1 |
| `primagaz-obtenez-votre-gaz-propane-a-prix-fixe` | `ADW_LP_PRIMAGAZ_OBTENEZ_VOTRE_GAZ_PROPANE_A_PRIX_FIXE` | `LP PRIMAGAZ OBTENEZ VOTRE GAZ PROPANE A PRIX FIXE` | 1 |
| `remerciement-carte-cadeau` | `ADW_LP_REMERCIEMENT_CARTE_CADEAU` | `LP REMERCIEMENT CARTE CADEAU` | 1 |
| `remerciement-panneaux-solaire` | `ADW_LP_REMERCIEMENT_PANNEAUX_SOLAIRE` | `LP REMERCIEMENT PANNEAUX SOLAIRE` | 1 |
| `remerciement-ticket-restaurant` | `ADW_LP_REMERCIEMENT_TICKET_RESTAURANT` | `LP REMERCIEMENT TICKET RESTAURANT` | 1 |
| `remerciement-ticket-restaurant-v2` | `ADW_LP_REMERCIEMENT_TICKET_RESTAURANT_V2` | `LP REMERCIEMENT TICKET RESTAURANT V2` | 1 |
| `remerciements-panneaux-solaires` | `ADW_LP_REMERCIEMENTS_PANNEAUX_SOLAIRES` | `LP REMERCIEMENTS PANNEAUX SOLAIRES` | 1 |
| `renault-capture` | `ADW_LP_RENAULT_CAPTURE` | `LP RENAULT CAPTURE` | 1 |
| `sage-gestion-de-la-paie-hd` | `ADW_LP_SAGE_GESTION_DE_LA_PAIE_HD` | `LP SAGE GESTION DE LA PAIE HD` | 1 |
| `sauvie-defibrillateurs-en-entreprise` | `ADW_LP_SAUVIE_DEFIBRILLATEURS_EN_ENTREPRISE` | `LP SAUVIE DEFIBRILLATEURS EN ENTREPRISE` | 1 |
| `securite-professionnels` | `ADW_LP_SECURITE_PROFESSIONNELS` | `LP SECURITE PROFESSIONNELS` | 1 |
| `still-manutention` | `ADW_LP_STILL_MANUTENTION` | `LP STILL MANUTENTION` | 1 |
| `suivi-de-vehicules` | `ADW_LP_SUIVI_DE_VEHICULES` | `LP SUIVI DE VEHICULES` | 1 |
| `temlpate-webflow-comparateur-2` | `ADW_LP_TEMLPATE_WEBFLOW_COMPARATEUR_2` | `LP TEMLPATE WEBFLOW COMPARATEUR 2` | 1 |
| `ticket-restaurant` | `ADW_LP_TICKET_RESTAURANT` | `LP TICKET RESTAURANT` | 1 |
| `ticket-restaurant-` | `ADW_LP_TICKET_RESTAURANT` | `LP TICKET RESTAURANT` | 1 |
| `ticket-restaurant-septembre` | `ADW_LP_TICKET_RESTAURANT_SEPTEMBRE` | `LP TICKET RESTAURANT SEPTEMBRE` | 1 |
| `ticket-restaurant-septembre-btp` | `ADW_LP_TICKET_RESTAURANT_SEPTEMBRE_BTP` | `LP TICKET RESTAURANT SEPTEMBRE BTP` | 1 |
| `tns-prevoyance-v2` | `ADW_LP_TNS_PREVOYANCE_V2` | `LP TNS PREVOYANCE V2` | 1 |
| `tns-prevoyance-v2-adw-test` | `ADW_LP_TNS_PREVOYANCE_V2_ADW_TEST` | `LP TNS PREVOYANCE V2 ADW TEST` | 1 |
| `too-good-to-go` | `ADW_LP_TOO_GOOD_TO_GO` | `LP TOO GOOD TO GO` | 1 |
| `toyota-gamme-hybride` | `ADW_LP_TOYOTA_GAMME_HYBRIDE` | `LP TOYOTA GAMME HYBRIDE` | 1 |
| `typ-formulaires-form-typ-vehicules` | `ADW_LP_TYP_FORMULAIRES_FORM_TYP_VEHICULES` | `LP TYP FORMULAIRES FORM TYP VEHICULES` | 1 |
| `typ-formulaires-typ-caisses-enregistreuse` | `ADW_LP_TYP_FORMULAIRES_TYP_CAISSES_ENREGISTREUSE` | `LP TYP FORMULAIRES TYP CAISSES ENREGISTREUSE` | 1 |
| `typ-formulaires-typ-energie-form` | `ADW_LP_TYP_FORMULAIRES_TYP_ENERGIE_FORM` | `LP TYP FORMULAIRES TYP ENERGIE FORM` | 1 |
| `typ-formulaires-typ-panneaux-form` | `ADW_LP_TYP_FORMULAIRES_TYP_PANNEAUX_FORM` | `LP TYP FORMULAIRES TYP PANNEAUX FORM` | 1 |
| `typ-formulaires-typ-secu-form` | `ADW_LP_TYP_FORMULAIRES_TYP_SECU_FORM` | `LP TYP FORMULAIRES TYP SECU FORM` | 1 |
| `une-rentree-sous-le-signe-du-pouvoir-d-achat` | `ADW_LP_UNE_RENTREE_SOUS_LE_SIGNE_DU_POUVOIR_D_ACHAT` | `LP UNE RENTREE SOUS LE SIGNE DU POUVOIR D ACHAT` | 1 |
| `vehicules-de-societe-hd` | `ADW_LP_VEHICULES_DE_SOCIETE_HD` | `LP VEHICULES DE SOCIETE HD` | 1 |
| `voiture-nouveau-range-rover` | `ADW_LP_VOITURE_NOUVEAU_RANGE_ROVER` | `LP VOITURE NOUVEAU RANGE ROVER` | 2 |
| `voiture-range-rover` | `ADW_LP_VOITURE_RANGE_ROVER` | `LP VOITURE RANGE ROVER` | 1 |
| `volvo` | `ADW_LP_VOLVO` | `LP VOLVO` | 2 |

Les 32 pages C_QUALIF et 27 pages PAGE ne transmettent aucun lead : elles n'ont pas
d'identité CRM propre. Toujours lire le `LP_CONFIG` réel de la page avant toute
création côté CRM.

---

## 9. Écarts assumés par rapport à la mémoire

1. **Aucun fichier `script.js` n'a été modifié.** La neutralisation est faite à
   l'exécution (`$(form).off('submit')` + capture). C'est plus sûr qu'une chirurgie
   dans des bundles de 1,5 Mo, et cela garde la possibilité de revenir en arrière.
2. **Le wrapper `.w-form` est conservé** (la mémoire le remplaçait par
   `form-autonome`). La classe porte le style de la page et les blocs
   `.w-form-done` / `.w-form-fail` réutilisés pour les messages : le handler
   neutralise le comportement Webflow sans casser la mise en page.
3. **Les 5 pages B_MAIL n'ont pas de vérification SMS** : leur champ téléphone est
   masqué (`type="hidden"`), il n'y a aucun numéro à vérifier. Aucun lead n'y est
   envoyé avec un numéro non vérifié, puisqu'aucun numéro n'est saisi.
4. **Les 32 pages C_QUALIF restent fonctionnellement inchangées** (règle de la
   mémoire, catégorie C).
5. **Les archives ZIP ne sont pas versionnées** : le parc pèse ~1 Go et dépasse la
   limite d'artefacts du dépôt. `outils/creer-zips.sh` génère les ZIP à la demande
   dans `livrables/` (ignoré par Git), site par site ou pour un site précis.
6. **`bridge.js` n'est actif qu'en iframe externe** : dans le parc, l'iframe est en
   même origine et la LP enfant gère elle-même SMS et livraisons.

---

## 10. Rejouer le standard

```bash
# 1. Audit (état courant ou état d'origine)
python3 outils/audit.py
python3 outils/audit.py --git          # diagnostic initial -> AUDIT-LP.md

# 2. Application du standard (idempotente)
python3 outils/appliquer.py --dry-run  # simulation, aucune écriture
python3 outils/appliquer.py            # application
python3 outils/appliquer.py --site assurance-tns

# 3. Contrôles
python3 outils/verifier.py             # conformité structurelle des 138 pages
npm install                            # jsdom + jquery@3.7.1 (une seule fois)
npm test                               # banc jsdom, 79 sites

# 4. Archives de livraison (non versionnées)
./outils/creer-zips.sh
```

Dépendances Python : `beautifulsoup4` + `lxml` (environnement virtuel conseillé).
Le banc de test **épingle `jquery@3.7.1`** : jQuery 4 casse `require('jquery')(window)`.

---

## 11. Livrables

| Fichier / dossier | Contenu |
|---|---|
| `outils/standard/lead-handler.js` | Gestionnaire de lead standard (source unique) |
| `outils/standard/verification-sms.js` | Module SMS standard |
| `outils/standard/Code.gs` | Apps Script de réception Google Sheets |
| `outils/audit.py`, `AUDIT-LP.md`, `outils/audit-lp.json` | Diagnostic du parc |
| `outils/appliquer.py`, `outils/application-resultat.json` | Application + journal des modifications |
| `outils/verifier.py`, `outils/verification-resultat.json` | Contrôle de conformité |
| `outils/test-formulaires.mjs` | Banc de test jsdom + jQuery |
| `outils/creer-zips.sh` | Génération des archives de livraison |
| `<site>/lead-handler.js`, `<site>/verification-sms.js` | Instances déployées |
| `<site>/docs/LIVRAISON-FONCTIONNELLE.md` | Documentation par LP (79 pages) |
