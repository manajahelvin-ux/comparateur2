# Inventaire des landing pages et de leur `formId`

**Dépôt :** `manajahelvin-ux/comparateur2`  
**Branche :** `arena/34162124-comparateur2`  
**Date de relevé :** 9 novembre 2026  
**Méthode :** lecture du bloc `window.LP_CONFIG` de chaque `*/index.html` (valeur réellement utilisée à l'exécution par `lead-handler.js`), recoupée avec `outils/application-resultat.json`.

**Périmètre :** 138 pages `*/index.html` présentes à la racine du dépôt.

## Synthèse

| Mesure | Valeur |
|---|---|
| Pages avec un `formId` actif (`LP_CONFIG`) | **79** |
| Pages sans `formId` | **59** |
| dont pages de qualification `C_QUALIF` sans gestionnaire de leads | 32 |
| dont pages secondaires / légales / remerciement (`PAGE`) | 27 |
| Conformité à la convention de nommage | 79/79 |
| `formId` en doublon | 1 : `ADW_LP_TICKET_RESTAURANT` (`ticket-restaurant` et `ticket-restaurant-`) |

> **Convention constatée :** `formId = "ADW_LP_" + slug.toUpperCase()`, tout caractère non alphanumérique remplacé par `_`. Aucune page équipée ne déroge à cette règle.

## 1. Pages avec `formId` actif (79)

| # | Landing page (`slug`) | `formId` | Catégorie |
|---|---|---|---|
| 1 | `acces-internet-et-telephonie-pro` | `ADW_LP_ACCES_INTERNET_ET_TELEPHONIE_PRO` | A_TEL |
| 2 | `assurance-agriculteur` | `ADW_LP_ASSURANCE_AGRICULTEUR` | A_TEL |
| 3 | `assurance-assurance-professionnelle-iard-cookie` | `ADW_LP_ASSURANCE_ASSURANCE_PROFESSIONNELLE_IARD_COOKIE` | A_TEL |
| 4 | `assurance-commerce` | `ADW_LP_ASSURANCE_COMMERCE` | A_TEL |
| 5 | `assurance-consultants-societe-conseil` | `ADW_LP_ASSURANCE_CONSULTANTS_SOCIETE_CONSEIL` | A_TEL |
| 6 | `assurance-estheticienne-institut-beaute` | `ADW_LP_ASSURANCE_ESTHETICIENNE_INSTITUT_BEAUTE` | A_TEL |
| 7 | `assurance-estheticiennes-institut-beaute` | `ADW_LP_ASSURANCE_ESTHETICIENNES_INSTITUT_BEAUTE` | A_TEL |
| 8 | `assurance-estheticiennes-instituts-beaute-v1` | `ADW_LP_ASSURANCE_ESTHETICIENNES_INSTITUTS_BEAUTE_V1` | A_TEL |
| 9 | `assurance-iard-v2` | `ADW_LP_ASSURANCE_IARD_V2` | A_TEL |
| 10 | `assurance-marchandise` | `ADW_LP_ASSURANCE_MARCHANDISE` | A_TEL |
| 11 | `assurance-multirisques` | `ADW_LP_ASSURANCE_MULTIRISQUES` | A_TEL |
| 12 | `assurance-professionnelle-iard` | `ADW_LP_ASSURANCE_PROFESSIONNELLE_IARD` | A_TEL |
| 13 | `assurance-professionnelle-tns-v2` | `ADW_LP_ASSURANCE_PROFESSIONNELLE_TNS_V2` | A_TEL |
| 14 | `assurance-protection-sociale-collective` | `ADW_LP_ASSURANCE_PROTECTION_SOCIALE_COLLECTIVE` | A_TEL |
| 15 | `assurance-rc-pro` | `ADW_LP_ASSURANCE_RC_PRO` | A_TEL |
| 16 | `assurance-test-telephone` | `ADW_LP_ASSURANCE_TEST_TELEPHONE` | A_TEL |
| 17 | `assurance-tns` | `ADW_LP_ASSURANCE_TNS` | A_TEL |
| 18 | `assurance-tns-pro-v2-adw` | `ADW_LP_ASSURANCE_TNS_PRO_V2_ADW` | A_TEL |
| 19 | `assurances-professionnelles` | `ADW_LP_ASSURANCES_PROFESSIONNELLES` | A_TEL |
| 20 | `automobile` | `ADW_LP_AUTOMOBILE` | A_TEL |
| 21 | `ayvens-france` | `ADW_LP_AYVENS_FRANCE` | A_TEL |
| 22 | `cartes-carburant` | `ADW_LP_CARTES_CARBURANT` | A_TEL |
| 23 | `celebrez-le-noel-des-salaries-avec-kadeos` | `ADW_LP_CELEBREZ_LE_NOEL_DES_SALARIES_AVEC_KADEOS` | A_TEL |
| 24 | `complementaire-retraite-tns-v2` | `ADW_LP_COMPLEMENTAIRE_RETRAITE_TNS_V2` | A_TEL |
| 25 | `dacia-jogger` | `ADW_LP_DACIA_JOGGER` | A_TEL |
| 26 | `ecomobility` | `ADW_LP_ECOMOBILITY` | A_TEL |
| 27 | `edenred-kadeos` | `ADW_LP_EDENRED_KADEOS` | A_TEL |
| 28 | `edenred-ticket-restaurant-juillet-v1` | `ADW_LP_EDENRED_TICKET_RESTAURANT_JUILLET_V1` | A_TEL |
| 29 | `energie` | `ADW_LP_ENERGIE` | A_TEL |
| 30 | `fiat-pro` | `ADW_LP_FIAT_PRO` | A_TEL |
| 31 | `formulaire-globale` | `ADW_LP_FORMULAIRE_GLOBALE` | A_TEL |
| 32 | `gamme-de-rayonnage-actiflip-hd` | `ADW_LP_GAMME_DE_RAYONNAGE_ACTIFLIP_HD` | A_TEL |
| 33 | `gamme-de-rayonnage-actiflip-v4` | `ADW_LP_GAMME_DE_RAYONNAGE_ACTIFLIP_V4` | A_TEL |
| 34 | `geolocalisation` | `ADW_LP_GEOLOCALISATION` | A_TEL |
| 35 | `geolocalisation-de-flotte` | `ADW_LP_GEOLOCALISATION_DE_FLOTTE` | A_TEL |
| 36 | `intuis` | `ADW_LP_INTUIS` | A_TEL |
| 37 | `lexus-lbx` | `ADW_LP_LEXUS_LBX` | A_TEL |
| 38 | `lexus-lbx-2` | `ADW_LP_LEXUS_LBX_2` | A_TEL |
| 39 | `mercedes-benz-mercedes-benz-evito` | `ADW_LP_MERCEDES_BENZ_MERCEDES_BENZ_EVITO` | A_TEL |
| 40 | `mercedes-benz-nouvel-ecitan-fourgon` | `ADW_LP_MERCEDES_BENZ_NOUVEL_ECITAN_FOURGON` | A_TEL |
| 41 | `mercedes-benz-sprinter` | `ADW_LP_MERCEDES_BENZ_SPRINTER` | A_TEL |
| 42 | `nicolas-formly` | `ADW_LP_NICOLAS_FORMLY` | A_TEL |
| 43 | `nissan-ariya` | `ADW_LP_NISSAN_ARIYA` | A_TEL |
| 44 | `nissan-juke` | `ADW_LP_NISSAN_JUKE` | A_TEL |
| 45 | `panneaux-photovoltaiques-energie-solaire` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES_ENERGIE_SOLAIRE` | A_TEL |
| 46 | `paritel` | `ADW_LP_PARITEL` | A_TEL |
| 47 | `paritel-vous-rembourse` | `ADW_LP_PARITEL_VOUS_REMBOURSE` | A_TEL |
| 48 | `primagaz` | `ADW_LP_PRIMAGAZ` | A_TEL |
| 49 | `primagaz-obtenez-votre-gaz-propane-a-prix-fixe` | `ADW_LP_PRIMAGAZ_OBTENEZ_VOTRE_GAZ_PROPANE_A_PRIX_FIXE` | A_TEL |
| 50 | `remerciement-carte-cadeau` | `ADW_LP_REMERCIEMENT_CARTE_CADEAU` | B_MAIL |
| 51 | `remerciement-panneaux-solaire` | `ADW_LP_REMERCIEMENT_PANNEAUX_SOLAIRE` | B_MAIL |
| 52 | `remerciement-ticket-restaurant` | `ADW_LP_REMERCIEMENT_TICKET_RESTAURANT` | B_MAIL |
| 53 | `remerciement-ticket-restaurant-v2` | `ADW_LP_REMERCIEMENT_TICKET_RESTAURANT_V2` | B_MAIL |
| 54 | `remerciements-panneaux-solaires` | `ADW_LP_REMERCIEMENTS_PANNEAUX_SOLAIRES` | B_MAIL |
| 55 | `renault-capture` | `ADW_LP_RENAULT_CAPTURE` | A_TEL |
| 56 | `sage-gestion-de-la-paie-hd` | `ADW_LP_SAGE_GESTION_DE_LA_PAIE_HD` | A_TEL |
| 57 | `sauvie-defibrillateurs-en-entreprise` | `ADW_LP_SAUVIE_DEFIBRILLATEURS_EN_ENTREPRISE` | A_TEL |
| 58 | `securite-professionnels` | `ADW_LP_SECURITE_PROFESSIONNELS` | A_TEL |
| 59 | `still-manutention` | `ADW_LP_STILL_MANUTENTION` | A_TEL |
| 60 | `suivi-de-vehicules` | `ADW_LP_SUIVI_DE_VEHICULES` | A_TEL |
| 61 | `temlpate-webflow-comparateur-2` | `ADW_LP_TEMLPATE_WEBFLOW_COMPARATEUR_2` | A_TEL |
| 62 | `ticket-restaurant` | `ADW_LP_TICKET_RESTAURANT` | A_TEL |
| 63 | `ticket-restaurant-` | `ADW_LP_TICKET_RESTAURANT` | A_TEL |
| 64 | `ticket-restaurant-septembre` | `ADW_LP_TICKET_RESTAURANT_SEPTEMBRE` | A_TEL |
| 65 | `ticket-restaurant-septembre-btp` | `ADW_LP_TICKET_RESTAURANT_SEPTEMBRE_BTP` | A_TEL |
| 66 | `tns-prevoyance-v2` | `ADW_LP_TNS_PREVOYANCE_V2` | A_TEL |
| 67 | `tns-prevoyance-v2-adw-test` | `ADW_LP_TNS_PREVOYANCE_V2_ADW_TEST` | A_TEL |
| 68 | `too-good-to-go` | `ADW_LP_TOO_GOOD_TO_GO` | A_TEL |
| 69 | `toyota-gamme-hybride` | `ADW_LP_TOYOTA_GAMME_HYBRIDE` | A_TEL |
| 70 | `typ-formulaires-form-typ-vehicules` | `ADW_LP_TYP_FORMULAIRES_FORM_TYP_VEHICULES` | A_TEL |
| 71 | `typ-formulaires-typ-caisses-enregistreuse` | `ADW_LP_TYP_FORMULAIRES_TYP_CAISSES_ENREGISTREUSE` | A_TEL |
| 72 | `typ-formulaires-typ-energie-form` | `ADW_LP_TYP_FORMULAIRES_TYP_ENERGIE_FORM` | A_TEL |
| 73 | `typ-formulaires-typ-panneaux-form` | `ADW_LP_TYP_FORMULAIRES_TYP_PANNEAUX_FORM` | A_TEL |
| 74 | `typ-formulaires-typ-secu-form` | `ADW_LP_TYP_FORMULAIRES_TYP_SECU_FORM` | A_TEL |
| 75 | `une-rentree-sous-le-signe-du-pouvoir-d-achat` | `ADW_LP_UNE_RENTREE_SOUS_LE_SIGNE_DU_POUVOIR_D_ACHAT` | A_TEL |
| 76 | `vehicules-de-societe-hd` | `ADW_LP_VEHICULES_DE_SOCIETE_HD` | A_TEL |
| 77 | `voiture-nouveau-range-rover` | `ADW_LP_VOITURE_NOUVEAU_RANGE_ROVER` | A_TEL |
| 78 | `voiture-range-rover` | `ADW_LP_VOITURE_RANGE_ROVER` | A_TEL |
| 79 | `volvo` | `ADW_LP_VOLVO` | A_TEL |

## 2. Pages sans `formId` (59)

Ces pages ne chargent pas `LP_CONFIG` / `lead-handler.js` : aucun lead n'est transmis au CRM. La colonne « `formId` attendu » donne la valeur qu'appliquerait la convention si la page était équipée.

| # | Landing page (`slug`) | `formId` attendu | Catégorie | Nature |
|---|---|---|---|---|
| 1 | `acces-internet-et-telephonie-pro-v2` | `ADW_LP_ACCES_INTERNET_ET_TELEPHONIE_PRO_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 2 | `accueil` | `ADW_LP_ACCUEIL` | PAGE | Page secondaire / template |
| 3 | `alfaromeo-tonale` | `ADW_LP_ALFAROMEO_TONALE` | PAGE | Page secondaire / template |
| 4 | `alfaromeo-tonale-remerciement` | `ADW_LP_ALFAROMEO_TONALE_REMERCIEMENT` | PAGE | Page de remerciement |
| 5 | `assurance-agriculteur-v2` | `ADW_LP_ASSURANCE_AGRICULTEUR_V2` | PAGE | Page secondaire / template |
| 6 | `assurance-assurance-professionnelle-iard-v2` | `ADW_LP_ASSURANCE_ASSURANCE_PROFESSIONNELLE_IARD_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 7 | `assurance-consultant-societe-conseil-v2` | `ADW_LP_ASSURANCE_CONSULTANT_SOCIETE_CONSEIL_V2` | PAGE | Page secondaire / template |
| 8 | `assurance-estheticiennes-instituts-beaute` | `ADW_LP_ASSURANCE_ESTHETICIENNES_INSTITUTS_BEAUTE` | PAGE | Page secondaire / template |
| 9 | `assurance-protection-sociale-collective-v4` | `ADW_LP_ASSURANCE_PROTECTION_SOCIALE_COLLECTIVE_V4` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 10 | `assurances-multirisques-v2` | `ADW_LP_ASSURANCES_MULTIRISQUES_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 11 | `canal` | `ADW_LP_CANAL` | PAGE | Page secondaire / template |
| 12 | `edenred-restaurant-v2` | `ADW_LP_EDENRED_RESTAURANT_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 13 | `edenred-titre-restaurant-v2` | `ADW_LP_EDENRED_TITRE_RESTAURANT_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 14 | `edenred-typ` | `ADW_LP_EDENRED_TYP` | PAGE | Page secondaire / template |
| 15 | `energie-v2` | `ADW_LP_ENERGIE_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 16 | `form-panneaux-photovoltaiques` | `ADW_LP_FORM_PANNEAUX_PHOTOVOLTAIQUES` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 17 | `form-vehicules-utilitaires` | `ADW_LP_FORM_VEHICULES_UTILITAIRES` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 18 | `formulaire` | `ADW_LP_FORMULAIRE` | PAGE | Page secondaire / template |
| 19 | `geo` | `ADW_LP_GEO` | PAGE | Page secondaire / template |
| 20 | `geolocalisation-v2` | `ADW_LP_GEOLOCALISATION_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 21 | `hyundai-kona-electric-nouvelle-generation` | `ADW_LP_HYUNDAI_KONA_ELECTRIC_NOUVELLE_GENERATION` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 22 | `hyundai-tucson` | `ADW_LP_HYUNDAI_TUCSON` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 23 | `mentions-legales` | `ADW_LP_MENTIONS_LEGALES` | PAGE | Page légale |
| 24 | `mercedes-vous-remercie` | `ADW_LP_MERCEDES_VOUS_REMERCIE` | PAGE | Page de remerciement |
| 25 | `mitsubishi-fuso` | `ADW_LP_MITSUBISHI_FUSO` | PAGE | Page secondaire / template |
| 26 | `mitsubishi-fuso-remerciement` | `ADW_LP_MITSUBISHI_FUSO_REMERCIEMENT` | PAGE | Page de remerciement |
| 27 | `nettoyage-locaux-professionnels` | `ADW_LP_NETTOYAGE_LOCAUX_PROFESSIONNELS` | PAGE | Page secondaire / template |
| 28 | `nicolas-ayvens` | `ADW_LP_NICOLAS_AYVENS` | PAGE | Page secondaire / template |
| 29 | `nicolas-form-test` | `ADW_LP_NICOLAS_FORM_TEST` | PAGE | Page secondaire / template |
| 30 | `panneaux-photovoltaiques-panneaux-photovoltaique-valider` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES_PANNEAUX_PHOTOVOLTAIQUE_VALIDER` | PAGE | Page secondaire / template |
| 31 | `paritel-typ` | `ADW_LP_PARITEL_TYP` | PAGE | Page secondaire / template |
| 32 | `paritel-vous-rembourse-v2` | `ADW_LP_PARITEL_VOUS_REMBOURSE_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 33 | `politique-de-confidentialite-donnees-personnelles` | `ADW_LP_POLITIQUE_DE_CONFIDENTIALITE_DONNEES_PERSONNELLES` | PAGE | Page légale |
| 34 | `primagaz-v2` | `ADW_LP_PRIMAGAZ_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 35 | `radius-remerciement` | `ADW_LP_RADIUS_REMERCIEMENT` | PAGE | Page de remerciement |
| 36 | `radius-telematics-typ` | `ADW_LP_RADIUS_TELEMATICS_TYP` | PAGE | Page secondaire / template |
| 37 | `rc-pro-consultant-conseil-adw` | `ADW_LP_RC_PRO_CONSULTANT_CONSEIL_ADW` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 38 | `sage-gestion-de-la-paie-hd-v4` | `ADW_LP_SAGE_GESTION_DE_LA_PAIE_HD_V4` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 39 | `securite-pro-v2` | `ADW_LP_SECURITE_PRO_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 40 | `site` | `ADW_LP_SITE` | PAGE | Page secondaire / template |
| 41 | `solutions-cles` | `ADW_LP_SOLUTIONS_CLES` | PAGE | Page secondaire / template |
| 42 | `solutions-industrielles-cles-en-main` | `ADW_LP_SOLUTIONS_INDUSTRIELLES_CLES_EN_MAIN` | PAGE | Page secondaire / template |
| 43 | `temlpate-webflow-comparateur-3` | `ADW_LP_TEMLPATE_WEBFLOW_COMPARATEUR_3` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 44 | `temlpate-webflow-comparateur-4` | `ADW_LP_TEMLPATE_WEBFLOW_COMPARATEUR_4` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 45 | `template-2` | `ADW_LP_TEMPLATE_2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 46 | `ticket-restaurant-v2` | `ADW_LP_TICKET_RESTAURANT_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 47 | `typ-categ` | `ADW_LP_TYP_CATEG` | PAGE | Page secondaire / template |
| 48 | `typ-categories` | `ADW_LP_TYP_CATEGORIES` | PAGE | Page secondaire / template |
| 49 | `typ-energie` | `ADW_LP_TYP_ENERGIE` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 50 | `typ-formulaires-caisses-thank-you-page` | `ADW_LP_TYP_FORMULAIRES_CAISSES_THANK_YOU_PAGE` | C_QUALIF | Page de remerciement |
| 51 | `typ-formulaires-energie-thank-you-page` | `ADW_LP_TYP_FORMULAIRES_ENERGIE_THANK_YOU_PAGE` | C_QUALIF | Page de remerciement |
| 52 | `typ-formulaires-panneaux-photovoltaiques` | `ADW_LP_TYP_FORMULAIRES_PANNEAUX_PHOTOVOLTAIQUES` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 53 | `typ-formulaires-panneaux-thank-you-page` | `ADW_LP_TYP_FORMULAIRES_PANNEAUX_THANK_YOU_PAGE` | C_QUALIF | Page de remerciement |
| 54 | `typ-formulaires-securite-thank-you-page` | `ADW_LP_TYP_FORMULAIRES_SECURITE_THANK_YOU_PAGE` | C_QUALIF | Page de remerciement |
| 55 | `typ-formulaires-typ-log-entreprise` | `ADW_LP_TYP_FORMULAIRES_TYP_LOG_ENTREPRISE` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 56 | `typ-formulaires-vehicules-thank-you-page` | `ADW_LP_TYP_FORMULAIRES_VEHICULES_THANK_YOU_PAGE` | C_QUALIF | Page de remerciement |
| 57 | `typ-ticket-restaurant` | `ADW_LP_TYP_TICKET_RESTAURANT` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 58 | `vehicules-professionnel-v2` | `ADW_LP_VEHICULES_PROFESSIONNEL_V2` | C_QUALIF | Formulaire de qualification — **non instrumenté** |
| 59 | `webflow-template-1` | `ADW_LP_WEBFLOW_TEMPLATE_1` | C_QUALIF | Formulaire de qualification — **non instrumenté** |

## 3. Points d'attention

1. **Doublon** : `ticket-restaurant` et `ticket-restaurant-` utilisent tous deux `ADW_LP_TICKET_RESTAURANT`. Côté CRM, seul le champ `site`/`source` permet de les distinguer ; il faut renommer l'un des deux si un suivi séparé est nécessaire.
2. **32 pages `C_QUALIF` sans `formId`** : ce sont des LP de qualification qui n'envoient aujourd'hui aucun lead (ex. `assurance-protection-sociale-collective-v4`, `securite-pro-v2`, `ticket-restaurant-v2`, `hyundai-tucson`, `primagaz-v2`…).
3. **Pages de remerciement déjà instrumentées** (5 pages `B_MAIL` : `remerciement-*`) : elles portent un `formId` alors qu'elles ne devraient pas re-collecter de lead — à confirmer fonctionnellement.
4. Les `formId` du dépôt ne correspondent pas toujours aux intitulés du CRM : cf. `ADW_LP_ASSURANCE_TNS_PRO_V2_ADW` et `ADW_LP_ASSURANCE_PROTECTION_SOCIALE_COLLECTIVE`, plus longs que les codes `ADW_LP_ASSURANCE_TNS_PRO` / `ADW_LP_PROTECTION_SOCIALE_COLLECTIVE`.
