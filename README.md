# comparateur2 — parc de landing pages

Ce dépôt contient **138 landing pages** exportées de Webflow (une par dossier,
chacune avec son `index.html`, son `style.css`, son bundle `script.js`, ses images
et ses polices).

Le standard fonctionnel décrit dans `MEMOIRE-SESSION-CONTINUATION.md`
(projet PorojetMigration) a été **vérifié, corrigé et appliqué** sur l'ensemble du
parc : formulaires autonomes, double livraison CRM + Google Sheets, confirmation
réelle, validations, honeypot, tracking filtré par consentement, GTM et
vérification du mobile par SMS.

👉 **Documentation complète : [`RAPPORT-APPLICATION-MEMOIRE.md`](RAPPORT-APPLICATION-MEMOIRE.md)**
👉 **Diagnostic initial du parc : [`AUDIT-LP.md`](AUDIT-LP.md)**

---

## Catégories de pages

| Catégorie | Sites | Traitement |
|---|---:|---|
| A_TEL | 74 | Gestionnaire de lead autonome + vérification SMS |
| B_MAIL | 5 | Gestionnaire de lead autonome, sans SMS (téléphone masqué) |
| C_QUALIF | 32 | Qualification seule, non interceptée (tunnel en deux temps) |
| PAGE | 27 | Contenu, TYP, mentions légales, remerciement |

## Ce que fait une page de formulaire traitée

1. La soumission Webflow est neutralisée ; `lead-handler.js` prend la main, y
   compris quand Formly envoie via jQuery `$form.submit()`.
2. Le mobile est vérifié par SMS (`verification-sms.js`) ; sans vérification,
   aucun envoi.
3. Le lead part **en parallèle** vers le CRM HelloLead et Google Sheets.
4. La confirmation n'apparaît que si au moins une livraison a réussi ; sinon un
   message d'erreur clair reste affiché et le visiteur peut réessayer.
5. GTM reçoit `formulaire_lead` (ou `formulaire_micro_entrepreneur`) avec le
   tracking autorisé par le consentement.

Chaque page traitée est documentée dans `<site>/docs/LIVRAISON-FONCTIONNELLE.md`
avec son `formId` CRM et sa source de secours.

## Tester localement

```bash
./tester-local.sh            # http://localhost:8080
```

Les pages sont statiques : n'importe quel serveur HTTP convient.

## Outils

```bash
python3 outils/audit.py             # audit du parc -> outils/audit-lp.json + AUDIT-LP.md
python3 outils/appliquer.py         # applique/rafraîchit le standard (idempotent)
python3 outils/appliquer.py --dry-run
python3 outils/verifier.py          # conformité des 138 pages + syntaxe JS
npm install && npm test             # banc jsdom + jQuery (79 formulaires)
./outils/creer-zips.sh              # archives de livraison dans livrables/
```

Dépendances Python : `beautifulsoup4`, `lxml` (environnement virtuel conseillé).
Dépendances Node : `jsdom`, `jquery@3.7.1` (épinglé).

## À valider en production

Les tests automatisés ne peuvent pas prouver : l'enregistrement des `formId` côté
CRM, le CORS de l'API SMS par domaine, la réception d'un vrai SMS, l'écriture
réelle dans la feuille Google, ni le rendu visuel final. La checklist détaillée
figure au §7 du rapport.
