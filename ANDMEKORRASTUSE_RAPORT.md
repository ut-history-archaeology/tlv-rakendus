# Andmekorrastuse raport — Tartu Linnavolikogu 1917–1941

Kuupäev: 14.08.2026. Sisend: 5 Exceli tabelit + lähteülesande dokument.
Väljund: 8 puhastatud CSV-faili kaustas `data/` + andmesõnastik (data/README.md).

## Mida tegin

| Töö | Tulemus |
|---|---|
| Kuupäevade normaliseerimine | Kõik kuupäevad ISO-vormis; mitmikkuupäevad ("23,24", "12,13") lahutatud algus/lõpp-veergudeks; osalised kuupäevad (ainult aasta) säilitatud osalisena |
| Nädalapäevade arvutamine | Kõigil 337 koosolekul (algtabelis tühi) |
| Koosolekute sidumine koosseisudega | 337/337 kuupäevavahemike järgi, sh 1940 ja 1940–41 eriperioodid |
| Juhatajate sidumine isiku-ID-dega | 328 juhatamiskirjet, 327 seotud; ainus erand Robert Sinka (pole volinike tabelis, 1940–41 periood) |
| `kohal_TLV_arv` "20;23" lahutamine | Kahepäevaste koosolekute kohalolu eraldi veergudes |
| Muutuste normaliseerimine | 633 rida, koosseis lisatud; 3 rida ilma isikuta (allikas ei nimeta) |
| Valimiste normaliseerimine | 1092 rida, koosseis_id lisatud |
| **Osavõtu-tabeli tuletamine** | 5087 kirjet parsitud kohal/puudub-stringidest; nimede sidumine ID-dega: **93,1% seotud** (kõrge kindlus 4577, keskmine 159, mitmene 26, sidumata 325) |
| Nimekirjavariantide tööfail | 140 varianti aastate kaupa, veerud kanoniseerimiseks ette valmistatud |
| Viitamisterviklikkuse valideerimine | Kõik isik_id/koosseis_id viited kõigis tabelites klapivad (automaatkontroll) |

## Olulised leiud (erinevused lähteülesande dokumendist)

1. **Asendusliikmed on JUBA isikute tabelis** — dokument räägib 182 lisamata
   asendusliikmest, aga tegelikult on kõik 633 muutuse-rea ja 1092
   valimiste-rea ID-d olemas 404-realises isikute tabelis. Seda eeltööd
   polnud vaja teha.
2. **Juhatajad on JUBA täisnimedena** — sidumine ID-dega oli triviaalne,
   mitte eraldi Liisi töö.
3. Isikuid on 404, mitte 286 (dokumendi arv oli enne asendusliikmete lisamist).

## Osavõtu sidumise metoodika

Nimed normaliseeriti (w→v, õ/ö ühtlustus, OCR-topelttähed, sch/tsh-variandid),
initsiaalid ja mitmetähelised eesnimelühendid (Ed., Joh., J.O.) eraldati,
tiitlid (Dr.) eemaldati. Sidumine toimus kahes astmes: esmalt kitsendatud
vastava koosseisu liikmete hulka (→ kindlus "kõrge"), siis kogu isikute
tabelisse (→ "keskmine"). Mitmetähenduslikud ("Raudsepp II") märgiti
"mitmene", ilma vasteta "puudub".

Sidumata 325 kirjest ~100 on 1940–41 nõukogude perioodi linnavalitsuse
liikmed (Beganitskaja, Lange, Johani, Taev, Kivissaar jt), keda volinike
tabelis põhimõtteliselt polegi; ülejäänu on OCR-müra ("91288 aahlel F. Lange",
"4 w t"). Neid isikutena juurde ei loonud — see on sisuline otsus, mille
peab tegema andmestiku omanik.

## Mida ma EI korrastanud (vajab teie otsust või välisressurssi)

1. **JSON-protokollid** — faile projektis pole. Protokollide leht ja kõik
   sellest sõltuv (päevakorrad, täistekstiotsing, mainimised) jäid
   lähteülesandest välja.
2. **Aadresside geokodeerimine** — vajab geokodeerimisteenust (Nominatim,
   Maa-amet vms), millele siit keskkonnast ligipääsu pole. Kaardileht jäi
   välja; aadressid kuvatakse tekstina.
3. **Nimekirjade kanoniseerimine** — sisuline ajaloolise ekspertiisi töö
   (dokumendi järgi Sven + Liisi). Valmistasin ette tööfaili
   `data/nimekirjad_variandid_TAITMISEKS.csv` (140 varianti aastate kaupa,
   tühjad veerud kanoonilise nime/ID jaoks). Kui see täidetud, saab
   rakendusse lisada ühe join'iga.
4. **Robert Sinka** ja 1940–41 linnavalitsuse liikmed — kas lisada isikute
   tabelisse, on sisuline otsus (nad polnud volinikud).
5. **3 muutust ilma isikuta** (jk_kronol 39, 232, 485) — vajavad
   arhiivikontrolli.

## Failid

```
data/
  isikud.csv                          404 rida
  koosseisud.csv                        9 rida
  koosolekud.csv                      337 rida
  koosolek_juhatajad.csv              328 rida
  muutused.csv                        633 rida
  valimised.csv                      1092 rida
  osavott.csv                        5087 rida (tuletatud)
  nimekirjad_variandid_TAITMISEKS.csv 140 rida (tööfail)
  README.md                           andmesõnastik
CLAUDE_CODE_ULESANNE.md               lähteülesanne rakenduse ehitamiseks
```
