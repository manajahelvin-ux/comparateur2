# 🏭 Synthèse de la migration batch

> Généré automatiquement le 2026-10-28 par `lp2site.py --all`

## Bilan

- Pages à convertir : **138**
- ✅ Converties avec succès : **7**
- ⏭ Déjà converties (reprise) : **131**
- ❌ Échecs : **0**
- ⏳ Restantes : **0**
- 💾 Poids total généré : **1032.5 Mo**
- 🌐 Modèle de domaine : `—`

## Répartition par catégorie

- **template/test** : 7 sites

## Sites générés

| Site | Page source | Catégorie | Poids | Images | Polices | Assets manquants | Alertes |
|---|---|---|---|---|---|---|---|
| `nicolas-ayvens/` | `nicolas/ayvens.html` | template/test | 5.38 Mo | 28 | 7 | 0 | 1 |
| `nicolas-form-test/` | `nicolas/form-test.html` | template/test | 5.41 Mo | 34 | 7 | 0 | 2 |
| `nicolas-formly/` | `nicolas/formly.html` | template/test | 5.42 Mo | 28 | 7 | 0 | 1 |
| `temlpate-webflow-comparateur-2/` | `temlpate-webflow/comparateur-2.html` | template/test | 5.95 Mo | 36 | 7 | 0 | 1 |
| `temlpate-webflow-comparateur-3/` | `temlpate-webflow/comparateur-3.html` | template/test | 6.13 Mo | 51 | 7 | 0 | 1 |
| `temlpate-webflow-comparateur-4/` | `temlpate-webflow/comparateur-4.html` | template/test | 6.24 Mo | 39 | 7 | 0 | 1 |
| `webflow-template-1/` | `webflow/template-1.html` | template/test | 7.39 Mo | 43 | 7 | 0 | 1 |

## Relancer / continuer

```bash
python3 lp2site.py --all --out migration/sites \
  --domain-pattern "https://{slug}.exemple.fr" --resume
```

_Chaque site contient son `rapport-site.md` (bilan détaillé + checklist QA). Les colonnes « Assets manquants » et « Alertes » signalent les pages à réexporter depuis Webflow (vidéos notamment) ou à vérifier en priorité._