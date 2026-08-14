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
```

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

## koosolekud.csv — 337 rida
| Veerg | Kirjeldus |
|---|---|
| koosolek_id | K001…K337 kronoloogilises järjekorras |
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
koosolekutel (302/337) loetleb protokoll ainult PUUDUJAID. Kohalolijate
nimekiri tuleb tuletada: koosseisu sel kuupäeval kehtivad liikmed MIINUS
puudujad. Kehtivad liikmed = valimised(roll=valitud) + muutused
(liitumised/lahkumised kuupäevani). See tuletus tuleb teha rakenduses;
osavott.csv sisaldab ainult protokollis otsesõnu nimetatud isikuid.

## nimekirjad_variandid_TAITMISEKS.csv — 140 rida
Tööfail nimekirjade kanoniseerimiseks (Sven/Liisi täidavad veerud
`kanooniline_nimi` ja `kanooniline_id`). Rakendus kasutab seni toorkujusid.

## Teadaolevad piirangud
- 1917–1919 koosseisu andmed on auklikud (protokollid algavad 1918).
- 1940–41 nõukogude perioodi isikud (Beganitskaja, Lange, Johani, Taev jt)
  puuduvad isikute tabelist — osavõtus sidumata.
- 3 muutust ilma isik_id-ta (allikas ei nimeta isikut).
- `protokolli_algus_txt` sisaldab OCR-vigu — kuvamiseks sobiv ettevaatusega.
