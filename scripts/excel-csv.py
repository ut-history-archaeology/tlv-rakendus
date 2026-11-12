#!/usr/bin/env python3
"""AN-01: algandmed Excelist → data/*.csv (korduvkasutatav teisendus).

    python3 scripts/excel-csv.py andmed_excel data              # kirjutab CSV-d + võrdlusraport
    python3 scripts/excel-csv.py andmed_excel data --kontrolli  # ainult võrdlusraport (CSV-sid ei kirjutata)
    python3 scripts/excel-csv.py andmed_excel data --raport fail.md

Sisend: andmed_excel/TLV_*.xlsx, scripts/andmeparandused.json (AN-02),
        scripts/isik-aliased.json (AN-02), scripts/nimekirjad-vasted.csv (NK-01).
Väljund (data/README.md skeem): isikud, koosseisud, koosolekud, koosolek_juhatajad,
        muutused, valimised, osavott, nimekirjad, valimisnimekirjad.
Teisendusreeglid = augusti korrastus (ANDMEKORRASTUSE_RAPORT.md). Võrdlus vana
data/*.csv ↔ uus (AN-03 p 1) prinditakse alati; erinevused peavad vastama
ANDMEUUENDUS_*_RAPORT.md-le. Buildis seda skripti ei käivitata.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

JUUR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARANDUSED = os.path.join(JUUR, "scripts", "andmeparandused.json")
ALIASED = os.path.join(JUUR, "scripts", "isik-aliased.json")
NIMEKIRJAD_VASTED = os.path.join(JUUR, "scripts", "nimekirjad-vasted.csv")

NADALAPAEVAD = ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev"]
EXCELI_VEAD = {"#REF!", "#VALUE!", "#N/A", "#DIV/0!", "#NAME?", "#NULL!", "#NUM!"}

hoiatused: list[str] = []


def hoiata(s: str) -> None:
    hoiatused.append(s)


# ---------------------------------------------------------------- väärtused

def tekst(v) -> str:
    """Exceli lahter → CSV-tekst. Täisarvuline float ilma ".0"-ta, kuupäev ISO-na,
    Exceli veaväärtus (#REF! jt) tühjaks. Tekst jääb muutmata (ka algus-tühikud)."""
    if v is None:
        return ""
    if isinstance(v, bool):
        return "jah" if v else "ei"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else repr(v)
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    s = str(v)
    if s.strip() in EXCELI_VEAD:
        return ""
    return s


def kriips(s: str) -> str:
    """Exceli mõttekriips (–, —) → sidekriips (koosseis_id slug)."""
    return s.replace("–", "-").replace("—", "-")


def paevad(v) -> list[int]:
    """Päeva lahter: 12 → [12]; "12,13" → [12, 13]; tühi → []."""
    if v is None or v == "":
        return []
    if isinstance(v, (int, float)):
        return [int(v)]
    return [int(x) for x in re.split(r"[,;]\s*", str(v).strip()) if x.strip()]


def kuupaev(aasta, kuu, paev) -> str:
    """Osaline kuupäev jääb osaliseks: (1871, None, None) → "1871"; (1871, 9, None) → "1871-09"."""
    a = tekst(aasta).strip()
    if not a:
        return ""
    if not re.fullmatch(r"\d{4}", a):
        return a  # nt "1899 või varem" — toortekst
    if kuu in (None, ""):
        return a
    k = f"{a}-{int(kuu):02d}"
    if paev in (None, ""):
        return k
    return f"{k}-{int(paev):02d}"


def vahemik(aasta, kuu, paev) -> tuple[str, str]:
    """Mitmepäevane kuupäev ("12,13") → (algus, lõpp); ühepäevane → (päev, päev)."""
    p = paevad(paev)
    if not p:
        d = kuupaev(aasta, kuu, None)
        return d, d
    return kuupaev(aasta, kuu, p[0]), kuupaev(aasta, kuu, p[-1])


def nadalapaev(iso: str) -> str:
    try:
        return NADALAPAEVAD[dt.date.fromisoformat(iso).weekday()]
    except ValueError:
        return ""


# ---------------------------------------------------------------- Exceli lugemine

def loe_leht(kaust: str, fail: str, leht: str | None = None, lingid: bool = False):
    """Tagastab (päis, read); read on dict-id. lingid=True → lisaks {(rida, veerg): url}."""
    import openpyxl

    tee = os.path.join(kaust, fail)
    wb = openpyxl.load_workbook(tee, data_only=True)
    ws = wb[leht] if leht else wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    pais = [str(h).strip() if h is not None else "" for h in next(it)]
    read = []
    for r in it:
        if all(v is None or (isinstance(v, str) and not v.strip()) for v in r):
            continue
        read.append(dict(zip(pais, r)))
    hl: dict[tuple[int, str], str] = {}
    if lingid:
        wb2 = openpyxl.load_workbook(tee)
        ws2 = wb2[leht] if leht else wb2.worksheets[0]
        for rida in ws2.iter_rows(min_row=2):
            for c in rida:
                if c.hyperlink and c.hyperlink.target:
                    hl[(c.row - 2, pais[c.column - 1])] = c.hyperlink.target
    for nr, r in enumerate(read):
        for k, v in r.items():
            if isinstance(v, str) and v.strip() in EXCELI_VEAD:
                hoiata(f"{fail} rida {nr + 2} veerg {k}: Exceli viga {v.strip()} → tühi")
    return pais, read, hl


# ---------------------------------------------------------------- aliased

def loe_aliased(tee: str = ALIASED) -> dict[str, int]:
    if not os.path.exists(tee):
        return {}
    with open(tee, encoding="utf-8") as f:
        sisu = json.load(f)
    return {str(k): int(v) for k, v in sisu.items() if not k.startswith("_")}


def rakenda_alias(v: str, aliased: dict[str, int], koht: str, loendur: Counter) -> str:
    if v in aliased:
        loendur[koht] += 1
        return str(aliased[v])
    return v


# ---------------------------------------------------------------- tabelid

ISIKUD_VEERUD = ["isik_id", "perenimi", "alt_perenimi", "eesnimi", "alt_eesnimi", "sugu", "isanimi",
                 "synd_kuupaev", "synd_tuletatud", "surm_kuupaev", "wikidata", "arhiiviviited", "AKL_ID"]
KOOSSEISUD_VEERUD = ["koosseis_id", "aasta_valimised", "valimised_algus", "valimised_lopp",
                     "esimene_koosolek", "viimane_koosolek", "valimised_allikas",
                     "valimistulemuste_allikas", "kandidaatide_allikas"]
KOOSOLEKUD_VEERUD = ["koosolek_id", "kuupaev", "kuupaev_lopp", "nadalapaev", "vorm", "koosseis_id",
                     "juhataja", "koosseis_arv", "kohal_arv", "kohal_arv_2paev", "kuupaev_txt",
                     "protokolli_algus_txt"]
JUHATAJAD_VEERUD = ["koosolek_id", "juhataja_nimi", "isik_id"]
MUUTUSED_VEERUD = ["muutus_id", "isik_id", "perenimi", "eesnimi", "nimekiri", "kuupaev", "koosseis_id",
                   "liik", "liitus_prot", "lahkus_prot", "ryhmavahetus_prot", "peatatud_prot",
                   "allikaviide", "täpsustus", "asendaja_ID", "asendatav_ID", "asendaja_puudub",
                   "asendatav_puudub"]
VALIMISED_VEERUD = ["aasta", "koosseis_id", "roll", "isik_id", "nimekiri_nr", "nimekiri_nimi", "nimekiri_id",
                    "nimekiri_kontrollida",
                    "ringkond_nr", "perenimi", "alt_perenimi", "eesnimi", "alt_eesnimi", "isanimi",
                    "vanus", "sünniaeg", "sünniaeg_tuletatud", "elukoht_tänav", "elukoht_majanr",
                    "elukoht_korterinr", "elukoht_muu", "amet", "märkused", "jrk_üld", "jrk_nimekiri",
                    "jrk_ringkond", "hääled_1_jsk", "hääled_2_jsk", "hääled_kokku"]
OSAVOTT_VEERUD = ["koosolek_id", "kuupaev", "koosseis_id", "staatus", "nimi_toor", "isik_id",
                  "sidumise_kindlus"]


def tee_isikud(read, aliased, loendur) -> list[dict]:
    out = []
    for r in read:
        iid = tekst(r["ID"])
        if iid in aliased:
            hoiata(f"isikud: alias-ID {iid} esineb isikute tabelis (peaks olema liidetud ID-ga {aliased[iid]})")
        out.append({
            "isik_id": iid,
            "perenimi": tekst(r["perenimi"]),
            "alt_perenimi": tekst(r["alt_perenimi"]),
            "eesnimi": tekst(r["eesnimi"]),
            "alt_eesnimi": tekst(r["alt_eesnimi"]),
            "sugu": tekst(r["sugu"]),
            "isanimi": tekst(r["isanimi"]),
            "synd_kuupaev": kuupaev(r["sünd_aasta"], r["sünd_kuu"], r["sünd_päev"]),
            "synd_tuletatud": tekst(r["sünd_tuletatud"]),
            "surm_kuupaev": kuupaev(r["surm_aasta"], r["surm_kuu"], r["surm_päev"]),
            "wikidata": tekst(r["wikidata"]),
            "arhiiviviited": tekst(r["arhiiviviited"]),
            "AKL_ID": tekst(r["AKL_ID"]),
        })
    return out


def tee_koosseisud(read) -> list[dict]:
    out = []
    for r in read:
        algus, lopp = vahemik(r["valimised_aasta"], r["valimised_kuu"], r["valimised_päev"])
        esim = vahemik(r["esimene_koosolek_aasta"], r["esimene_koosolek_kuu"], r["esimene_koosolek_päev"])[0]
        viim = vahemik(r["viimane_koosolek_aasta"], r["viimane_koosolek_kuu"], r["viimane_koosolek_päev"])[1]
        out.append({
            "koosseis_id": kriips(tekst(r["aastad_koosolekud"]).strip()),
            "aasta_valimised": tekst(r["aasta_valimised"]),
            "valimised_algus": algus,
            "valimised_lopp": lopp,
            "esimene_koosolek": esim,
            "viimane_koosolek": viim,
            "valimised_allikas": tekst(r["valimised_allikas"]),
            "valimistulemuste_allikas": tekst(r["valimistulemuste_nimekiri_allikas"]),
            "kandidaatide_allikas": tekst(r["volinike_kandidaatide_nimekiri_allikas"]),
        })
    return out


class KoosseisuMaaraja:
    """koosseis_id kuupäeva järgi: viimane koosseis, mille esimene koosolek ≤ kuupäev
    (esimese koosseisu algus on lahtine)."""

    def __init__(self, koosseisud: list[dict]):
        self.jada = sorted(koosseisud, key=lambda k: k["esimene_koosolek"] or "0000")

    def __call__(self, iso: str) -> str:
        tulem = self.jada[0]["koosseis_id"]
        for k in self.jada:
            if (k["esimene_koosolek"] or "0000") <= iso:
                tulem = k["koosseis_id"]
        return tulem


def tee_koosolekud(read, maara) -> list[dict]:
    out = []
    for i, r in enumerate(read):
        algus, lopp = vahemik(r["aasta"], r["kuu"], r["päev"])
        kohal = [x.strip() for x in re.split(r"[;,]", tekst(r["kohal_TLV_arv"])) if x.strip()]
        out.append({
            "koosolek_id": f"K{i + 1:03d}",
            "kuupaev": algus,
            "kuupaev_lopp": lopp if lopp != algus else "",
            "nadalapaev": nadalapaev(algus),
            "vorm": tekst(r["vorm"]),
            "koosseis_id": maara(algus),
            "juhataja": tekst(r["juhataja_korrast"]),
            "koosseis_arv": tekst(r["kooseis_TLV_arv"]),
            "kohal_arv": kohal[0] if kohal else "",
            "kohal_arv_2paev": kohal[1] if len(kohal) > 1 else "",
            "kuupaev_txt": tekst(r["kuupäev_txt"]),
            "protokolli_algus_txt": tekst(r["lõik"]),
            # toorväljad osavõtu jaoks (CSV-sse ei lähe)
            "_kohal": tekst(r["kohal_TLV"]),
            "_puudub": tekst(r["puudub_TLV"]),
        })
    return out


def tee_juhatajad(koosolekud, isikud) -> list[dict]:
    nimest: dict[str, list[str]] = defaultdict(list)
    for p in isikud:
        nimest[f"{p['eesnimi']} {p['perenimi']}"].append(p["isik_id"])
    out = []
    for k in koosolekud:
        for nimi in [x.strip() for x in k["juhataja"].split(";") if x.strip()]:
            ids = nimest.get(nimi, [])
            if len(ids) > 1:
                hoiata(f"juhataja {nimi} ({k['koosolek_id']}): mitu isikut {ids}")
            out.append({"koosolek_id": k["koosolek_id"], "juhataja_nimi": nimi,
                        "isik_id": ids[0] if len(ids) == 1 else ""})
    return out


def tee_muutused(read, maara, aliased, loendur) -> list[dict]:
    out = []
    for r in read:
        kp = kuupaev(r["muutus_aasta"], r["muutus_kuu"], r["muutus_päev"])
        out.append({
            "muutus_id": tekst(r["jk_kronol"]),
            "isik_id": rakenda_alias(tekst(r["ID_isik"]), aliased, "muutused.isik_id", loendur),
            "perenimi": tekst(r["perenimi"]),
            "eesnimi": tekst(r["eesnimi"]),
            "nimekiri": tekst(r["nimekiri"]),
            "kuupaev": kp,
            "koosseis_id": maara(kp),
            "liik": tekst(r["muutus_liik"]),
            "liitus_prot": tekst(r["liitus_prot"]),
            "lahkus_prot": tekst(r["lahkus_prot"]),
            "ryhmavahetus_prot": tekst(r["rühma vahetus_prot"]),
            "peatatud_prot": tekst(r["peatatud_prot"]),
            "allikaviide": tekst(r["allikaviide"]),
            "täpsustus": tekst(r["täpsustus"]),
            "asendaja_ID": rakenda_alias(tekst(r["asendaja_ID"]), aliased, "muutused.asendaja_ID", loendur),
            "asendatav_ID": rakenda_alias(tekst(r["asendatav_ID"]), aliased, "muutused.asendatav_ID", loendur),
            "asendaja_puudub": tekst(r["asendaja_puudub"]),
            "asendatav_puudub": tekst(r["asendatav_puudub"]),
        })
    return out


def tee_valimised(read, koosseisud, aliased, loendur) -> list[dict]:
    aastast = {k["aasta_valimised"]: k["koosseis_id"] for k in koosseisud}
    out = []
    for r in read:
        aasta = tekst(r["aasta"])
        if aasta not in aastast:
            hoiata(f"valimised: aasta {aasta} ei vasta ühelegi koosseisule")
        out.append({
            "aasta": aasta,
            "koosseis_id": aastast.get(aasta, ""),
            "roll": tekst(r["roll_allikas"]),
            "isik_id": rakenda_alias(tekst(r["ID_isik"]), aliased, "valimised.isik_id", loendur),
            "nimekiri_nr": tekst(r["nimekiri_nr"]),
            "nimekiri_nimi": tekst(r["nimekiri_nimi"]),
            "ringkond_nr": tekst(r["ringkond_nr"]),
            **{v: tekst(r[v]) for v in VALIMISED_VEERUD[9:]},
        })
    return out


# ---------------------------------------------------------------- nimekirjad (NK-01)

NIMEKIRJAD_AASTAD = ["1917", "1919", "1921", "1923", "1926", "1929", "1934"]
NIMEKIRJAD_VEERUD = ["nimekiri_id", "nimi", "mitu_osapoolt", "wikidata",
                     *[f"{v}_{a}" for a in NIMEKIRJAD_AASTAD for v in ("nr", "nimi")]]
VALIMISNIMEKIRJAD_VEERUD = ["aasta", "nr", "nimi", "haaled", "wikidata_1", "wikidata_2", "wikidata_3",
                            "wikidata_4", "nimekiri_id"]
EESOTSAS = re.compile(r"\s*\(eesotsas [^)]*\)$")


class NimekirjaViga(Exception):
    """Valimiste toorkuju, mida vastete tabelis pole — skript katkeb (NK-01)."""


def toorkuju(s: str) -> str:
    """Võrdluskuju vastete tabeliga: alguse/lõpu tühikud (ka NBSP) maha, sisu muutmata."""
    return s.strip()


def loe_nimekirjade_vasted(tee: str = NIMEKIRJAD_VASTED) -> dict[tuple[str, str, str], dict]:
    """(aasta, nr, toorkuju) → {"id", "kontrollida"}. Staatus "KONTROLLIDA…" → kontrollida (NK-02)."""
    with open(tee, encoding="utf-8-sig", newline="") as f:
        read = list(csv.DictReader(f, delimiter=";"))
    vasted = {}
    for r in read:
        voti = (r["aasta"].strip(), r["nimekiri_nr"].strip(), toorkuju(r["nimekiri_nimi_toor"]))
        if voti in vasted:
            raise NimekirjaViga(f"nimekirjad-vasted.csv: korduv rida {voti}")
        vasted[voti] = {"id": r["nimekiri_id"].strip(),
                        "kontrollida": r["staatus"].strip().upper().startswith("KONTROLLIDA")}
    return vasted


def seo_nimekirjad(valimised: list[dict], vasted: dict) -> list[str]:
    """valimised += nimekiri_id, nimekiri_kontrollida. Tühi toorkuju (1919 valitud, 1939
    ringkonnad) → tühi id. Toorkuju, mida vastete tabelis pole → NimekirjaViga (kõik korraga)."""
    puudu: Counter = Counter()
    for v in valimised:
        nimi = toorkuju(v["nimekiri_nimi"])
        v["nimekiri_id"], v["nimekiri_kontrollida"] = "", ""
        if not nimi:
            continue
        vaste = vasted.get((v["aasta"], v["nimekiri_nr"].strip(), nimi))
        if vaste is None:
            puudu[(v["aasta"], v["nimekiri_nr"], nimi)] += 1
            continue
        v["nimekiri_id"] = vaste["id"]
        v["nimekiri_kontrollida"] = "jah" if vaste["kontrollida"] else ""
    if puudu:
        raise NimekirjaViga("valimiste nimekirja toorkujud puuduvad scripts/nimekirjad-vasted.csv-st — lisa read:\n"
                            + "\n".join(f"  {a};{n};{t} ({k} rida)" for (a, n, t), k in sorted(puudu.items())))
    return []


def tee_nimekirjad(read) -> list[dict]:
    """TLV_nimekirjad.xlsx Sheet2 → kanoonilised nimekirjad (35)."""
    out = []
    for r in read:
        rida = {"nimekiri_id": tekst(r["id"]), "nimi": tekst(r["nimi_korrastatud"]).strip(),
                "mitu_osapoolt": tekst(r["mitu_osapoolt"]).strip(), "wikidata": tekst(r["wikidata"]).strip()}
        for a in NIMEKIRJAD_AASTAD:
            rida[f"nr_{a}"] = tekst(r.get(f"{a}_nr"))
            rida[f"nimi_{a}"] = tekst(r.get(f"{a}_nimi")).strip()
        out.append(rida)
    return out


def tee_valimisnimekirjad(read, nimekirjad: list[dict]) -> list[dict]:
    """TLV_nimekirjad.xlsx Sheet1 → ametlikud nimekirjad (78) + nimekiri_id Sheet2 aastaveergude
    järgi: kui aastal on numbrid (1917–1923), siis nr järgi; muidu nime järgi (täpne vaste;
    1929 alamnimekirjad "… (eesotsas X)" = Sheet2 nimi ilma sulgudeta). Vasteta → tühi + hoiatus."""
    nr_jargi: dict[tuple[str, str], str] = {}
    nime_jargi: dict[tuple[str, str], str] = {}
    for n in nimekirjad:
        for a in NIMEKIRJAD_AASTAD:
            if n[f"nr_{a}"]:
                nr_jargi[(a, n[f"nr_{a}"])] = n["nimekiri_id"]
            if n[f"nimi_{a}"]:
                nime_jargi[(a, n[f"nimi_{a}"])] = n["nimekiri_id"]
    out = []
    for r in read:
        aasta, nr, nimi = tekst(r["aasta_valimised"]), tekst(r["nimekiri_nr"]), tekst(r["nimekiri_nimi"]).strip()
        if nr:
            nid = nr_jargi.get((aasta, nr), "")
        else:
            nid = nime_jargi.get((aasta, nimi)) or nime_jargi.get((aasta, EESOTSAS.sub("", nimi)), "")
        if not nid:
            hoiata(f"valimisnimekirjad: {aasta} nr {nr or '—'} \"{nimi}\" — kanoonilist nimekirja ei leitud")
        out.append({"aasta": aasta, "nr": nr, "nimi": nimi, "haaled": tekst(r["hääled"]),
                    **{f"wikidata_{i}": tekst(r[f"wikidata_{i}"]).strip() for i in range(1, 5)},
                    "nimekiri_id": nid})
    return out


# ---------------------------------------------------------------- osavõtt

DR = re.compile(r"^Dr\.\s*")
INITSIAALID = re.compile(r"^((?:[A-ZÄÖÜÕŠŽ][a-zäöüõšž]{0,3}\.\s*)+)([A-Za-zÄÖÜÕŠŽäöüõšž][A-Za-zÄÖÜÕŠŽäöüõšž \-]*)\.?$")
EESNIMI_PERENIMI = re.compile(r"^([A-ZÄÖÜÕŠŽ][a-zäöüõšž]+)\s+([A-ZÄÖÜÕŠŽ]\S*)$")
AINULT_TAHED = re.compile(r"^[A-Za-zÄÖÜÕŠŽäöüõšž \-]+$")
ROOMA = re.compile(r"^(\S+)\s+(I{1,3})$")


def norm_nimi(s: str) -> str:
    """Perenime võrdluskuju: väiketähed, w→v, õ/ö → o, sch/tsh-variandid, ainult tähed."""
    s = unicodedata.normalize("NFC", s.lower())
    s = s.replace("w", "v").replace("õ", "o").replace("ö", "o").replace("š", "sh").replace("ž", "zh")
    for a, b in (("tsch", "ts"), ("sch", "s"), ("tsh", "ts"), ("sh", "s")):
        s = s.replace(a, b)
    return re.sub(r"[^a-zäü]", "", s)


def yksiktahed(s: str) -> str:
    """OCR-topelttähed üheks ("kleement" → "klement")."""
    return re.sub(r"(.)\1+", r"\1", s)


def parsi_nimi(toor: str, tuntud=lambda s: False) -> tuple[str, list[str], bool]:
    """Protokolli nimekuju → (perenimi, eesnime lühendid väiketähtedes, rooma numbriga).
    "J.O.Rütli" → ("Rütli", ["j", "o"]); "H. Pe terson" → ("Peterson", ["h"]);
    "Mihail Sõstsikov" → ("Sõstsikov", ["mihail"]); "Stshu kin" → ("Stshukin", []), kui
    kokku kirjutatult tuntud perenimi. Muu (müra, ametinimetused, sidekriipsuga eesnimed)
    jääb terviklikuks perenimeks → üldjuhul vasteta."""
    s = DR.sub("", toor.strip())
    m = ROOMA.match(s)
    if m:
        return m.group(1), [], True
    m = INITSIAALID.match(s)
    if m:
        lyhendid = [x.strip().lower().replace("w", "v") for x in m.group(1).split(".") if x.strip()]
        return m.group(2).replace(" ", ""), lyhendid, False
    if AINULT_TAHED.match(s) and tuntud(s.replace(" ", "")):
        return s.replace(" ", ""), [], False
    m = EESNIMI_PERENIMI.match(s)
    if m:
        return m.group(2), [m.group(1).lower().replace("w", "v")], False
    return (s if AINULT_TAHED.match(s) else ""), [], False


class Siduja:
    """Osavõtu sidumine (ANDMEKORRASTUSE_RAPORT.md): 1) koosseisu liikmete hulgast → kõrge,
    2) kogu isikute tabelist → keskmine; mitu kandidaati → mitmene; vasteta → puudub.
    Eesnime lühend peab olema eesnime (või alternatiivkuju) algus; kui lühendiga vastet pole,
    otsitakse perenime järgi."""

    def __init__(self, isikud: list[dict], liikmed: dict[str, set[str]], nimekujud=None):
        self.perest: dict[str, set[str]] = defaultdict(set)
        self.perest1: dict[str, set[str]] = defaultdict(set)
        self.eesnimed: dict[str, list[str]] = {}
        kujud = defaultdict(list)
        for p in isikud:
            kujud[p["isik_id"]] += [p["perenimi"], *p["alt_perenimi"].split(",")]
        for iid, pn in (nimekujud or []):
            kujud[iid].append(pn)
        for iid, nimed in kujud.items():
            for pn in nimed:
                n = norm_nimi(pn)
                if n:
                    self.perest[n].add(iid)
                    self.perest1[yksiktahed(n)].add(iid)
        for p in isikud:
            self.eesnimed[p["isik_id"]] = [e.strip().lower().replace("w", "v")
                                           for e in [p["eesnimi"], *p["alt_eesnimi"].split(",")] if e.strip()]
        self.liikmed = liikmed

    def _klapib(self, iid: str, lyhendid: list[str]) -> bool:
        return any(e.startswith(l) for l in lyhendid for e in self.eesnimed.get(iid, []))

    def _vali(self, kand: set[str], lyhendid: list[str]) -> set[str]:
        if not lyhendid:
            return kand
        return {k for k in kand if self._klapib(k, lyhendid)}

    def seo(self, toor: str, koosseis_id: str) -> tuple[str, str]:
        pere, lyhendid, rooma = parsi_nimi(toor, lambda s: norm_nimi(s) in self.perest)
        n = norm_nimi(pere)
        kand = self.perest.get(n, set())
        liikmed = self.liikmed.get(koosseis_id, set())
        k1 = (kand | self.perest1.get(yksiktahed(n), set())) & liikmed
        if not kand and not k1:
            return "", "puudub"
        if rooma:
            return "", "mitmene"
        v = self._vali(k1, lyhendid)
        if len(v) == 1:
            return next(iter(v)), "kõrge"
        if len(v) > 1:
            return "", "mitmene"
        koik = self._vali(kand, lyhendid) or kand or k1
        if len(koik) == 1:
            return next(iter(koik)), "keskmine"
        return "", "mitmene"


def koosseisu_liikmed(valimised, muutused) -> dict[str, set[str]]:
    liikmed: dict[str, set[str]] = defaultdict(set)
    for v in valimised:
        if v["roll"] == "valitud" and v["isik_id"]:
            liikmed[v["koosseis_id"]].add(v["isik_id"])
    for m in muutused:
        if m["isik_id"]:
            liikmed[m["koosseis_id"]].add(m["isik_id"])
    return liikmed


def tee_osavott(koosolekud, isikud, valimised, muutused) -> list[dict]:
    siduja = Siduja(isikud, koosseisu_liikmed(valimised, muutused))
    out = []
    for k in koosolekud:
        for staatus, vali in (("kohal", "_kohal"), ("puudub", "_puudub")):
            for toor in [x.strip() for x in k.get(vali, "").split(",")]:
                if not toor:
                    continue
                iid, kindlus = siduja.seo(toor, k["koosseis_id"])
                out.append({"koosolek_id": k["koosolek_id"], "kuupaev": k["kuupaev"],
                            "koosseis_id": k["koosseis_id"], "staatus": staatus, "nimi_toor": toor,
                            "isik_id": iid, "sidumise_kindlus": kindlus})
    return out


# ---------------------------------------------------------------- parandused (AN-02)

def rakenda_parandused(tabelid: dict[str, list[dict]], tee: str = PARANDUSED) -> list[str]:
    """Iga kirje: {"nr", "tabel", "votmed": {veerg: väärtus}, "vana": {...}, "uus": {...}, "pohjus"}
    või {"nr", "tabel", "lisa": {rida}, "pohjus"} või {"nr", "markus", "pohjus"} (andmeid ei muuda).
    Kui allikas on juba parandatud kujul, kirje jääb mõjuta ja tuleb hoiatus."""
    with open(tee, encoding="utf-8") as f:
        kirjed = json.load(f)["parandused"]
    logi = []
    for p in kirjed:
        nr = p["nr"]
        if "markus" in p:
            logi.append(f"{nr}: märkus ({p['markus']})")
            continue
        read = tabelid[p["tabel"]]
        if "lisa" in p:
            uus = p["lisa"]
            votmed = {k: uus[k] for k in p.get("votmed", uus)}
            if any(all(r.get(k) == v for k, v in votmed.items()) for r in read):
                hoiata(f"{nr}: parandus on allikas juba sees — eemalda ({p['tabel']} {votmed})")
                continue
            read.append({k: uus.get(k, "") for k in read[0].keys()} if read else dict(uus))
            logi.append(f"{nr}: {p['tabel']} + rida {votmed}")
            continue
        sihid = [r for r in read if all(r.get(k) == v for k, v in p["votmed"].items())]
        if not sihid:
            hoiata(f"{nr}: {p['tabel']} ridu {p['votmed']} ei leitud")
            continue
        muudetud = 0
        for r in sihid:
            if all(r.get(k) == v for k, v in p["uus"].items()):
                continue
            if not all(r.get(k) == v for k, v in p["vana"].items()):
                hoiata(f"{nr}: {p['tabel']} {p['votmed']} väärtus ei vasta oodatud vanale {p['vana']} "
                       f"(on {{{', '.join(f'{k}: {r.get(k)!r}' for k in p['vana'])}}}) — kontrolli allikat")
                continue
            r.update(p["uus"])
            muudetud += 1
        if muudetud == 0:
            hoiata(f"{nr}: parandus on allikas juba sees — eemalda ({p['tabel']} {p['votmed']})")
        else:
            logi.append(f"{nr}: {p['tabel']} {muudetud} rida ({p['votmed']})")
    return logi


# ---------------------------------------------------------------- terviklikkus (AN-03 p 3)

def kontrolli_viiteid(t: dict[str, list[dict]]) -> list[str]:
    vead = []
    isikud = {r["isik_id"] for r in t["isikud"]}
    koosseisud = {r["koosseis_id"] for r in t["koosseisud"]}
    koosolekud = {r["koosolek_id"] for r in t["koosolekud"]}
    if len(isikud) != len(t["isikud"]):
        vead.append("isikud: korduvad isik_id-d")
    for tabel, veerud in (("valimised", ["isik_id"]), ("muutused", ["isik_id", "asendaja_ID", "asendatav_ID"]),
                          ("osavott", ["isik_id"]), ("koosolek_juhatajad", ["isik_id"])):
        for r in t[tabel]:
            for v in veerud:
                if r[v] and r[v] not in isikud:
                    vead.append(f"{tabel}: {v}={r[v]} puudub isikute tabelist")
    for tabel in ("koosolekud", "muutused", "valimised", "osavott"):
        for r in t[tabel]:
            if r["koosseis_id"] not in koosseisud:
                vead.append(f"{tabel}: koosseis_id={r['koosseis_id']!r} tundmatu")
    for tabel in ("koosolek_juhatajad", "osavott"):
        for r in t[tabel]:
            if r["koosolek_id"] not in koosolekud:
                vead.append(f"{tabel}: koosolek_id={r['koosolek_id']} tundmatu")
    if "nimekirjad" in t:
        nimekirjad = {r["nimekiri_id"] for r in t["nimekirjad"]}
        for tabel in ("valimised", "valimisnimekirjad"):
            for r in t[tabel]:
                if r.get("nimekiri_id") and r["nimekiri_id"] not in nimekirjad:
                    vead.append(f"{tabel}: nimekiri_id={r['nimekiri_id']} puudub nimekirjade tabelist")
    return vead


# ---------------------------------------------------------------- võrdlus (AN-03 p 1)

VOTMED = {
    "isikud": ["isik_id"],
    "koosseisud": ["koosseis_id"],
    "koosolekud": ["koosolek_id"],
    "koosolek_juhatajad": ["koosolek_id", "juhataja_nimi"],
    "muutused": ["muutus_id"],
    "valimised": ["aasta", "roll", "isik_id"],
    "osavott": ["koosolek_id", "staatus", "nimi_toor"],
    "nimekirjad": ["nimekiri_id"],
    "valimisnimekirjad": ["aasta", "nr", "nimi"],
}


def vormingus(v: str) -> str:
    """Vormingu-ainult erinevused (vana pandas-väljund "1871.0", "1901-05-25 00:00:00")."""
    v = re.sub(r"^(-?\d+)\.0$", r"\1", v)
    return re.sub(r"^(\d{4}-\d{2}-\d{2}) 00:00:00$", r"\1", v)


def loe_csv(tee: str) -> list[dict]:
    with open(tee, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def vordle(nimi: str, vana: list[dict], uus: list[dict]) -> dict:
    votmed = VOTMED[nimi]
    veerud = [v for v in (uus[0].keys() if uus else []) if not v.startswith("_")]

    def grupid(read):
        g: dict[tuple, list[dict]] = defaultdict(list)
        for r in read:
            g[tuple(r.get(k, "") for k in votmed)].append(r)
        return g

    gv, gu = grupid(vana), grupid(uus)
    lisatud, eemaldatud, muudetud = [], [], []
    vormingu_ridu = 0
    veerumuutused: Counter = Counter()
    for voti in list(dict.fromkeys([*gv.keys(), *gu.keys()])):
        a, b = list(gv.get(voti, [])), list(gu.get(voti, []))
        # paarid: kõigepealt sisult võrdsed, siis järjekorras
        for r in list(a):
            for s in b:
                if all(vormingus(r.get(c, "")) == vormingus(s.get(c, "")) for c in veerud):
                    a.remove(r)
                    b.remove(s)
                    if any(r.get(c, "") != s.get(c, "") for c in veerud):
                        vormingu_ridu += 1
                    break
        for r, s in zip(a, b):
            erin = {c: (r.get(c, ""), s.get(c, "")) for c in veerud
                    if vormingus(r.get(c, "")) != vormingus(s.get(c, ""))}
            veerumuutused.update(erin.keys())
            muudetud.append((voti, erin))
        lisatud += [(voti, s) for s in b[len(a):]]
        eemaldatud += [(voti, r) for r in a[len(b):]]
    return {"vana": len(vana), "uus": len(uus), "lisatud": lisatud, "eemaldatud": eemaldatud,
            "muudetud": muudetud, "vormingu_ridu": vormingu_ridu, "veerud": veerumuutused}


def raport(tulemused: dict[str, dict], detail: int = 40) -> str:
    o = io.StringIO()
    p = lambda s="": print(s, file=o)  # noqa: E731
    p("# Võrdlus: vana data/*.csv ↔ uus (Excelist)")
    p()
    p("| Tabel | Vana → uus | Lisatud | Eemaldatud | Muudetud | Ainult vorming |")
    p("|---|---|---|---|---|---|")
    for n, t in tulemused.items():
        p(f"| {n} | {t['vana']} → {t['uus']} | {len(t['lisatud'])} | {len(t['eemaldatud'])} | "
          f"{len(t['muudetud'])} | {t['vormingu_ridu']} |")
    for n, t in tulemused.items():
        if not (t["lisatud"] or t["eemaldatud"] or t["muudetud"]):
            continue
        p()
        p(f"## {n}")
        if t["veerud"]:
            p("Muudetud veerud: " + ", ".join(f"{c} {k}" for c, k in t["veerud"].most_common()))
        for silt, read in (("+", t["lisatud"]), ("-", t["eemaldatud"])):
            for i, (voti, r) in enumerate(read):
                if i >= detail:
                    p(f"  {silt} … veel {len(read) - detail}")
                    break
                p(f"  {silt} {'/'.join(voti)}: " + "; ".join(f"{k}={v}" for k, v in r.items()
                                                           if v and not k.startswith("_") and k not in VOTMED[n])[:220])
        for i, (voti, erin) in enumerate(t["muudetud"]):
            if i >= detail:
                p(f"  ~ … veel {len(t['muudetud']) - detail}")
                break
            p(f"  ~ {'/'.join(voti)}: " + "; ".join(f"{c}: {a!r} → {b!r}" for c, (a, b) in erin.items())[:400])
    return o.getvalue()


# ---------------------------------------------------------------- põhiprogramm

def kirjuta_csv(tee: str, veerud: list[str], read: list[dict]) -> None:
    with open(tee, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=veerud, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(read)


def teisenda(kaust: str) -> tuple[dict[str, list[dict]], list[str], Counter]:
    aliased = loe_aliased()
    alias_loendur: Counter = Counter()
    _, isikud_x, _ = loe_leht(kaust, "TLV_isikud.xlsx")
    _, koosseisud_x, _ = loe_leht(kaust, "TLV_koosseisud.xlsx", lingid=True)
    _, koosolekud_x, _ = loe_leht(kaust, "TLV_koosolekud.xlsx")
    _, muutused_x, _ = loe_leht(kaust, "TLV_muutused_protokollides.xlsx")
    _, valimised_x, _ = loe_leht(kaust, "TLV_valimised.xlsx")
    _, nimekirjad_x, _ = loe_leht(kaust, "TLV_nimekirjad.xlsx", "Sheet2")
    _, valimisnimekirjad_x, _ = loe_leht(kaust, "TLV_nimekirjad.xlsx", "Sheet1")

    isikud = tee_isikud(isikud_x, aliased, alias_loendur)
    koosseisud = tee_koosseisud(koosseisud_x)
    maara = KoosseisuMaaraja(koosseisud)
    koosolekud = tee_koosolekud(koosolekud_x, maara)
    muutused = tee_muutused(muutused_x, maara, aliased, alias_loendur)
    valimised = tee_valimised(valimised_x, koosseisud, aliased, alias_loendur)
    tabelid = {"isikud": isikud, "koosseisud": koosseisud, "koosolekud": koosolekud,
               "muutused": muutused, "valimised": valimised}
    logi = rakenda_parandused(tabelid)
    # AP-01 jt võivad muuta kuupäeva → koosseis ja nädalapäev uuesti
    for k in koosolekud:
        k["nadalapaev"] = nadalapaev(k["kuupaev"])
        k["koosseis_id"] = maara(k["kuupaev"])
    tabelid["koosolek_juhatajad"] = tee_juhatajad(koosolekud, isikud)
    tabelid["osavott"] = tee_osavott(koosolekud, isikud, valimised, muutused)
    seo_nimekirjad(valimised, loe_nimekirjade_vasted())
    tabelid["nimekirjad"] = tee_nimekirjad(nimekirjad_x)
    tabelid["valimisnimekirjad"] = tee_valimisnimekirjad(valimisnimekirjad_x, tabelid["nimekirjad"])
    return tabelid, logi, alias_loendur


VALJUNDID = [("isikud", ISIKUD_VEERUD), ("koosseisud", KOOSSEISUD_VEERUD), ("koosolekud", KOOSOLEKUD_VEERUD),
             ("koosolek_juhatajad", JUHATAJAD_VEERUD), ("muutused", MUUTUSED_VEERUD),
             ("valimised", VALIMISED_VEERUD), ("osavott", OSAVOTT_VEERUD),
             ("nimekirjad", NIMEKIRJAD_VEERUD), ("valimisnimekirjad", VALIMISNIMEKIRJAD_VEERUD)]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sisend", nargs="?", default="andmed_excel")
    ap.add_argument("valjund", nargs="?", default="data")
    ap.add_argument("--kontrolli", action="store_true", help="ainult võrdlusraport, CSV-sid ei kirjutata")
    ap.add_argument("--raport", help="kirjuta võrdlusraport ka faili")
    ap.add_argument("--detail", type=int, default=40, help="mitu rida iga liigi kohta raportis")
    a = ap.parse_args(argv)

    try:
        tabelid, logi, aliasi = teisenda(a.sisend)
    except NimekirjaViga as e:
        print(f"VIGA: {e}", file=sys.stderr)
        return 2
    vead = kontrolli_viiteid(tabelid)

    tulemused = {}
    for nimi, veerud in VALJUNDID:
        vana_tee = os.path.join(a.valjund, f"{nimi}.csv")
        uus = [{v: r.get(v, "") for v in veerud} for r in tabelid[nimi]]
        if os.path.exists(vana_tee):
            tulemused[nimi] = vordle(nimi, loe_csv(vana_tee), uus)
    tekst_ = raport(tulemused, a.detail)

    o = io.StringIO()
    print(tekst_, file=o)
    print("## Parandused (scripts/andmeparandused.json)", file=o)
    for r in logi:
        print("  " + r, file=o)
    print("## Aliased (scripts/isik-aliased.json)", file=o)
    print("  " + (", ".join(f"{k}: {v}" for k, v in aliasi.items()) or "ühtegi alias-ID-d tabelites ei esinenud"),
          file=o)
    os_ = tabelid["osavott"]
    kc = Counter(r["sidumise_kindlus"] for r in os_)
    print(f"## Osavõtt: {len(os_)} rida; " + ", ".join(f"{k} {kc[k]}" for k in ("kõrge", "keskmine", "mitmene", "puudub")),
          file=o)
    print(f"## Hoiatused ({len(hoiatused)})", file=o)
    for h in hoiatused:
        print("  " + h, file=o)
    print(f"## Viidete terviklikkus: {'OK' if not vead else f'{len(vead)} viga'}", file=o)
    for v in vead[:50]:
        print("  " + v, file=o)
    valja = o.getvalue()
    print(valja)
    if a.raport:
        with open(a.raport, "w", encoding="utf-8") as f:
            f.write(valja)
    if vead:
        print("Viidete vead — CSV-sid ei kirjutatud.", file=sys.stderr)
        return 1
    if not a.kontrolli:
        os.makedirs(a.valjund, exist_ok=True)
        for nimi, veerud in VALJUNDID:
            kirjuta_csv(os.path.join(a.valjund, f"{nimi}.csv"), veerud, tabelid[nimi])
        print(f"Kirjutatud: {', '.join(n + '.csv' for n, _ in VALJUNDID)} → {a.valjund}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
