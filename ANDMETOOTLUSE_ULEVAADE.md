# Andmetöötluse ülevaade

Seis 12.11.2026 (4. etapp). Kuidas algandmed jõuavad rakendusse, millised reeglid kehtivad ja
kus need on kirjas. Andmesõnastik (veerud): `data/README.md`. Lahtised vastuolud: `README.md`
jaotis "Lahtised andmeküsimused" ja kontrollleht `/kontroll`. Viitekujud: `VIITED.md`.

## 1. Andmevoog

```
andmed_excel/TLV_*.xlsx ──┐
scripts/andmeparandused.json (AP-01…)  ──┤
scripts/isik-aliased.json (301 → 257)  ──┼─ npm run andmed (scripts/excel-csv.py, Python) ─→ data/*.csv (gitis)
scripts/nimekirjad-vasted.csv (139)    ──┘                                                       │
                                                                                                 │
korpus/json/*.json (EstNLTK, ei muudeta) ─┐                                                      │
data/protokolli_lehed.csv, public/pildid/ ┼─ npm run eeltootle (tsx) ─→ public/protokollid/ (gitignore)
scripts/protokollid-vasted.json          ─┘                         └─→ data/protokollid.csv,
                                                                       paevakorrapunktid.csv,
                                                                       protokolli_mainimised.csv
                                                                                                 │
                                       next build (lib/data.ts → lib/derive.ts) ─→ out/ (staatiline)
```

- `data/*.csv`-sid **ei muudeta käsitsi**: parandus läheb Excelisse või
  `scripts/andmeparandused.json`-i (põhjusega), seejärel `npm run andmed`.
- `npm run andmed:kontrolli` kirjutab ainult võrdlusraporti (vana `data/*.csv` ↔ uus):
  lisatud/eemaldatud/muudetud read tabeli kaupa, parandused, aliased, hoiatused, viidete
  terviklikkus. Viidete vea korral CSV-sid ei kirjutata.
- Buildis Pythonit ei käivitata; CSV-d on commititud. ZIP `public/tlv-andmestik.zip`
  (`npm run zip-data`, pre-build) = `data/*.csv` + `data/README.md`.

## 2. Teisendusreeglid (`scripts/excel-csv.py`)

| Tabel | Reeglid |
|---|---|
| isikud | Kuupäevad ISO; osaline jääb osaliseks ("1871", "1871-09"); toortekst ("1899 või varem") jääb |
| koosseisud | `koosseis_id` = `aastad_koosolekud` mõttekriips → sidekriips; mitmepäevased valimised algus/lõpp; **AN-04** `volikogu_suurus` "65/33" → algne 65, hiljem 33, muutuse kuupäev = esimene koosolek, mille `koosseis_arv` = 33 (1934-04-09); "-" → tühi; Exceli hüperlingid → `*_allikas_url` |
| koosolekud | K-ID Exceli reajärjekorras; `koosseis_id` kuupäeva järgi (viimane koosseis, mille esimene koosolek ≤ kuupäev); `kohal_arv` "20;23" → kaks veergu; nädalapäev arvutatud |
| koosolek_juhatajad | `juhataja_korrast` `;`-ga tükeldatud, isik täpse "Eesnimi Perenimi" järgi |
| muutused | ID-aliased (`isik_id`, `asendaja_ID`, `asendatav_ID`); `koosseis_id` kuupäeva järgi |
| valimised | ID-aliased; **VK-02** `allikas`: valitud → `tulemused`, valitav → `kandidaadid`, 1917 kirillitsas perenimi → `kandidaadid_vene` (Exceli veerg `allikas`, kui lisatakse, on ülimuslik); **NK-01** `nimekiri_id` vastete tabelist (aasta + nr + toorkuju, alguse/lõpu tühikud ei loe; uus toorkuju → skript katkeb) |
| osavott | Parsitakse `kohal_TLV`/`puudub_TLV` väljadest; sidumine 1) koosseisu liikmete hulgast → kõrge, 2) kogu isikute tabelist → keskmine, mitu → mitmene, vasteta → puudub (detailid `README.md` "Andmeuuendus 12.11.2026") |
| nimekirjad | `TLV_nimekirjad.xlsx` Sheet2 (35 kanoonilist) |
| valimisnimekirjad | Sheet1 (78 ametlikku); `nimekiri_id` Sheet2 aastaveergudest: 1917–1923 numbri, 1926–1934 nime järgi (1929 "… (eesotsas X)" ilma sulgudeta); vasteta → hoiatus (1917 nr 3 "Tagasi võetud") |

Exceli veaväärtused (`#REF!`, `#VALUE!`) → tühi + hoiatus. Parandus, mis on allikas juba sees,
jääb mõjuta ja annab hoiatuse "parandus on allikas juba sees — eemalda".

## 3. Rakenduses tuletatud väärtused (`lib/derive.ts`)

Põhimõte: **andmevastuolusid ei lahendata koodis heuristikaga**. Allpool on kõik
dokumenteeritud tuletusreeglid; kõik muu kuvatakse nagu allikas.

- **Liikmelisus kuupäeval D** (erireegel 1): valitud (`valimised` `roll=valitud`) + liitumised
  kuni D − lahkumised enne D; `liitumine&lahkumine` sulgeb avatud lõigu sel päeval (PA-09).
- **Tuletatud kohalolu**: kehtivad liikmed − protokollis nimetatud puudujad; alati märgitud
  "tuletatud".
- **Sündmused** (UX-06): kinnitamine, vahetus (täpne lahkumine↔liitumine paar), ülejäänud 1:1.
- **Peamine nimekiri** (NK-03): sagedasim kanooniline nimekiri isiku valimisridades, eelistab
  valitud-ridu; ajutised vasted (staatus KONTROLLIDA) märkega "vaste kontrollimisel".
- **Valimiste kaart** (VK-01…03): üks kaart isiku × aasta kohta; iga väärtuse juures rea
  allikas ja viide koosseisu tabelist; sama väärtus mitmest allikast → üks väärtus, kõik viited;
  viite puudumisel "VIIDE PUUDU".
- **Liikmeks saamise kirje puudub** (PA-06): 0 koosseisu, kuid muutustes või osavõtus
  (kõrge/keskmine) tõendeid → tabelis "?", profiilil tõendid; liikmelisust juurde ei tuletata
  (L-06; sama reegel kontrolllehel KT-05a).
- **Protokolliviide → koosolek** (PA-07): muutuse `allikaviide` (säilik:kaader) →
  `protokolli_lehed.csv` (`arhiiviviide` + `lehekulg`) → protokoll → `koosolek_id`; mitme
  vaste korral valitakse muutuse kuupäevaga koosolek, muidu linki ei tehta (633/633 leitud).
- **Arhiiviviite link** (PA-10, `lib/viited.ts`): `https://www.ra.ee/dgs/_purl.php?shc=<viide>`;
  number pärast `:` = RA digikaader; vahemik → esimene kaader; `>` = kaadri eraldaja;
  `134a/134b` → kaader 134.

## 4. Kontrollid

- `python3 -m unittest scripts/test_excel_csv.py` — teisendusreeglid (TE4-01, TE4-03).
- `npm test` — tuletusreeglid ja päris andmete aktsepteerimisjuhud.
- `npm run kontroll` / `/kontroll` — tabelite omavaheline vastavus (KT-01…KT-06).
- `npm run eeltootle -- --kontrolli` — korpuse ID-d, lehed, pildid.
