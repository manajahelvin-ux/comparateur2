#!/usr/bin/env python3
"""Audit des landing pages du parc comparateur2.

Inventorie, pour chaque site : formulaires, champs réels, présence téléphone /
e-mail / consentement, blocs de succès et d'échec, GTM, lang, H1.

Sortie : outils/audit-lp.json + AUDIT-LP.md
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from collections import Counter

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    sys.exit("beautifulsoup4 requis : python3 -m venv /tmp/venv && /tmp/venv/bin/pip install beautifulsoup4 lxml")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEL_NAMES = {"telephone", "tel", "phone", "portable", "mobile", "numtel", "numerotelephone"}
MAIL_NAMES = {"mail", "email", "courriel", "adresseemail", "mailpro", "emailpro"}
ID_NAMES = {"nom", "prenom", "societe", "raisonsociale", "civilite", "ville", "codepostal", "cp", "adresse", "fonction", "effectif"}


def norm(value: str | None) -> str:
    """Normalise un nom de champ : minuscules, sans accents ni séparateurs.

    Reproduit exactement la normalisation du handler JS (resolveField).
    """
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    value = value.lower()
    return re.sub(r"[\s_\-.]+", "", value)


def field_names(form) -> list[str]:
    names = []
    for el in form.find_all(["input", "select", "textarea"]):
        name = el.get("name") or el.get("data-name")
        if name:
            names.append(name)
    return names


def is_excluded_form(form) -> bool:
    """Exclut newsletter, bannière cookies, recherche, mot de passe."""
    fid = (form.get("id") or "")
    cls = " ".join(form.get("class") or [])
    if fid.startswith("email-form"):
        return True
    if "cookie" in fid or "cookie" in cls:
        return True
    for parent in form.parents:
        pcls = " ".join(parent.get("class") or []) if parent.get("class") else ""
        if "cookie" in pcls:
            return True
    if form.find("input", attrs={"type": "search"}) or form.find("input", attrs={"type": "password"}):
        return True
    return False


def read_html(path: str, site: str, from_git: bool) -> str:
    """Lit l'index.html courant ou sa version d'origine (HEAD) pour le diagnostic."""
    if from_git:
        import subprocess
        result = subprocess.run(["git", "show", "HEAD:%s/index.html" % site],
                                cwd=ROOT, capture_output=True)
        if result.returncode == 0:
            return result.stdout.decode("utf-8", "replace")
    return open(os.path.join(path, "index.html"), encoding="utf-8", errors="replace").read()


def analyse_site(path: str, from_git: bool = False) -> dict:
    site = os.path.basename(path)
    html = read_html(path, site, from_git)
    soup = BeautifulSoup(html, "lxml")

    forms = []
    for form in soup.find_all("form"):
        names = field_names(form)
        n = [norm(x) for x in names]
        tel_inputs = [el for el in form.find_all("input")
                      if norm(el.get("name")) in TEL_NAMES or norm(el.get("name")).startswith("telephone")]
        visible_tel = [el for el in tel_inputs if (el.get("type") or "text").lower() != "hidden"]
        has_tel = bool(visible_tel)
        has_mail = any(x in MAIL_NAMES or x.startswith("mail") or x.startswith("email") for x in n)
        has_identity = any(x in ID_NAMES for x in n)
        has_consent = any(x.startswith("consentement") or x == "consent" for x in n)
        forms.append({
            "id": form.get("id"),
            "name": form.get("name"),
            "classes": form.get("class") or [],
            "excluded": is_excluded_form(form),
            "n_fields": len(names),
            "names": names,
            "has_tel": has_tel,
            "tel_hidden_only": bool(tel_inputs) and not visible_tel,
            "has_mail": has_mail,
            "has_identity": has_identity,
            "has_consent": has_consent,
        })

    lead_forms = [f for f in forms if not f["excluded"] and f["n_fields"] >= 2
                  and (f["has_tel"] or (f["has_mail"] and f["has_identity"]))]
    qualif_forms = [f for f in forms if not f["excluded"] and f["n_fields"] >= 2]

    if any(f["has_tel"] for f in lead_forms):
        categorie = "A_TEL"
    elif lead_forms:
        categorie = "B_MAIL"
    elif qualif_forms:
        categorie = "C_QUALIF"
    elif forms:
        categorie = "PAGE"
    else:
        categorie = "PAGE"

    gtm = sorted(set(re.findall(r"GTM-[A-Z0-9]+", html)))
    h1 = len(soup.find_all("h1"))

    return {
        "site": site,
        "categorie": categorie,
        "n_forms": len(forms),
        "forms": forms,
        "lead_forms": [f["id"] or f["name"] for f in lead_forms],
        "tel_fields": sorted({n for f in forms for n in f["names"] if norm(n) in TEL_NAMES}),
        "mail_fields": sorted({n for f in forms for n in f["names"]
                               if norm(n) in MAIL_NAMES or norm(n).startswith("mail")}),
        "has_consent": any(f["has_consent"] for f in lead_forms),
        "w_form_done": "w-form-done" in html,
        "w_form_fail": "w-form-fail" in html,
        "gtm": gtm,
        "lang": (soup.html.get("lang") if soup.html else None),
        "h1": h1,
        "legacy_sms_ui_static": "btn-verification" in html,
        "title": (soup.title.get_text(strip=True) if soup.title else ""),
    }


def main() -> None:
    import sys as _sys
    from_git = "--git" in _sys.argv
    sites = sorted(d for d in os.listdir(ROOT)
                   if os.path.isdir(os.path.join(ROOT, d))
                   and not d.startswith(".")
                   and d not in ("outils", "node_modules")
                   and os.path.exists(os.path.join(ROOT, d, "index.html")))
    rows = [analyse_site(os.path.join(ROOT, s), from_git) for s in sites]
    os.makedirs(os.path.join(ROOT, "outils"), exist_ok=True)
    if not from_git:
        with open(os.path.join(ROOT, "outils", "audit-lp.json"), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)
    else:
        with open(os.path.join(ROOT, "outils", "audit-initial.json"), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)

    counters = Counter(r["categorie"] for r in rows)
    lines = ["# Audit des landing pages — comparateur2", "",
             ("État **initial** (avant application du standard), reconstitué depuis le commit d'origine."
              if from_git else "État **courant** du parc."), "",
             f"Total : **{len(rows)}** sites analysés.", "",
             "| Catégorie | Nombre | Traitement |", "|---|---:|---|",
             f"| A_TEL | {counters['A_TEL']} | Lead complet + vérification SMS |",
             f"| B_MAIL | {counters['B_MAIL']} | Lead complet sans SMS (téléphone masqué ou absent) |",
             f"| C_QUALIF | {counters['C_QUALIF']} | Qualification seule, non interceptée |",
             f"| PAGE | {counters['PAGE']} | Page sans formulaire de lead |", "",
             "## Anomalies transversales", "",
             f"- `lang=\"en\"` : **{sum(1 for r in rows if r['lang'] != 'fr')}** pages",
             f"- Aucun H1 : **{sum(1 for r in rows if r['h1'] == 0)}** pages ; plusieurs H1 : "
             f"**{sum(1 for r in rows if r['h1'] > 1)}** pages",
             f"- Aucun conteneur GTM : **{sum(1 for r in rows if not r['gtm'])}** pages",
             f"- Pas de bloc `.w-form-done` : **{sum(1 for r in rows if not r['w_form_done'])}** pages",
             "",
             "## Détail par site", "",
             "| Site | Catégorie | Formulaires | Lead | Tél. | Consent. | GTM | lang | H1 |",
             "|---|---|---:|---|---|---|---|---|---:|"]
    for r in rows:
        lines.append(
            f"| `{r['site']}` | {r['categorie']} | {r['n_forms']} | "
            f"{', '.join(x for x in r['lead_forms'] if x) or '—'} | "
            f"{'oui' if r['tel_fields'] else 'non'} | "
            f"{'oui' if r['has_consent'] else 'non'} | "
            f"{', '.join(r['gtm']) or '—'} | {r['lang'] or '—'} | {r['h1']} |")
    with open(os.path.join(ROOT, "AUDIT-LP.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    print(json.dumps(dict(counters), ensure_ascii=False))
    print("sites avec tél :", sum(1 for r in rows if r["categorie"] == "A_TEL"))
    allnames = Counter()
    for r in rows:
        for f in r["forms"]:
            if not f["excluded"]:
                for n in f["names"]:
                    allnames[n] += 1
    print("champs fréquents :", allnames.most_common(45))


if __name__ == "__main__":
    main()
