# Correction — remerciement automatique et messages verts à l'ouverture

**Date :** 28 octobre 2026
**Branche :** `arena/7423a26f-comparateur2`
**Signalement :** « le remerciement se déclenche automatiquement » et « des messages
qui se déclenchent en vert à l'ouverture de chaque index ».

---

## 1. Cause racine

Ce n'était ni le gestionnaire de lead ni les pages : le coupable était le **garde
`lp2site-doctor` présent au tout début des 138 fichiers `script.js`**, dans sa
version 2. Il programmait l'affichage d'un message de succès **au chargement de la
page**, sans aucune soumission :

```js
// version 2 — script.js, début de fichier
function swapFailIfNeeded() {
  var done = document.querySelector('.w-form-done');
  if (done && done.offsetParent === null) { done.style.display = 'block'; return; }
  // sinon : bandeau vert fixe en bas de page
  var d = document.createElement('div');
  d.id = 'lp2site-merci';
  d.style.cssText = 'position:fixed;inset:auto 0 0 0;z-index:9999;background:#0b7a5b;…';
  d.textContent = 'Merci ! Vos réponses ont bien été enregistrées.';
  document.body.appendChild(d);
}

var passes2 = [3200, 4000, 5000, 6500];
passes2.forEach(function (t) { setTimeout(swapFailIfNeeded, t); });   // ← déclenchement auto
```

Conséquences observées, 3,2 s après l'ouverture de **chaque** page :

1. si le bloc `.w-form-done` de la page est dans un conteneur masqué
   (`offsetParent === null`), il était **affiché** → le remerciement apparaissait
   tout seul ;
2. sinon, un **bandeau vert fixe** « Merci ! Vos réponses ont bien été
   enregistrées. » apparaissait en bas de l'écran, puis disparaissait au bout de
   9 s.

Un `MutationObserver` sur les styles de `.w-form-done` / `.w-form-fail` rappelait
la même fonction à chaque changement, ce qui produisait en plus des réapparitions
et pouvait recréer le bandeau.

Ce garde avait été ajouté par la chaîne de conversion `lp2site` pour masquer
l'**échec muet** des formulaires Webflow hors hébergement (« sans `?ltm_typ=`,
afficher un retour de succès au lieu de l'échec muet »). Il simulait donc une
réussite : exactement ce que le standard interdit (« ne jamais réintroduire un faux
Merci avant livraison »).

**Reproduction vérifiée** avant correction, sur la version d'origine du bundle :
bandeau vert présent à l'ouverture, sans aucune interaction.

---

## 2. Correction appliquée

### 2.1 Dans les 138 `script.js` — garde `lp2site-doctor` v3

Supprimé :

- les minuteries `passes2 = [3200, 4000, 5000, 6500]` et l'appel automatique ;
- `swapFailIfNeeded()` et la création du bandeau `#lp2site-merci` ;
- le minuteur déclenché au clic sur `[data-form="submit-btn"]` ;
- l'interception `submit` qui affichait un succès sans livraison ;
- le `MutationObserver` qui rappelait cette fonction.

Conservé (correctifs légitimes, sans rapport avec l'affichage) :

- `stripHiddenRequired()` — retire `required` des champs masqués par Formly, sinon
  le bouton « Valider » reste bloqué ;
- la logique d'option exclusive (« Non, merci », « Aucun… ») des cases à cocher.

Ajouté (garde défensif, uniquement pour empêcher un faux succès) :

```js
function masquerSucces() {
  Array.prototype.forEach.call(document.querySelectorAll('.w-form-done'), function (el) {
    if (!el.hasAttribute('data-lp-confirme') && el.style.display !== 'none') {
      el.style.display = 'none';
    }
  });
}
masquerSucces();                                    // au chargement
document.addEventListener('DOMContentLoaded', masquerSucces);
[400, 1200, 2500, 4000, 7000].forEach(… masquerSucces …);   // filet de sécurité
// + un MutationObserver par bloc : tout affichage non confirmé est annulé
```

### 2.2 Dans `lead-handler.js` — confirmation marquée

Le gestionnaire de lead marque le bloc qu'il affiche avec `data-lp-confirme="1"`
**avant** de le rendre visible. Le garde ne masque donc que les succès qui ne
viennent pas d'une livraison réelle. `hideSuccess()` supprime ce marqueur à chaque
nouvelle tentative, ce qui interdit qu'un ancien succès reste affiché.

Résultat : la confirmation ne peut apparaître que dans un seul cas — le
gestionnaire vient de recevoir un `ok` du CRM HelloLead ou de Google Sheets.

### 2.3 Écran de confirmation propre à certaines LP

Une page (`assurance-estheticiennes-institut-beaute`) n'utilise pas les blocs
Webflow : son tunnel maison contient un écran de confirmation
`<div class="step step-done" data-step="done">` masqué par `.step-done{display:none}`.
Le gestionnaire l'active désormais (retrait de `is-active` sur les autres étapes,
ajout sur `.step-done`) **seulement après une livraison réussie**, au lieu de
fabriquer un bloc de secours. Le design d'origine est conservé.

### 2.4 Portée

| Élément | Nombre |
|---|---:|
| `script.js` corrigés (garde v3) | 138 |
| `lead-handler.js` mis à jour (`data-lp-confirme`) | 79 |
| Pages où un remerciement restait possible au chargement | 138 |
| LP à écran de confirmation maison prises en charge | 1 |
| Bandes vertes automatiques supprimées | 138 |

---

## 3. Vérifications

### 3.1 Nouveau banc dédié — `outils/test-messages.mjs`

Exécute le **vrai** bloc du garde extrait de chaque `script.js` dans jsdom, rejoue
toutes ses minuteries (≈ 8 s simulées), puis contrôle.

| Contrôle (par page) | Résultat sur 138 pages |
|---|---|
| Plus aucune minuterie `passes2` | ✔ |
| Plus de `swapFailIfNeeded`, plus de `#lp2site-merci`, plus de « Vos réponses ont bien été enregistrées », plus de couleur `#0b7a5b` | ✔ |
| Après rejeu des minuteries : aucun `.w-form-done` visible | ✔ |
| Après rejeu : aucun bandeau vert | ✔ |
| Un succès affiché par un autre script est **re-masqué** | ✔ |
| Sur les 79 pages de formulaire : rien d'affiché au chargement, aucun envoi réseau au chargement | ✔ |
| Sur les pages avec SMS : aucune confirmation sans numéro vérifié (aucune livraison) | ✔ |
| Sur les 5 pages sans SMS : confirmation **uniquement** après une livraison réussie, et marquée `data-lp-confirme` | ✔ |

**2 027 contrôles, 0 échec.**

La même instrumentation, appliquée à la version d'origine du bundle, reproduit le
bug (bandeau vert créé à l'ouverture) : le test est donc bien discriminant.

### 3.2 Non-régression

| Banc | Résultat |
|---|---|
| `outils/test-formulaires.mjs` (jsdom + jQuery 3.7.1, chemin `$form.submit()`) | 79 sites, **2 984 contrôles, 0 échec** |
| `outils/verifier.py` (conformité des 138 pages + syntaxe JS) | **138/138 conformes**, 293 fichiers JS valides |
| `node --check` sur les 138 `script.js` | 0 erreur |

`outils/verifier.py` intègre désormais ces contrôles : présence du garde v3,
absence de `passes2` / `swapFailIfNeeded` / `lp2site-merci` / bandeau vert,
absence de bloc `.w-form-done` visible au chargement, et marquage
`data-lp-confirme` dans le gestionnaire.

---

## 4. Comportement après correction, par catégorie

| Catégorie | Pages | À l'ouverture | À la soumission |
|---|---:|---|---|
| **A_TEL** | 74 | Aucun message | SMS obligatoire → livraison CRM/Sheets → **confirmation réelle**, ou message d'erreur explicite |
| **B_MAIL** | 5 | Aucun message | Livraison CRM/Sheets → confirmation réelle, ou erreur explicite |
| **C_QUALIF** | 32 | Aucun message | Étape de qualification d'un tunnel : la confirmation appartient à la page de coordonnées qui capture et livre le lead |
| **PAGE** | 27 | Aucun message | Formulaire newsletter/cookies : comportement Webflow d'origine |

Aucune page n'affiche plus de message de succès sans soumission ni livraison.

### Blocs de remerciement statiques vérifiés page par page

Un balayage des 138 pages a recherché **tous** les textes de confirmation hors
`.w-form-done` (« bien été reçue », « Merci pour votre confiance », « nous avons
bien identifié vos besoins », …) : 187 occurrences, dont 59 hors des blocs Webflow.
Chacune a été expliquée :

| Situation | Occurrences | État |
|---|---:|---|
| Étape interne d'un tunnel multi-étapes (« Merci, nous avons bien identifié vos besoins ! Sur quelle adresse… ») | 30 | Masquée par le moteur d'étapes de la LP, pas un écran de succès |
| Étapes Webflow masquées par `hidden` + moteur d'étapes | 21 | Masquées |
| Pages de remerciement TYP statiques (`*-remerciement`, `*-typ`) | — | C'est leur contenu normal : elles ne s'ouvrent pas seules |
| Écran de confirmation maison | 1 | Désormais activé uniquement après livraison (§2.3) |

Les deux seuls vrais défauts d'affichage automatique étaient bien le bandeau vert
et le bloc `.w-form-done` pilotés par le garde v2.

### Point d'attention signalé (non modifié volontairement)

Quatre pages de qualification déclarent une destination dans leur formulaire mais
le bundle d'origine ne lit jamais cet attribut : `paritel-vous-rembourse-v2`,
`temlpate-webflow-comparateur-3`, `ticket-restaurant-v2`,
`typ-formulaires-panneaux-photovoltaiques`. La v2 du garde masquait ce blocage par
un faux « Merci » ; ce faux message a disparu, la navigation déclarée reste donc
inutilisée. La mémoire impose de laisser la catégorie C inchangée
fonctionnellement : je n'ai pas inventé de redirection. Dites-moi si vous voulez
que ces quatre pages suivent leur `data-redirect` après la dernière étape du
formulaire — c'est un ajout de quelques lignes, testable, et sans effet sur les
autres pages.

---

## 5. Rejouer les contrôles

```bash
python3 outils/verifier.py            # conformité des 138 pages (dont garde v3)
npm test                              # formulaires : 79 sites, 2 984 contrôles
npm run test:messages                 # messages : 138 pages, 2 027 contrôles
npm run test:all                      # les deux bancs
```
