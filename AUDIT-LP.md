# Audit des landing pages — comparateur2

État **initial** (avant application du standard), reconstitué depuis le commit d'origine.

Total : **138** sites analysés.

| Catégorie | Nombre | Traitement |
|---|---:|---|
| A_TEL | 74 | Lead complet + vérification SMS |
| B_MAIL | 5 | Lead complet sans SMS (téléphone masqué ou absent) |
| C_QUALIF | 32 | Qualification seule, non interceptée |
| PAGE | 27 | Page sans formulaire de lead |

## Anomalies transversales

- `lang="en"` : **137** pages
- Aucun H1 : **129** pages ; plusieurs H1 : **4** pages
- Aucun conteneur GTM : **138** pages
- Pas de bloc `.w-form-done` : **24** pages

## Détail par site

| Site | Catégorie | Formulaires | Lead | Tél. | Consent. | GTM | lang | H1 |
|---|---|---:|---|---|---|---|---|---:|
| `acces-internet-et-telephonie-pro` | A_TEL | 1 | wf-form-Acc-s-internet-form | oui | oui | — | en | 1 |
| `acces-internet-et-telephonie-pro-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `accueil` | PAGE | 1 | — | non | non | — | en | 0 |
| `alfaromeo-tonale` | PAGE | 1 | — | non | non | — | en | 0 |
| `alfaromeo-tonale-remerciement` | PAGE | 0 | — | non | non | — | en | 0 |
| `assurance-agriculteur` | A_TEL | 2 | wf-form-assurance-agriculteur-formly | oui | oui | — | en | 1 |
| `assurance-agriculteur-v2` | PAGE | 0 | — | non | non | — | en | 9 |
| `assurance-assurance-professionnelle-iard-cookie` | A_TEL | 2 | wf-form-A-iard-666c16a1cf8ee5882cbb53f0 | oui | oui | — | en | 0 |
| `assurance-assurance-professionnelle-iard-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `assurance-commerce` | A_TEL | 1 | wf-form-assurance-commerce-adw | oui | oui | — | en | 0 |
| `assurance-consultant-societe-conseil-v2` | PAGE | 0 | — | non | non | — | en | 0 |
| `assurance-consultants-societe-conseil` | A_TEL | 2 | wf-form-Assurance-TNS-Pro-Form | oui | oui | — | en | 0 |
| `assurance-estheticienne-institut-beaute` | A_TEL | 2 | wf-form-Assurance-TNS-Pro-Form | oui | oui | — | en | 0 |
| `assurance-estheticiennes-institut-beaute` | A_TEL | 1 | leadForm | oui | oui | — | fr | 1 |
| `assurance-estheticiennes-instituts-beaute` | PAGE | 0 | — | non | non | — | en | 0 |
| `assurance-estheticiennes-instituts-beaute-v1` | A_TEL | 2 | wf-form-Assurance-TNS-Pro-Form | oui | oui | — | en | 0 |
| `assurance-iard-v2` | A_TEL | 2 | wf-form-A-iard-666c16a1cf8ee5882cbb53f0 | oui | oui | — | en | 17 |
| `assurance-marchandise` | A_TEL | 1 | wf-form-assurance-marchandise-formly | oui | oui | — | en | 0 |
| `assurance-multirisques` | A_TEL | 1 | wf-form-assurance-multirisque-adw-formly | oui | oui | — | en | 0 |
| `assurance-professionnelle-iard` | A_TEL | 2 | wf-form-A-iard-666c16a1cf8ee5882cbb53f0 | oui | oui | — | en | 0 |
| `assurance-professionnelle-tns-v2` | A_TEL | 1 | wf-form-Compl-mentaire-retraite-TNS-formly | oui | oui | — | en | 0 |
| `assurance-protection-sociale-collective` | A_TEL | 2 | wf-form-assurance-collective | oui | oui | — | en | 0 |
| `assurance-protection-sociale-collective-v4` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `assurance-rc-pro` | A_TEL | 1 | wf-form-assurance-rc-pro-formly | oui | oui | — | en | 0 |
| `assurance-test-telephone` | A_TEL | 1 | wf-form-A-iard-666c16a1cf8ee5882cbb53f0 | oui | oui | — | en | 0 |
| `assurance-tns` | A_TEL | 2 | wf-form-Assurance-TNS-Pro-Form | oui | oui | — | en | 9 |
| `assurance-tns-pro-v2-adw` | A_TEL | 2 | wf-form-Assurance-TNS-Pro-Form | oui | oui | — | en | 0 |
| `assurances-multirisques-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `assurances-professionnelles` | A_TEL | 1 | wf-form-Assurance-Form | oui | non | — | en | 0 |
| `automobile` | A_TEL | 2 | wf-form-Automobile | oui | oui | — | en | 0 |
| `ayvens-france` | A_TEL | 1 | wf-form-Ayvens-Form | oui | non | — | en | 0 |
| `canal` | PAGE | 2 | — | non | non | — | en | 0 |
| `cartes-carburant` | A_TEL | 1 | wf-form- | oui | non | — | en | 0 |
| `celebrez-le-noel-des-salaries-avec-kadeos` | A_TEL | 1 | wf-form-edenred_sous_la-rentree | oui | non | — | en | 0 |
| `complementaire-retraite-tns-v2` | A_TEL | 1 | wf-form-Compl-mentaire-retraite-TNS-formly | oui | oui | — | en | 0 |
| `dacia-jogger` | A_TEL | 1 | wf-form-Dacia_jogger_form | oui | non | — | en | 0 |
| `ecomobility` | A_TEL | 1 | wf-form-G-olocalisation-1 | oui | non | — | en | 0 |
| `edenred-kadeos` | A_TEL | 1 | wf-form-ticket-kadeos-septembre-form | oui | non | — | en | 0 |
| `edenred-restaurant-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `edenred-ticket-restaurant-juillet-v1` | A_TEL | 1 | wf-form-edenred_formulaire_ticket | oui | non | — | en | 0 |
| `edenred-titre-restaurant-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `edenred-typ` | PAGE | 0 | — | non | non | — | en | 0 |
| `energie` | A_TEL | 1 | wf-form-energie-form | oui | non | — | en | 0 |
| `energie-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `fiat-pro` | A_TEL | 1 | wf-form-Fiat-Pro-Form | oui | non | — | en | 0 |
| `form-panneaux-photovoltaiques` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `form-vehicules-utilitaires` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `formulaire` | PAGE | 0 | — | non | non | — | en | 0 |
| `formulaire-globale` | A_TEL | 1 | email-form | oui | non | — | en | 0 |
| `gamme-de-rayonnage-actiflip-hd` | A_TEL | 1 | wf-form-actiflip-formly | oui | oui | — | en | 0 |
| `gamme-de-rayonnage-actiflip-v4` | A_TEL | 1 | wf-form-actiflip-formly | oui | oui | — | en | 0 |
| `geo` | PAGE | 0 | — | non | non | — | en | 0 |
| `geolocalisation` | A_TEL | 1 | wf-form-G-olocalisation-1 | oui | non | — | en | 0 |
| `geolocalisation-de-flotte` | A_TEL | 1 | form-geoloc | oui | non | — | en | 0 |
| `geolocalisation-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `hyundai-kona-electric-nouvelle-generation` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `hyundai-tucson` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `intuis` | A_TEL | 1 | wf-form-Intuis-Form | oui | non | — | en | 0 |
| `lexus-lbx` | A_TEL | 1 | wf-form-Lexus_LBX_septembre | oui | non | — | en | 0 |
| `lexus-lbx-2` | A_TEL | 2 | wf-form-Lexus-LBX-Form, wf-form-Lexus-LBX-Form | oui | non | — | en | 0 |
| `mentions-legales` | PAGE | 0 | — | non | non | — | en | 0 |
| `mercedes-benz-mercedes-benz-evito` | A_TEL | 1 | wf-form--2 | oui | non | — | en | 0 |
| `mercedes-benz-nouvel-ecitan-fourgon` | A_TEL | 1 | wf-form-ecitan-form | oui | non | — | en | 0 |
| `mercedes-benz-sprinter` | A_TEL | 1 | wf-form-Mercedes-Benz-SPRINTER-Form | oui | non | — | en | 0 |
| `mercedes-vous-remercie` | PAGE | 0 | — | non | non | — | en | 0 |
| `mitsubishi-fuso` | PAGE | 1 | — | oui | non | — | en | 0 |
| `mitsubishi-fuso-remerciement` | PAGE | 0 | — | non | non | — | en | 0 |
| `nettoyage-locaux-professionnels` | PAGE | 0 | — | non | non | — | en | 0 |
| `nicolas-ayvens` | PAGE | 0 | — | non | non | — | en | 0 |
| `nicolas-form-test` | PAGE | 1 | — | non | non | — | en | 0 |
| `nicolas-formly` | A_TEL | 1 | wf-form-Acc-s-internet-form | oui | oui | — | en | 0 |
| `nissan-ariya` | A_TEL | 1 | wf-form-gamme-hybride-Form | oui | non | — | en | 0 |
| `nissan-juke` | A_TEL | 1 | email-form | oui | non | — | en | 0 |
| `panneaux-photovoltaiques-energie-solaire` | A_TEL | 1 | wf-form-panneaux-passer-a-l-energie | oui | oui | — | en | 0 |
| `panneaux-photovoltaiques-panneaux-photovoltaique-valider` | PAGE | 0 | — | non | non | — | en | 0 |
| `paritel` | A_TEL | 1 | wf-form-Paritel-form | oui | non | — | en | 0 |
| `paritel-typ` | PAGE | 0 | — | non | non | — | en | 0 |
| `paritel-vous-rembourse` | A_TEL | 1 | wf-form-Paritel-fibre-form | oui | non | — | en | 0 |
| `paritel-vous-rembourse-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `politique-de-confidentialite-donnees-personnelles` | PAGE | 0 | — | non | non | — | en | 0 |
| `primagaz` | A_TEL | 1 | wf-form-primagaz-propane-form | oui | non | — | en | 0 |
| `primagaz-obtenez-votre-gaz-propane-a-prix-fixe` | A_TEL | 1 | wf-form-Primagaz-Form | oui | non | — | en | 0 |
| `primagaz-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `radius-remerciement` | PAGE | 0 | — | non | non | — | en | 0 |
| `radius-telematics-typ` | PAGE | 0 | — | non | non | — | en | 0 |
| `rc-pro-consultant-conseil-adw` | C_QUALIF | 1 | — | non | non | — | en | 1 |
| `remerciement-carte-cadeau` | B_MAIL | 1 | wf-form-edenred_formulaire_ticket | oui | non | — | en | 0 |
| `remerciement-panneaux-solaire` | B_MAIL | 1 | wf-form-solaire-form-typ | oui | non | — | en | 0 |
| `remerciement-ticket-restaurant` | B_MAIL | 1 | wf-form-titres-restaurant-form-typ | oui | non | — | en | 0 |
| `remerciement-ticket-restaurant-v2` | B_MAIL | 1 | wf-form-TR_form_typ | oui | non | — | en | 0 |
| `remerciements-panneaux-solaires` | B_MAIL | 1 | wf-form-solaire-form-typ-comparateur | oui | non | — | en | 0 |
| `renault-capture` | A_TEL | 1 | wf-form-Dacia_jogger_form | oui | non | — | en | 0 |
| `sage-gestion-de-la-paie-hd` | A_TEL | 1 | wf-form-Sage-Form | oui | non | — | en | 0 |
| `sage-gestion-de-la-paie-hd-v4` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `sauvie-defibrillateurs-en-entreprise` | A_TEL | 1 | wf-form-Sauvie-Form | oui | non | — | en | 0 |
| `securite-pro-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `securite-professionnels` | A_TEL | 1 | wf-form-Securite_Form_ubepro | oui | non | — | en | 0 |
| `site` | PAGE | 0 | — | non | non | — | en | 0 |
| `solutions-cles` | PAGE | 0 | — | non | non | — | en | 4 |
| `solutions-industrielles-cles-en-main` | PAGE | 0 | — | non | non | — | en | 0 |
| `still-manutention` | A_TEL | 1 | wf-form-Still-Manutention-Form | oui | non | — | en | 0 |
| `suivi-de-vehicules` | A_TEL | 1 | wf-form-Radius-G-oloc | oui | non | — | en | 0 |
| `temlpate-webflow-comparateur-2` | A_TEL | 1 | email-form | oui | non | — | en | 0 |
| `temlpate-webflow-comparateur-3` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `temlpate-webflow-comparateur-4` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `template-2` | C_QUALIF | 1 | — | non | non | — | en | 1 |
| `ticket-restaurant` | A_TEL | 1 | wf-form-edenred_formulaire_ticket | oui | non | — | en | 0 |
| `ticket-restaurant-` | A_TEL | 1 | wf-form-edenred_formulaire_ticket | oui | non | — | en | 0 |
| `ticket-restaurant-septembre` | A_TEL | 1 | wf-form-edenred_formulaire_ticket | oui | non | — | en | 0 |
| `ticket-restaurant-septembre-btp` | A_TEL | 1 | wf-form-edenred_formulaire_ticket-btp | oui | non | — | en | 0 |
| `ticket-restaurant-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `tns-prevoyance-v2` | A_TEL | 1 | wf-form-Compl-mentaire-retraite-TNS-formly | oui | oui | — | en | 0 |
| `tns-prevoyance-v2-adw-test` | A_TEL | 1 | wf-form-Compl-mentaire-retraite-TNS-formly-test | oui | oui | — | en | 0 |
| `too-good-to-go` | A_TEL | 1 | wf-form-too-good-to-go-Form | oui | non | — | en | 0 |
| `toyota-gamme-hybride` | A_TEL | 1 | wf-form-gamme-hybride-Form | oui | non | — | en | 0 |
| `typ-categ` | PAGE | 0 | — | non | non | — | en | 0 |
| `typ-categories` | PAGE | 0 | — | non | non | — | en | 0 |
| `typ-energie` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-caisses-thank-you-page` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-energie-thank-you-page` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-form-typ-vehicules` | A_TEL | 1 | wf-form-voiture-professionnel-form | oui | oui | — | en | 0 |
| `typ-formulaires-panneaux-photovoltaiques` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-panneaux-thank-you-page` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-securite-thank-you-page` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-typ-caisses-enregistreuse` | A_TEL | 1 | wf-form-Caisse-Form | oui | oui | — | en | 0 |
| `typ-formulaires-typ-energie-form` | A_TEL | 1 | wf-form-energie-form | oui | oui | — | en | 0 |
| `typ-formulaires-typ-log-entreprise` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-formulaires-typ-panneaux-form` | A_TEL | 1 | wf-form-panneaux-passer-a-l-energie | oui | oui | — | en | 0 |
| `typ-formulaires-typ-secu-form` | A_TEL | 1 | wf-form-securite-ubepro-form | oui | oui | — | en | 0 |
| `typ-formulaires-vehicules-thank-you-page` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `typ-ticket-restaurant` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `une-rentree-sous-le-signe-du-pouvoir-d-achat` | A_TEL | 1 | wf-form-edenred_sous_la-rentree | oui | non | — | en | 0 |
| `vehicules-de-societe-hd` | A_TEL | 1 | wf-form-voiture-professionnel-form | oui | oui | — | en | 0 |
| `vehicules-professionnel-v2` | C_QUALIF | 1 | — | non | non | — | en | 0 |
| `voiture-nouveau-range-rover` | A_TEL | 2 | wf-form-, wf-form- | oui | non | — | en | 0 |
| `voiture-range-rover` | A_TEL | 1 | wf-form- | oui | non | — | en | 0 |
| `volvo` | A_TEL | 2 | wf-form-Volvo-Form, wf-form-Volvo-Form | oui | non | — | en | 0 |
| `webflow-template-1` | C_QUALIF | 1 | — | non | non | — | en | 0 |
