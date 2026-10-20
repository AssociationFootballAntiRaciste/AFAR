#!/usr/bin/env python3
"""Veille médiatique AFAR.

Lit data/veille-config.json, interroge les flux RSS (Google Alerts) et les
recherches Google Actualités, puis écrit data/veille.json, lu par le site.
Les articles déjà collectés sont conservés : l'archive s'enrichit à chaque
passage, ce qui permet au compteur de couvrir toute la période.

Bibliothèque standard uniquement. Lancement : python3 scripts/veille.py   (ajouter --rattrapage pour remonter à la date de départ)
"""
import datetime as dt
import email.utils
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CONFIG = RACINE / "data" / "veille-config.json"
SORTIE = RACINE / "data" / "veille.json"
MAX_ARCHIVE = 3000
UA = "Mozilla/5.0 (compatible; AFAR-veille/1.0; +https://afar-football.fr)"
ATOM = "{http://www.w3.org/2005/Atom}"


def telecharger(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def texte(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    return re.sub(r"\s+", " ", s).strip()


def date_iso(s):
    if not s:
        return None
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc).isoformat()


def hote(url):
    try:
        return urllib.parse.urlparse(url).hostname.removeprefix("www.")
    except Exception:
        return ""


def lire_flux(xml_bytes):
    racine = ET.fromstring(xml_bytes)
    items = []
    for e in racine.iter(f"{ATOM}entry"):  # Google Alerts (Atom)
        lien = e.find(f"{ATOM}link")
        url = lien.get("href") if lien is not None else ""
        reel = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("url")
        url = reel[0] if reel else url
        contenu = e.find(f"{ATOM}content")
        if contenu is None:
            contenu = e.find(f"{ATOM}summary")
        items.append({
            "title": texte(e.findtext(f"{ATOM}title")),
            "link": url,
            "description": texte(contenu.text if contenu is not None else "")[:220],
            "pubDate": date_iso(e.findtext(f"{ATOM}published") or e.findtext(f"{ATOM}updated")),
            "source": hote(url),
        })
    for it in racine.iter("item"):  # RSS 2.0 (Google Actualités)
        source = it.findtext("source") or ""
        titre = texte(it.findtext("title"))
        if source and titre.endswith(" - " + source):
            titre = titre[: -len(source) - 3]
        url = it.findtext("link") or ""
        items.append({
            "title": titre,
            "link": url,
            "description": "",
            "pubDate": date_iso(it.findtext("pubDate")),
            "source": source or hote(url),
        })
    return [i for i in items if i["title"] and i["link"]]


def url_recherche(q):
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": q + " when:30d", "hl": "fr", "gl": "FR", "ceid": "FR:fr"})


def collecter(flux, recherches, periodes=None):
    tout, erreurs = [], []
    urls = list(flux) + [url_recherche(q) for q in recherches]
    for debut, fin in periodes or []:  # rattrapage : une recherche par mois
        urls += ["https://news.google.com/rss/search?" + urllib.parse.urlencode(
            {"q": f"{q} after:{debut} before:{fin}", "hl": "fr", "gl": "FR", "ceid": "FR:fr"}) for q in recherches]
    for url in urls:
        try:
            tout += lire_flux(telecharger(url))
        except Exception as exc:  # une source en panne ne bloque pas les autres
            erreurs.append(f"{url[:90]} : {exc}")
    return tout, erreurs


def mots(titre):
    return {w for w in re.findall(r"\w+", titre.lower()) if len(w) > 3}


def dedoublonner(items):
    gardes, liens = [], set()
    for it in sorted(items, key=lambda i: i.get("pubDate") or "", reverse=True):
        if it["link"] in liens:
            continue
        m = mots(it["title"])
        if any(m and len(m & g["_m"]) / len(m | g["_m"]) >= 0.6 for g in gardes):
            continue
        liens.add(it["link"])
        gardes.append({**it, "_m": m})
    return [{k: v for k, v in g.items() if k != "_m"} for g in gardes]


def main():
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    depart = cfg.get("date_depart", "2026-01-01")
    ancien = {}
    if SORTIE.exists():
        ancien = json.loads(SORTIE.read_text(encoding="utf-8"))

    mots_racisme = [m.lower() for m in cfg["mots_racisme"]]
    mots_football = [m.lower() for m in cfg.get("mots_football", [])]
    mots_incident = [m.lower() for m in cfg.get("mots_incident", [])]

    def h(it):
        return " " + (it["title"] + " " + it.get("description", "")).lower() + " "

    exclus = [m.lower() for m in cfg.get("mots_exclus", [])]
    mots_discri = [m.lower() for m in cfg.get("mots_discrimination", [])]
    sources_exclues = {m.lower() for m in cfg.get("sources_exclues", [])}

    def football(it):
        t = h(it)
        if it.get("source", "").lower() in sources_exclues or any(m in t for m in exclus):
            return False
        if mots_discri and not any(m in t for m in mots_discri):
            return False
        return not mots_football or any(m in t for m in mots_football)

    def raciste(it):
        t = h(it)
        return (any(m in t for m in mots_racisme)
                and (not mots_incident or any(m in t for m in mots_incident)))

    periodes = None
    if "--rattrapage" in sys.argv:  # remonte mois par mois jusqu'à la date de départ
        periodes, d = [], dt.date.fromisoformat(depart)
        while d < dt.date.today():
            f = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
            periodes.append((d.isoformat(), f.isoformat()))
            d = f
    inc, err1 = collecter(cfg["incidents"].get("flux_rss", []), cfg["incidents"].get("recherches", []), periodes)
    inc = [i for i in inc + ancien.get("incidents", []) if (i.get("pubDate") or "") >= depart and football(i)]
    inc = dedoublonner(inc)[:MAX_ARCHIVE]
    for i in inc:
        i["raciste"] = raciste(i)  # recalculé à chaque passage si les mots-clés changent

    men, err2 = collecter(cfg["mentions"].get("flux_rss", []), cfg["mentions"].get("recherches", []))
    requis = [m.lower() for m in cfg["mentions"].get("mots_requis", [])]

    def pertinent(it):  # écarte les homonymes (région Afar, autres « Tribune »…)
        t = (it["title"] + " " + it.get("description", "")).lower()
        return any(m in t for m in requis) or ("afar" in t and "foot" in t)

    men = [m for m in men if pertinent(m)]
    manuels = [{**m, "manuel": True} for m in cfg["mentions"].get("articles_manuels", [])]
    men = dedoublonner(manuels + men + [m for m in ancien.get("mentions", []) if not m.get("manuel")])[:MAX_ARCHIVE]

    sortie = {
        "maj": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "date_depart": depart,
        "compteur_racisme": sum(1 for i in inc if i["raciste"]),
        "incidents": inc,
        "mentions": men,
        "erreurs": err1 + err2,
    }
    SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"incidents : {len(inc)} (dont racistes : {sortie['compteur_racisme']}) ; mentions : {len(men)} ; erreurs : {len(sortie['erreurs'])}")
    for e in sortie["erreurs"]:
        print("  !", e, file=sys.stderr)


if __name__ == "__main__":
    main()
