#!/usr/bin/env python3
"""Applique le standard MEMOIRE-SESSION-CONTINUATION à toutes les landing pages.

Pour chaque site :
  * `lang="fr"` ;
  * conteneur GTM (GTM-53SH7D7F) + Consent Mode par défaut, uniquement si absent ;
  * H1 unique (promotion sûre du titre du hero, ou H1 masqué si le titre est un H2) ;
  * champs cachés de tracking complets et source de secours réelle (fin de
    « SOURCE PAR DEFAUT ») ;
  * pour les formulaires de lead (A_TEL) : `lead-handler.js` autonome +
    `verification-sms.js`, neutralisation de l'ancien gestionnaire ;
  * documentation de la LP.

Usage : python3 outils/appliquer.py [--site SLUG] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import unicodedata
from html import unescape

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STANDARD = os.path.join(ROOT, "outils", "standard")
GTM_ID = "GTM-53SH7D7F"
VERSION = "1.0.0"

GTM_HEAD = """  <!-- Google Tag Manager + Consent Mode v2 par défaut (denied) -->
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','%(id)s');</script>
  <!-- End Google Tag Manager -->
"""

GTM_BODY = """  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=%(id)s" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
"""

STYLE_H1 = """  <style>
    /* Neutralisation du style de type h1 : ne s'applique qu'aux titres promus,
       qui héritent alors exactement du rendu de l'élément d'origine. */
    h1:where(.lp-h1-titre){font-size:inherit;font-weight:inherit;line-height:inherit;margin:0;letter-spacing:inherit;text-transform:inherit;}
    h2:where(.lp-h1-demoted),div:where(.lp-h1-demoted){font-size:38px;line-height:44px;font-weight:bold;margin-top:20px;margin-bottom:10px;}
    .lp-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  </style>
"""

HIDDEN_TRACKING = {
    "source": "",
    "categorie": "",
    "coordonnee": "1",
    "user": "",
    "gclid": "",
    "msclkid": "",
}


def humanize_title(title: str, site: str) -> str:
    """Évite un H1 masqué réduit au slug brut (`accueil`, `geo`, `ayvens`)."""
    clean = (title or "").strip()
    if not clean:
        return clean
    if norm(clean) == norm(site) or norm(clean).replace(" ", "") == norm(site):
        words = re.sub(r"[-_]+", " ", site).strip()
        return words[:1].upper() + words[1:]
    return clean


def slug_label(slug: str) -> str:
    return re.sub(r"-+", " ", slug).strip().upper()


def form_id(slug: str) -> str:
    return "ADW_LP_" + re.sub(r"[^A-Z0-9]+", "_", slug.upper()).strip("_")


def norm(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return re.sub(r"[\s_\-.]+", "", value.lower())


def selector_for(form) -> str:
    fid = form.get("id")
    if fid:
        return 'form[id="%s"]' % fid
    name = form.get("name")
    if name:
        return 'form[name="%s"]' % name
    classes = form.get("class") or []
    if classes:
        return "form." + classes[0]
    return "form"


def class_has_font_size(site: str, classes) -> bool:
    """Vrai si l'une des classes porte une règle font-size dans le style.css du site."""
    path = os.path.join(ROOT, site, "style.css")
    if not os.path.exists(path):
        return False
    css = open(path, encoding="utf-8", errors="replace").read()
    for cls in classes:
        for match in re.finditer(r"\.%s\b[^{}]*\{([^}]*)\}" % re.escape(cls), css):
            if "font-size" in match.group(1):
                return True
    return False


def pick_hero_title(soup):
    """Cherche le meilleur titre de hero dans la partie haute de la page."""
    body = soup.body
    if not body:
        return None
    seen_form = False
    candidates = []
    for el in body.find_all(["div", "p", "span", "h2", "h3", "h1"]):
        if el.find_parent("form") or el.find("form"):
            continue
        joined_cls = " ".join(el.get("class") or [])
        if "w-form" in joined_cls:
            continue
        if re.search(r"footer|foot|mention|copyright|legal|cookie", joined_cls, re.I):
            continue
        text_check = el.get_text(" ", strip=True)
        if "©" in text_check or re.search(r"tous droits r[ée]serv|mentions l[ée]gales", text_check, re.I):
            continue
        if el.find_parent(class_=re.compile(r"footer|foot|mention|copyright|legal", re.I)) is not None:
            continue
        if el.name in ("nav", "footer"):
            continue
        text = el.get_text(" ", strip=True)
        if not (12 <= len(text) <= 220):
            continue
        classes = el.get("class") or []
        joined = " ".join(classes)
        score = 0
        if re.search(r"titre|title|heading|hero|h1|h2|t-[0-9]", joined, re.I):
            score += 3
        if el.name in ("h2", "h3", "h1"):
            score += 2
        if len(classes) > 0:
            score += 1
        # un titre de hero est rarement un span inline isolé
        if el.name == "span":
            score -= 1
        candidates.append((score, el))
        if el.name == "form":
            seen_form = True
    if not candidates:
        return None
    # on privilégie l'ordre du document, avec un léger biais pour les classes de titre
    best = None
    best_score = 0
    for score, el in candidates:
        if score <= 0:
            continue
        if score > best_score:
            best, best_score = el, score
        if best_score >= 4:
            break
    return best


def replace_once(html: str, old: str, new: str) -> tuple[str, bool]:
    if not old or html.count(old) != 1:
        return html, False
    return html.replace(old, new, 1), True


MESSAGES_WEBFLOW = [
    ("Oops! Something went wrong while submitting the form.",
     "Une erreur est survenue lors de l\u2019envoi. Merci de vérifier votre connexion et de réessayer."),
    ("Thank you! Your submission has been received!",
     "Merci, votre demande a bien été enregistrée. Un conseiller vous contactera rapidement."),
    ('data-wait="Please wait..."', 'data-wait="Patienter..."'),
    ('value="Submit"', 'value="Valider"'),
]


def patch_messages(html: str) -> tuple[str, list[str]]:
    """Traduit les messages Webflow par défaut restés en anglais."""
    notes = []
    for old, new in MESSAGES_WEBFLOW:
        if old in html:
            html = html.replace(old, new)
            notes.append("message traduit : " + old[:40])
    return html, notes


def patch_lang(html: str) -> tuple[str, bool]:
    m = re.search(r"<html[^>]*>", html, re.I)
    if not m:
        return html, False
    tag = m.group(0)
    if re.search(r'lang="fr"', tag, re.I):
        return html, False
    if re.search(r'lang="[^"]*"', tag, re.I):
        new_tag = re.sub(r'lang="[^"]*"', 'lang="fr"', tag, count=1, flags=re.I)
    else:
        new_tag = tag[:-1] + ' lang="fr">'
    return html.replace(tag, new_tag, 1), True


def patch_gtm(html: str) -> tuple[str, bool, bool]:
    """Ajoute le conteneur GTM et le Consent Mode si aucun conteneur n'est présent."""
    if re.search(r"GTM-[A-Z0-9]+", html):
        return html, False, False
    changed = False
    anchor = re.search(r"<meta[^>]+charset[^>]*>", html, re.I)
    if anchor:
        html = html[:anchor.end()] + "\n" + (GTM_HEAD % {"id": GTM_ID}) + html[anchor.end():]
        changed = True
    else:
        m = re.search(r"<head[^>]*>", html, re.I)
        if m:
            html = html[:m.end()] + "\n" + (GTM_HEAD % {"id": GTM_ID}) + html[m.end():]
            changed = True
    m = re.search(r"<body[^>]*>", html, re.I)
    if m:
        html = html[:m.end()] + "\n" + (GTM_BODY % {"id": GTM_ID}) + html[m.end():]
        changed = True
    return html, changed, True


def ensure_style(html: str) -> tuple[str, bool]:
    if "lp-h1-titre" in html or "lp-visually-hidden" in html:
        return html, False
    m = re.search(r"</head>", html, re.I)
    if not m:
        return html, False
    return html[:m.start()] + STYLE_H1 + html[m.start():], True


def _class_attr(tagtext: str) -> list[str] | None:
    m = re.search(r"""class\s*=\s*["']([^"']*)["']""", tagtext, re.I)
    if not m:
        return None
    return m.group(1).split()


def _open_tag_matches(html: str, tag: str, classes: list[str]):
    """Occurrences d'une balise ouvrante dont la liste de classes est identique."""
    matches = []
    for m in re.finditer(r"<%s\b[^>]*>" % re.escape(tag), html, re.I):
        got = _class_attr(m.group(0))
        if got is None:
            continue
        if sorted(got) == sorted(classes):
            matches.append(m)
    return matches


def _text_after(html: str, index: int, size: int = 400) -> str:
    chunk = html[index:index + size]
    chunk = re.sub(r"<[^>]*>", " ", chunk)
    chunk = unescape(chunk).replace("\u2019", "'").replace("\u00a0", " ")
    return re.sub(r"\s+", " ", chunk).strip()


def _find_close(html: str, open_end: int, tag: str) -> int:
    depth = 0
    token = re.compile(r"</?%s\b[^>]*>" % re.escape(tag), re.I)
    pos = open_end
    while True:
        m = token.search(html, pos)
        if not m:
            return -1
        if m.group(0).startswith("</"):
            if depth == 0:
                return m.start()
            depth -= 1
        elif not m.group(0).rstrip(">").endswith("/"):
            depth += 1
        pos = m.end()


def raw_retag(html: str, el, new_tag: str, extra_class: str | None) -> tuple[str, bool]:
    """Renomme une balise (ouverture + fermeture) dans le HTML brut.

    Même titre, mêmes classes et éléments dupliqués sont gérés : la sélection se fait
    sur la liste de classes puis sur le texte de l'élément, sans repasser par une
    sérialisation susceptible de modifier le balisage d'origine (`<br>` vs `<br/>`).
    """
    tag = el.name
    classes = el.get("class") or []
    text = re.sub(r"\s+", " ", el.get_text(" ", strip=True)).replace("\u2019", "'")[:40]
    chosen = None
    for m in _open_tag_matches(html, tag, classes):
        after = _text_after(html, m.end())
        if after.startswith(text[:25]):
            chosen = m
            break
    if chosen is None:
        return html, False

    open_end = chosen.end()
    close_start = _find_close(html, open_end, tag)
    if close_start == -1:
        return html, False

    new_classes = list(classes) + ([extra_class] if extra_class else [])
    tagtext = chosen.group(0)
    new_open = re.sub(r"^<%s" % re.escape(tag), "<" + new_tag, tagtext, count=1, flags=re.I)
    if re.search(r"""class\s*=\s*["']""", new_open, re.I):
        new_open = re.sub(r"""(class\s*=\s*["'])[^"']*([\"'])""",
                          lambda mm: mm.group(1) + " ".join(new_classes) + mm.group(2),
                          new_open, count=1, flags=re.I)
    else:
        new_open = new_open[:-1] + ' class="%s">' % " ".join(new_classes)
    new_close = "</%s>" % new_tag

    html = (html[:chosen.start()] + new_open + html[open_end:close_start]
            + new_close + html[close_start + len("</%s>" % tag):])
    return html, True


def repair_h1(html: str, soup: BeautifulSoup, site: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    h1s = soup.find_all("h1")
    if len(h1s) == 1:
        return html, ["H1 unique déjà présent"]

    if len(h1s) > 1:
        kept = h1s[0]
        demoted_h2 = demoted_div = 0
        for extra in h1s[1:]:
            classes = extra.get("class") or []
            new_tag = "h2" if (classes and class_has_font_size(site, classes)) else "div"
            html, ok = raw_retag(html, extra, new_tag, "lp-h1-demoted")
            if ok and new_tag == "h2":
                demoted_h2 += 1
            elif ok:
                demoted_div += 1
        if demoted_h2:
            notes.append(f"{demoted_h2} H1 excédentaire(s) rétrogradé(s) en H2 sans changement visuel")
        if demoted_div:
            notes.append(f"{demoted_div} H1 excédentaire(s) neutralisé(s) en bloc stylé (rendu identique)")
        remaining = len(h1s) - 1 - demoted_h2 - demoted_div
        if remaining > 0:
            notes.append(f"{remaining} H1 excédentaire(s) non modifié(s) (structure non reconnue)")
        notes.append("H1 conservé : " + kept.get_text(" ", strip=True)[:80])
        return html, notes

    candidate = pick_hero_title(soup)
    if candidate is None:
        title = soup.title.get_text(strip=True) if soup.title else ""
        if not title:
            return html, ["Aucun H1 et aucun titre exploitable : non corrigé"]
        m = re.search(r"<body[^>]*>", html, re.I)
        if not m:
            return html, ["Aucun H1 : non corrigé (body introuvable)"]
        title = humanize_title(title, site)
        block = '\n  <h1 class="lp-visually-hidden lp-h1-titre">%s</h1>\n' % (
            title.replace("&", "&amp;").replace("<", "&lt;"))
        return html[:m.end()] + block + html[m.end():], ["H1 inséré (visuellement masqué) depuis <title>"]

    if candidate.name in ("h2", "h3"):
        text = candidate.get_text(" ", strip=True)
        block = '<h1 class="lp-visually-hidden lp-h1-titre">%s</h1>' % (
            text.replace("&", "&amp;").replace("<", "&lt;"))
        classes = candidate.get("class") or []
        for m in _open_tag_matches(html, candidate.name, classes):
            if _text_after(html, m.end()).startswith(re.sub(r"\s+", " ", text)[:25]):
                html = html[:m.start()] + block + html[m.start():]
                return html, ["H1 inséré (visuellement masqué) devant le titre H2/H3 existant"]
        return html, ["H1 non corrigé : titre H2 introuvable dans le HTML brut"]

    html, ok = raw_retag(html, candidate, "h1", "lp-h1-titre")
    if ok:
        return html, ["Titre du hero converti en H1 (classes conservées, rendu préservé)"]
    title = soup.title.get_text(strip=True) if soup.title else ""
    m = re.search(r"<body[^>]*>", html, re.I)
    if title and m:
        title = humanize_title(title, site)
        block = '\n  <h1 class="lp-visually-hidden lp-h1-titre">%s</h1>\n' % (
            title.replace("&", "&amp;").replace("<", "&lt;"))
        html = html[:m.end()] + block + html[m.end():]
        return html, ["Titre du hero non localisé : H1 masqué inséré depuis <title>"]
    return html, ["H1 non corrigé : titre du hero introuvable dans le HTML brut"]


def form_block_bounds(html: str, ident: str) -> tuple[int, int] | None:
    """Retourne les bornes brutes (ouverture, fermeture) d'un formulaire identifié."""
    pattern = re.compile(r"<form\b[^>]*(?:id|name)=\"%s\"[^>]*>" % re.escape(ident), re.I)
    m = pattern.search(html)
    if not m:
        return None
    close = html.find("</form>", m.end())
    if close == -1:
        return None
    return m.start(), close + len("</form>")


def ensure_hidden_fields(html: str, ident: str) -> tuple[str, list[str]]:
    """Complète les champs cachés de tracking du formulaire de lead."""
    notes: list[str] = []
    bounds = form_block_bounds(html, ident)
    if not bounds:
        return html, notes
    start, end = bounds
    block = html[start:end]
    missing = [name for name in HIDDEN_TRACKING
               if not re.search(r'name="%s"' % re.escape(name), block, re.I)]
    if not missing:
        return html, notes
    payload = "".join(
        '<input type="hidden" name="%s" value="%s">' % (name, HIDDEN_TRACKING[name])
        for name in missing)
    addition = '<div class="w-embed lp-hidden-tracking">%s</div>' % payload
    opening_end = html.index(">", start) + 1
    html = html[:opening_end] + addition + html[opening_end:]
    notes.append("Champs cachés ajoutés : " + ", ".join(missing))
    return html, notes


def patch_source_default(html: str, source: str) -> tuple[str, bool]:
    if 'value="SOURCE PAR DEFAUT"' not in html:
        return html, False
    return html.replace('value="SOURCE PAR DEFAUT"', 'value="%s"' % source), True


def inject_scripts(html: str, cfg: dict, with_sms: bool) -> tuple[str, bool]:
    if "lead-handler.js" in html:
        # mise à jour de la configuration d'une page déjà traitée
        new_cfg = "window.LP_CONFIG=%s;" % json.dumps(cfg, ensure_ascii=False)
        updated, count = re.subn(r"window\.LP_CONFIG=.*?;</script>", new_cfg + "</script>", html, count=1)
        if count and updated != html:
            return updated, True
        return html, False
    m = re.search(r'<script src="script\.js"[^>]*>\s*</script>', html)
    if not m:
        m = re.search(r"<script[^>]*src=\"script\.js\"[^>]*></script>", html)
    config_js = json.dumps(cfg, ensure_ascii=False)
    block = (
        '\n  <!-- Gestionnaire de lead autonome (standard MEMOIRE-SESSION-CONTINUATION) -->\n'
        "  <script>window.LP_CONFIG=%s;</script>\n"
        '  <script src="lead-handler.js" defer></script>\n' % config_js)
    if with_sms:
        block += '  <script src="verification-sms.js" defer></script>\n'
    if not m:
        m = re.search(r"</body>", html, re.I)
        if not m:
            return html, False
        return html[:m.start()] + block + html[m.start():], True
    return html[:m.end()] + block + html[m.end():], True


def build_config(site: str, row: dict, forms: list) -> dict:
    source = "LP " + slug_label(site)
    cfg = {
        "site": site,
        "formId": form_id(site),
        "sourceSecours": source,
        "formName": (forms[0].get("name") or forms[0].get("id") or site) if forms else site,
        "selectors": [selector_for(f) for f in forms],
        "version": VERSION,
    }
    # question micro-entrepreneur -> champ reponse associé
    micro = None
    for hidden in (forms[0].find_all("input") if forms else []):
        name = hidden.get("name") or ""
        if not name.startswith("question"):
            continue
        text = hidden.get("value") or ""
        if re.search(r"micro|auto.?entrepreneur", text, re.I):
            suffix = name[len("question"):]
            micro = "reponse" + suffix
            break
    if micro:
        cfg["microField"] = micro
    return cfg


DOC_TEMPLATE = """# {site} — livraison fonctionnelle

Standard appliqué : **MEMOIRE-SESSION-CONTINUATION** (version {version}).

## Identité CRM

- `formId` : `{form_id}`
- Source de secours : `{source}`
- `form_name` : `{form_name}`
- Formulaire ciblé : {selectors}

## Ce qui est en place

- soumission autonome, sans dépendance à l'hébergement Webflow ;
- envoi **en parallèle** vers le CRM HelloLead et Google Sheets ;
- confirmation affichée uniquement si au moins une livraison a réussi ;
- validations e-mail, code postal, téléphone mobile français et consentement ;
- honeypot `website` silencieux ;
- tracking UTM / `ltm_*` / click IDs filtré par le consentement (`user_cookie_preferences`) ;
- événement GTM `formulaire_lead`, ou `formulaire_micro_entrepreneur` lorsque le champ{micro} vaut « Oui » ;
- vérification du mobile par SMS avant tout envoi du lead ;
- APIs de contrôle : `lpLead.preview()`, `lpLead.googleSheetPreview()`, `lpTracking.inspect()`,
  `smsVerification.estVerifie()`, `smsVerification.numeroVerifie()`.

## Configuration à valider en production

1. Enregistrer `{form_id}` côté CRM HelloLead.
2. Autoriser l'origine publique de la LP en CORS sur l'API SMS.
3. Vérifier la réception réelle du lead dans le CRM et dans la feuille Google.
4. Tester un SMS réel (envoi, expiration, usage unique, renvoi à 120 s).
5. Contrôler l'événement dans GTM en mode Aperçu, avec consentement accordé.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", help="traiter un seul site")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    rows = json.load(open(os.path.join(ROOT, "outils", "audit-lp.json"), encoding="utf-8"))
    report = []

    for row in rows:
        site = row["site"]
        if args.site and site != args.site:
            continue
        index = os.path.join(ROOT, site, "index.html")
        html = open(index, encoding="utf-8", errors="replace", newline="").read()
        original = html
        soup = BeautifulSoup(html, "lxml")
        notes: list[str] = []

        html, msg_notes = patch_messages(html)
        notes.extend(msg_notes)

        html, lang_changed = patch_lang(html)
        if lang_changed:
            notes.append('lang="fr"')

        html, gtm_changed, gtm_added = patch_gtm(html)
        if gtm_changed:
            notes.append("GTM " + GTM_ID + " + Consent Mode par défaut")

        # la source « SOURCE PAR DEFAUT » ne doit jamais partir en production,
        # y compris sur les pages de qualification dont le formulaire alimente le tunnel
        html, replaced_any = patch_source_default(html, "LP " + slug_label(site))
        if replaced_any:
            notes.append("« SOURCE PAR DEFAUT » remplacée par « LP %s »" % slug_label(site))

        html, style_added = ensure_style(html)
        html, h1_notes = repair_h1(html, BeautifulSoup(html, "lxml"), site)
        notes.extend(h1_notes)

        lead_forms = []
        lead_ident = None
        if row["categorie"] in ("A_TEL", "B_MAIL"):
            soup2 = BeautifulSoup(html, "lxml")
            for form in soup2.find_all("form"):
                fid = form.get("id") or ""
                fname = form.get("name") or ""
                if fid.startswith("email-form") or "cookie" in fid:
                    continue
                names = [norm(el.get("name")) for el in form.find_all(["input", "select", "textarea"])]
                has_tel = any(n.startswith("telephone") or n in ("tel", "phone", "portable", "mobile") for n in names)
                has_mail = any(n in ("mail", "email") or n.startswith("mail") for n in names)
                if has_tel or has_mail:
                    lead_forms.append(form)
            if lead_forms:
                lead_ident = lead_forms[0].get("id") or lead_forms[0].get("name") or ""
                html, field_notes = ensure_hidden_fields(html, lead_ident)
                notes.extend(field_notes)
                source = "LP " + slug_label(site)
                html, replaced = patch_source_default(html, source)
                if replaced:
                    notes.append("« SOURCE PAR DEFAUT » remplacée par « %s »" % source)
                cfg = build_config(site, row, lead_forms)
                html, injected = inject_scripts(html, cfg, with_sms=(row["categorie"] == "A_TEL"))
                if injected:
                    notes.append("lead-handler.js + verification-sms.js branchés")
                if row["categorie"] != "A_TEL" and "verification-sms.js" in html:
                    html = re.sub(r'\s*<script src="verification-sms.js"[^>]*></script>', '', html)
                    notes.append("verification-sms.js retiré (aucun téléphone saisissable)")
                    if not args.dry_run:
                        stale = os.path.join(ROOT, site, "verification-sms.js")
                        if os.path.exists(stale):
                            os.remove(stale)
                if not args.dry_run:
                    sources = ["lead-handler.js"] + (["verification-sms.js"] if row["categorie"] == "A_TEL" else [])
                    for fname_src in sources:
                        shutil.copyfile(os.path.join(STANDARD, fname_src),
                                        os.path.join(ROOT, site, fname_src))
                    docs = os.path.join(ROOT, site, "docs")
                    os.makedirs(docs, exist_ok=True)
                    micro = " " + cfg["microField"] if cfg.get("microField") else " dédié"
                    with open(os.path.join(docs, "LIVRAISON-FONCTIONNELLE.md"), "w", encoding="utf-8") as fh:
                        fh.write(DOC_TEMPLATE.format(
                            site=site, version=VERSION, form_id=cfg["formId"],
                            source=cfg["sourceSecours"], form_name=cfg["formName"],
                            selectors=", ".join("`%s`" % s for s in cfg["selectors"]),
                            micro=micro))

        elif row["categorie"] == "C_QUALIF":
            # pages de qualification : aucun gestionnaire de lead (tunnel en deux temps),
            # mais les champs cachés de tracking sont complétés pour que le bundle
            # `get_params()` ne casse pas quand un click ID est présent dans l'URL
            soup3 = BeautifulSoup(html, "lxml")
            for form in soup3.find_all("form"):
                fid = form.get("id") or ""
                if fid.startswith("email-form") or "cookie" in fid:
                    continue
                if len(form.find_all(["input", "select", "textarea"])) < 2:
                    continue
                ident = form.get("id") or form.get("name")
                if not ident:
                    continue
                html, field_notes = ensure_hidden_fields(html, ident)
                notes.extend(field_notes)

        if html != original and not args.dry_run:
            with open(index, "w", encoding="utf-8", newline="") as fh:
                fh.write(html)

        report.append({"site": site, "categorie": row["categorie"],
                       "modifie": html != original, "actions": notes,
                       "formId": form_id(site) if row["categorie"] == "A_TEL" else None})

    out = os.path.join(ROOT, "outils", "application-resultat.json")
    if not args.dry_run:
        json.dump(report, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    total = len(report)
    changed = sum(1 for r in report if r["modifie"])
    print(f"sites traités : {total} — modifiés : {changed}")
    for r in report:
        print(("✔ " if r["modifie"] else "= ") + r["site"] + " — " + "; ".join(r["actions"]))


if __name__ == "__main__":
    main()
