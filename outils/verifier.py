#!/usr/bin/env python3
"""Vérification finale du parc après application du standard.

Contrôle, site par site : intégrité HTML, `lang`, GTM, H1 unique, messages
français, branchement des gestionnaires, champs cachés de tracking, présence de
tous les actifs référencés localement.

Sortie : outils/verification-resultat.json + tableau console.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GTM_ID = "GTM-53SH7D7F"
TRACKING_FIELDS = ["source", "categorie", "coordonnee", "user", "gclid", "msclkid"]


def local_assets(soup, site):
    missing = []
    for tag, attr in (("img", "src"), ("link", "href"), ("script", "src"),
                      ("source", "src"), ("video", "src")):
        for el in soup.find_all(tag):
            url = el.get(attr) or ""
            if not url or url.startswith(("http", "//", "data:", "#", "mailto:", "tel:", "javascript:")):
                continue
            path = os.path.join(ROOT, site, url.split("?")[0].split("#")[0])
            if not os.path.exists(path):
                missing.append(url)
    return missing


def check_site(row):
    site = row["site"]
    problems = []
    path = os.path.join(ROOT, site, "index.html")
    html = open(path, encoding="utf-8", errors="replace").read()
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception as error:  # pragma: no cover
        return {"site": site, "categorie": row["categorie"], "ok": False,
                "problems": ["HTML illisible : %s" % error]}

    lang = (soup.html.get("lang") if soup.html else "") or ""
    if lang != "fr":
        problems.append('lang="%s"' % lang)

    h1 = len(soup.find_all("h1"))
    if h1 != 1:
        problems.append("%d H1" % h1)

    gtm_head = len(re.findall(r"gtm\.js\?id='\+i\+dl", html))
    if gtm_head == 1 and GTM_ID not in html:
        gtm_head = 0
    gtm_body = len(re.findall(r"googletagmanager\.com/ns\.html\?id=" + GTM_ID, html))
    if gtm_head != 1 or gtm_body != 1:
        problems.append("GTM head=%d noscript=%d" % (gtm_head, gtm_body))
    if html.count("gtag('consent','default'") != 1:
        problems.append("Consent Mode par défaut absent ou dupliqué")

    if "SOURCE PAR DEFAUT" in html:
        problems.append("source « SOURCE PAR DEFAUT » restante")
    if "Oops! Something went wrong" in html or "Thank you! Your submission" in html:
        problems.append("message Webflow anglais restant")

    handler_present = "lead-handler.js" in html
    sms_present = "verification-sms.js" in html

    # --- messages de succès : jamais d'affichage automatique -------------------
    script_path = os.path.join(ROOT, site, "script.js")
    if os.path.exists(script_path):
        script = open(script_path, encoding="utf-8", errors="replace").read()
        if "passes2" in script or "swapFailIfNeeded" in script:
            problems.append("script.js : affichage automatique du remerciement (swapFailIfNeeded/passes2)")
        if "lp2site-merci" in script or "Vos réponses ont bien été enregistrées" in script:
            problems.append("script.js : bandeau vert automatique encore présent")
        if "garde formulaire v3" not in script:
            problems.append("script.js : garde de messages non mis à jour")
        if "masquerSucces" not in script:
            problems.append("script.js : garde de masquage des succès absent")
    if "lp2site-merci" in html:
        problems.append("bandeau « lp2site-merci » présent dans la page")
    # les blocs de succès ne doivent pas être visibles par défaut
    for block in soup.select(".w-form-done"):
        style = (block.get("style") or "").replace(" ", "").lower()
        if "display:block" in style and "data-lp-confirme" not in block.attrs:
            problems.append("bloc .w-form-done visible au chargement")
            break
    if handler_present:
        handler = open(os.path.join(ROOT, site, "lead-handler.js"), encoding="utf-8",
                       errors="replace").read()
        if "data-lp-confirme" not in handler:
            problems.append("lead-handler.js : confirmation non marquée (garde incompatible)")

    missing_assets = local_assets(soup, site)
    if missing_assets:
        problems.append("actifs manquants : " + ", ".join(missing_assets[:5]))

    categorie = row["categorie"]
    if categorie == "A_TEL":
        if not handler_present or not sms_present:
            problems.append("gestionnaires non branchés")
        if not re.search(r"window\.LP_CONFIG=", html):
            problems.append("LP_CONFIG absent")
        for name in ("lead-handler.js", "verification-sms.js"):
            if not os.path.exists(os.path.join(ROOT, site, name)):
                problems.append("%s absent du dossier" % name)
        # champs cachés de tracking dans le formulaire de lead
        lead_form = None
        for form in soup.find_all("form"):
            fid = form.get("id") or ""
            if fid.startswith("email-form") or "cookie" in fid:
                continue
            names = [el.get("name") for el in form.find_all(["input", "select", "textarea"])]
            if any(n and n.lower().startswith("telephone") for n in names):
                lead_form = form
                break
        if lead_form is None:
            problems.append("formulaire de lead introuvable")
        else:
            names = {el.get("name") for el in lead_form.find_all("input")}
            manquants = [n for n in TRACKING_FIELDS if n not in names]
            if manquants:
                problems.append("champs cachés absents : " + ", ".join(manquants))
    elif categorie == "B_MAIL":
        if not handler_present:
            problems.append("lead-handler.js non branché")
        if sms_present:
            problems.append("verification-sms.js branché sans téléphone saisissable")
    else:
        if handler_present:
            problems.append("gestionnaire de lead branché sur une page non lead")

    return {"site": site, "categorie": categorie, "ok": not problems, "problems": problems}


def check_syntax():
    """npm/node --check sur tous les fichiers JS du parc."""
    errors = []
    count = 0
    for name in sorted(os.listdir(ROOT)):
        if name.startswith(".") or name in ("node_modules",):
            continue
        path = os.path.join(ROOT, name)
        if os.path.isdir(path):
            for js in ("lead-handler.js", "verification-sms.js", "script.js"):
                file = os.path.join(path, js)
                if not os.path.exists(file):
                    continue
                count += 1
                result = subprocess.run(["node", "--check", file], capture_output=True)
                if result.returncode != 0:
                    errors.append(file.replace(ROOT + "/", "") + " : " +
                                  result.stderr.decode("utf-8", "replace").splitlines()[0])
    for tool in ("lead-handler.js", "verification-sms.js"):
        file = os.path.join(ROOT, "outils", "standard", tool)
        count += 1
        result = subprocess.run(["node", "--check", file], capture_output=True)
        if result.returncode != 0:
            errors.append("outils/standard/" + tool)
    return count, errors


def main():
    audit = json.load(open(os.path.join(ROOT, "outils", "audit-lp.json"), encoding="utf-8"))
    results = [check_site(row) for row in audit]
    js_count, js_errors = check_syntax()

    failed = [r for r in results if not r["ok"]]
    print("Sites vérifiés      : %d" % len(results))
    print("Sites conformes     : %d" % (len(results) - len(failed)))
    print("Sites avec anomalie : %d" % len(failed))
    print("Fichiers JS vérifiés: %d (erreurs : %d)" % (js_count, len(js_errors)))
    for r in failed:
        print(" - %s (%s) : %s" % (r["site"], r["categorie"], " ; ".join(r["problems"])))
    for e in js_errors:
        print(" - JS : " + e)

    json.dump({"sites": results, "js": {"count": js_count, "errors": js_errors}},
              open(os.path.join(ROOT, "outils", "verification-resultat.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    return 1 if (failed or js_errors) else 0


if __name__ == "__main__":
    sys.exit(main())
