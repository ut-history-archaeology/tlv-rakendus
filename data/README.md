# Tartu Linnavolikogu 1917–1941 — korrastatud andmestik

Kõik failid on UTF-8 kodeeringus CSV-d (komaeraldajaga). Kuupäevad ISO-vormis
(`YYYY-MM-DD`; osalised kuupäevad `YYYY` või `YYYY-MM`, kui täpsem info puudub).

## Failid ja seosed

```
isikud.csv (isik_id) ←── valimised.csv (isik_id, koosseis_id)
        ↑                muutused.csv (isik_id, asendaja_ID, asendatav_ID, koosseis_id)
        ↑                osavott.csv (isik_id, koosolek_id, koosseis_id)
        ↑                koosolek_juhatajad.csv (isik_id, koosolek_id)
koosseisud.csv (koosseis_id) ←── koosolekud.csv (koosseis_id)
                                 koosolekud.csv (koosolek_id) ←── protokollid.csv (koosolek_id, fail)
                                                                  paevakorrapunktid.csv (koosolek_id)
                                                                  protokolli_mainimised.csv (isik_id, koosolek_id)
korpus/json/<fail>.json ←── protokolli_lehed.csv (protokoll) ──→ public/pildid/{1200,300}/<pilt>
```

Protokollide täistekst ja märgendused on eeltöödeldud kujul `public/protokollid/`
(genereeritud, gitis ei ole; vt `README.md`).

## isikud.csv — 404 rida
| Veerg | Kirjeldus |
|---|---|
| isik_id | Unikaalne ID (1–410, kuus numbrit vahelt puudu — normaalne) |
| perenimi, alt_perenimi | Perekonnanimi + alternatiivkujud (komaga eraldatud) |
| eesnimi, alt_eesnimi | Eesnimi + alternatiivkujud |
| sugu | m/n |
| isanimi | Isanimi (vene traditsioon), kui teada |
| synd_kuupaev, surm_kuupaev | ISO, võib olla osaline (ainult aasta) |
| synd_tuletatud | Märge, kui sünniaasta on tuletatud (nt vanusest) |
| wikidata, arhiiviviited, AKL_ID | Välisviited |

## koosseisud.csv — 9 rida
`koosseis_id` on inimloetav slug (nt `1921-1923`, `1940-1941`). Sisaldab
valimiste algus/lõpu-kuupäeva (mitmepäevased valimised!), esimese ja viimase
koosoleku kuupäeva ning arhiiviviiteid. Viimane rida on erikoosseis
"linnavalitsus linnavolikogu ülesandeis" (1940–1941, nõukogude periood).

## koosolekud.csv — 338 rida
| Veerg | Kirjeldus |
|---|---|
| koosolek_id | K001…K337 kronoloogilises järjekorras; **K338** (13.11.1940, protokoll nr 28) on lisatud 27.10.2026 korpuse põhjal ja ei ole ID-järjekorras kronoloogiline — järjesta alati `kuupaev` (+ `koosolek_id`) järgi, mitte ID järgi |
| kuupaev, kuupaev_lopp | ISO; kuupaev_lopp täidetud ainult kahepäevastel koosolekutel |
| nadalapaev | Arvutatud (esmaspäev…pühapäev) |
| vorm | korraline / erakorraline / linnavalitsus linnavolikogu ülesandeis / pidulik / tühi (35 koosolekul allikas ei täpsusta) |
| koosseis_id | Tuletatud kuupäeva järgi koosseisude vahemikest |
| juhataja | Toorstring; struktureeritud kuju eraldi tabelis koosolek_juhatajad.csv |
| koosseis_arv | Volikogu suurus sel hetkel (kui allikas ütleb) |
| kohal_arv, kohal_arv_2paev | Kohalolnute arv; teine veerg kahepäevase koosoleku 2. päeva kohta |
| kuupaev_txt | Algne kuupäevastring protokollist |
| protokolli_algus_txt | Protokolli alguslõigu OCR-tekst (toores, müraga) |

## koosolek_juhatajad.csv — 328 rida
Koosoleku × juhataja sidumine: `koosolek_id`, `juhataja_nimi`, `isik_id`.
Ühel koosolekul võib olla 2 juhatajat. **Ainus sidumata nimi: Robert Sinka**
(1940–41 periood, teda pole volinike tabelis) — `isik_id` tühi.

## muutused.csv — 633 rida
| Veerg | Kirjeldus |
|---|---|
| muutus_id | Kronoloogiline jrk-nr |
| isik_id | 3 real tühi (allikas ei nimeta isikut) |
| kuupaev, koosseis_id | ISO + tuletatud koosseis |
| liik | liitumine (413) / lahkumine (174) / liitumine&lahkumine (25) / rühmavahetus (20) / peatamine (1) |
| liitus_prot, lahkus_prot, ryhmavahetus_prot, peatatud_prot | Protokolliviited kuupäevana |
| asendaja_ID, asendatav_ID | Viide isikule, kes asendas / keda asendati |
| asendaja_puudub, asendatav_puudub | jah/ei — kas asendussuhe on allikas puudu |
| nimekiri, allikaviide, täpsustus | Toorandmed |

## valimised.csv — 1092 rida
Iga rida = (isik, valimisaasta, roll). `roll`: `valitud` (455 — sai volikokku)
või `valitav` (637 — oli kandidaat). `koosseis_id` lisatud. 1939. aastal on
ringkonnad (1–4) ja häältearvud (`hääled_kokku` jt), nimekirjanimed puuduvad.
Aadressiväljad (`elukoht_tänav` jne) on täidetud 713 real (peamiselt 1926,
1929, 1934 valimistelt). **NB: `nimekiri_nimi` on KANONISEERIMATA toorkuju**
(134 varianti) — vt nimekirjad_variandid_TAITMISEKS.csv.

## osavott.csv — 5087 rida (TULETATUD tabel)
Parsitud koosolekute kohal/puudub-stringidest.
| Veerg | Kirjeldus |
|---|---|
| koosolek_id, kuupaev, koosseis_id | Viited |
| staatus | kohal / puudub (nagu protokoll ütleb) |
| nimi_toor | Algne nimekuju protokollist (OCR-müraga) |
| isik_id | Seotud isik (93,1% ridadest) |
| sidumise_kindlus | kõrge (4577 — perenimi+initsiaal klapib koosseisu liikmega) / keskmine (159 — klapib üldnimestikuga, mitte koosseisuga) / mitmene (26 — mitu kandidaati, nt "Raudsepp II") / puudub (325 — OCR-müra või isik pole tabelis, peamiselt 1940–41 linnavalitsuse liikmed) |

**Kohaloleku tuletamise reegel** (Toivo märkus lähtedokumendis): enamikul
koosolekutel (302/338) loetleb protokoll ainult PUUDUJAID. Kohalolijate
nimekiri tuleb tuletada: koosseisu sel kuupäeval kehtivad liikmed MIINUS
puudujad. Kehtivad liikmed = valimised(roll=valitud) + muutused
(liitumised/lahkumised kuupäevani). See tuletus tuleb teha rakenduses;
osavott.csv sisaldab ainult protokollis otsesõnu nimetatud isikuid.

## protokolli_lehed.csv — 7121 rida (SISEND, 2. etapp)
Protokoll × arhiivileht × pilt. `protokoll` = korpuse failinimi (`korpus/json/*.json`),
`jrk` 1…n protokolli sees, `arhiiviviide` (nt `ERA.2966.2.57`), `lehekulg` (arhiivi lk,
võib olla `134a`), `xml_file` (korpuse `textline_info.xml_file`; tühi, kui leht on
tekstita), `pilt` (`<aasta>/<säilik>_<lk>.png` kaustades `public/pildid/1200` ja `/300`),
`transkribus_lk` (Transkribuse lehe järjekorranumber — ≠ arhiivi lk!), `tekstita` (0/1).
28 tekstita lehte 23 protokollis; jagatud lehed 134/134a/134b (1934-04-30) ja
254/254a/254b (1937-05-31) on kolmel real sama pildiga.

## protokollid.csv — 338 rida (GENEREERITUD: `npm run eeltootle`)
Üks rida koosoleku kohta: 337 protokolliga (`fail` täidetud) + K336 ilma protokollita
(`markus` = "ärakiri K335-st, protokollifaili pole"). Veerud: `koosolek_id, fail,
kuupaev_1, kuupaev_2, transkribus_url, arhiiviviide, lehekylgi, lehekylgi_tekstita,
esimene_lk, viimane_lk, sonu, lauseid, paevakorrapunkte, olemeid, olemeid_PER,
seotud_isikuid, konesid, tekst_kb, lisasid, tabeleid, markus`. `sonu` = tähte või numbrit
sisaldavad sõnad (kirjavahemärgid välja). `markus` sisaldab sidumishoiatusi ("käsitsi
vaste", "korpuse kuupäev … ≠ CSV …"). Protokoll ↔ koosolek vasted: automaatreegel
(failinime kuupäev; sama päeva paaril sufiksita fail = väiksem ID) + käsitsi tabel
`scripts/protokollid-vasted.json`.

## paevakorrapunktid.csv — 3511 rida (GENEREERITUD)
`koosolek_id, jrk, nr, pealkiri, algus, lopp, sonu`. `nr` = allika numeratsioon
(`agenda_points.number`; võib olla lünkadega, nt "3 ja 4." → 4; K002-s korduv),
`jrk` = positsioon protokollis 1…n (alati unikaalne). `pealkiri` ilma algusnumbrita,
reavahetused tühikuteks. `algus`/`lopp` = märgikohad protokolli tekstis
(`public/protokollid/<koosolek_id>.json` → `tekst`). 4 protokollil punkte pole
(1921-03-01, 1922-08-28, 1934-09-24, 1937-09-06).

## protokolli_mainimised.csv — 11742 rida (GENEREERITUD)
`isik_id, koosolek_id, kuupaev, kindlus, arv` — mitu korda isik on protokollis
automaatselt tuvastatud nimeüksusena nimetatud. `kindlus`: kõrge (üheselt seotud) /
keskmine (ebakindel vaste: OCR-viga või Levenshteini lähedus) / mitmene (ainult
registriväline mitmesus "N;None": volinik klapib, aga sama nimega võib esineda
mitte-volinik). Mitme kandidaadiga olemid ei loe ühelegi isikule. Sidumine on
automaatne (keelemudel) ja võib sisaldada vigu.

## nimekirjad_variandid_TAITMISEKS.csv — 140 rida
Tööfail nimekirjade kanoniseerimiseks (Sven/Liisi täidavad veerud
`kanooniline_nimi` ja `kanooniline_id`). Rakendus kasutab seni toorkujusid.

## Andmeparandused (2. etapp, 27.10.2026)

Tehtud protokollikorpuse (`korpus/json/`) ja `koosolekud.csv` võrdlemisel;
otsused O-01 ja O-02 kinnitas andmestiku omanik 20.10.2026
(`CLAUDE_CODE_ULESANNE_2.md`, ptk 3.5 ja 4.0).

| Nr | Fail | Parandus | Põhjendus |
|---|---|---|---|
| AP-01 | `koosolekud.csv` K026 | `kuupaev` 1920-02-29 → **1920-03-29**, `kuupaev_lopp` 1920-02-30 → **1920-03-30**, `nadalapaev` pühapäev → **esmaspäev** | 30.02.1920 ei ole olemas; protokolli tekst ütleb "29 ja 30 märtsil 1920"; koosolek asub tabelis K025 (23.–24.02.1920) ja K027 (26.04.1920) vahel. Korpuse fail jääb nimega `1920-02-29_1920-03-30.json`, vaste K026-le on käsitsi (`scripts/protokollid-vasted.json`). |
| AP-01 | `osavott.csv` K026 (13 rida) | `kuupaev` → 1920-03-29 | sama |
| AP-02 | `koosolekud.csv` uus rida **K338** | 13.11.1940, kolmapäev, linnavalitsus linnavolikogu ülesandeis, koosseis 1940-1941; `kuupaev_txt` "13. novembril 1940"; `protokolli_algus_txt` = korpuse faili `1940-11-13.json` sissejuhatus (tekst enne 1. päevakorrapunkti, reavahetused tühikuteks); muud veerud tühjad | Korpuses on 13.11.1940 kohta kaks protokolli (nr 28 ja nr 29), algses `TLV_koosolekud.xlsx`-is ainult üks rida (K329 = nr 29). K338 pärineb seega korpusest, mitte algtabelist. `koosolek_juhatajad.csv`-sse rida ei lisatud (K. Jalak pole volinike tabelis, vrd Robert Sinka); `osavott.csv`-s K338 ridu ei ole (vt `README.md` "Lahtised andmeküsimused" L-01). |
| AP-03 | `koosolekud.csv` K336 | jääb omaette reana | K336 (14.01.1941, "Arakiri Protokoll pr. 2") on protokolli nr 2 **ärakiri**; sama protokoll on K335. Korpuses on ainult üks fail `1941-01-14.json` → K335; K336-l protokolli täisteksti ei ole (`protokollid.csv` `markus` = "ärakiri K335-st, protokollifaili pole"). |

Lisaks: K077 (`1923-06-25`) protokolli OCR-tekstis on aastaarv "1925" — CSV
kuupäev 1923 on tõenäoliselt õige (asukoht tabelis, koosseis 1921-1923,
nädalapäev esmaspäev klapib 1923-ga); CSV-d ei muudetud, korpuse fail
`1925-06-25.json` seotakse K077-ga käsitsi.

## Teadaolevad piirangud
- 1917–1919 koosseisu andmed on auklikud (protokollid algavad 1918).
- K336 on K335 protokolli ärakiri (vt AP-03) — tabelis kaks rida sama koosoleku kohta.
- 1940–41 nõukogude perioodi isikud (Beganitskaja, Lange, Johani, Taev jt)
  puuduvad isikute tabelist — osavõtus sidumata.
- 3 muutust ilma isik_id-ta (allikas ei nimeta isikut).
- `protokolli_algus_txt` sisaldab OCR-vigu — kuvamiseks sobiv ettevaatusega.
