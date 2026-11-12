# Lähteülesanne, 4. etapp: andmeuuendus, kanoonilised nimekirjad ja parandused

Rakendus: Tartu Linnavolikogu 1917–1941 (Next.js, `output: "export"`, `basePath: "/tlv-rakendus"`).
Repo seis: commit `66da3a9` (28.10.2026). Kuupäev: 12.11.2026.

Loe enne alustamist: `CLAUDE.md`, `data/README.md`, `ANDMEKORRASTUSE_RAPORT.md`,
`ANDMEUUENDUS_2026-11_RAPORT.md` (võrdlusraport — **selle etapi faktide allikas**),
`CLAUDE_CODE_ULESANNE_3.md` (UX-03 valimiste kaart, UX-06 sündmused), `VIITED.md`.

Märgistus: **FAKT** = kontrollitud 12.11.2026 uute Excelite ja repo vastu; **OTSUS** =
andmestiku omanik kinnitas 12.11.2026; **LAHTINE** = ootab koosoleku otsust (dokument
„Protokollikorpus ja isikute tabel — koosoleku arutelu“), rakendus kasutab märgitud ajutist
lahendust. Prioriteedid: **PEAB** / **VÕIKS**.

Põhimõtted jäävad: eesti keel, koosseisude palett, "tuletatud"/"automaatne" märgistus,
ekspordivormingud, URL-id ei muutu, **andmevastuolusid ei lahendata koodis heuristikaga**
(erandid on selles dokumendis nimetatud ja dokumenteeritud reeglid).

---

## 1. Sisendid

Kaust `andmed_excel/` (uus, commititakse; ei lähe väljundisse):

| Fail | Read | Muutus võrreldes eelmisega (FAKT) |
|---|---|---|
| `TLV_isikud.xlsx` | 406 | ID 301 kustutatud (liidetud 257-ga); uued 411 Lemm, 412 Sild, 413 Tents; 140 rida täiendatud |
| `TLV_koosseisud.xlsx` | 9 | uued veerud `volikogu_suurus`, `hääled_allikas`; 1917 esimene koosolek 11.09.1917, `valimised_allikas` EAA.2623.1.805; `aastad_koosolekud` mõttekriipsuga (1917–1919); **lahtrites hüperlingid** (DIGAR) veergudes `valimistulemuste_nimekiri_allikas`, `volinike_kandidaatide_nimekiri_allikas` |
| `TLV_koosolekud.xlsx` | 337 | K002 22.01.1918 → 22.02.1918; 29.01.1934 puudujad "E.gur-Mühlen" → "E.zur-Mühlen" |
| `TLV_muutused_protokollides.xlsx` | 633 | #95 isik 301 → 257 |
| `TLV_valimised.xlsx` | 1174 | +79 rida 1917 venekeelne kandidaatide nimekiri (kirillitsas; samad isikud); +4 kandidaati; 301 → 257 |
| `TLV_nimekirjad.xlsx` | Sheet1 78, Sheet2 35 | uus: ametlikud nimekirjad (aasta, nr, nimi, hääled, Wikidata 1–4) ja 35 kanoonilist nimekirja |

Abifail: `scripts/nimekirjad-vasted.csv` = `nimekirjad_vasted_EELNOU.csv` (139 toorkuju →
`nimekiri_id`, meetod, staatus; 3 rida "KONTROLLIDA", vt ptk 3).

---

## 2. Korduvkasutatav andmeteisendus (PEAB)

### AN-01 Skript `scripts/excel-csv.py`

Python 3 + `openpyxl` (mitte `data_only` ainult — vaja ka hüperlinke). Käivitus:
`python3 scripts/excel-csv.py andmed_excel data` (+ `--kontrolli`: kirjutab ainult raporti).
`package.json`: `"andmed": "python3 scripts/excel-csv.py andmed_excel data"`. Buildis **ei**
käivitata (CSV-d on commititud; deploy ei vaja Pythonit).

Väljund = praeguse `data/README.md` skeemiga CSV-d (`isikud`, `koosseisud`, `koosolekud`,
`koosolek_juhatajad`, `muutused`, `valimised`, `osavott`) + uued (`nimekirjad`,
`valimisnimekirjad`, ptk 3). Teisendusreeglid = augustis tehtud korrastus
(`ANDMEKORRASTUSE_RAPORT.md`): ISO-kuupäevad, osalised jäävad osaliseks, mitmepäevased
algus/lõpp-veergudeks, `nadalapaev` arvutatud, `koosseis_id` kuupäevavahemikest
(sidekriipsuga slug `1917-1919` — Exceli mõttekriips normaliseeritakse), K-ID-d Exceli
reajärjekorras K001…K337, juhatajad isik-ID-ga, `kohal_arv` "20;23" kaheks, toorväljad
alles.

**Osavõtt** (`osavott.csv`) parsitakse skriptis uuesti `kohal_TLV`/`puudub_TLV`
väljadest raportis kirjeldatud reeglitega (normaliseerimine w→v, õ/ö, OCR-topelttähed,
initsiaalid, tiitlid; sidumine 1) koosseisu liikmete hulgast → kõrge, 2) kogu tabelist →
keskmine; mitmene; puudub).

### AN-02 Parandused ja aliased eraldi failides

- `scripts/andmeparandused.json` — rakendub pärast Exceli lugemist, iga kirje põhjusega:
  AP-01 K026 kuupäev 1920-03-29/30 (Excelis endiselt 02); AP-02 K338 (13.11.1940, nr 28);
  AP-03 K336 märge. Kui Excel hakkab parandust juba sisaldama, kirje jääb mõjuta ja skript
  hoiatab "parandus on allikas juba sees — eemalda".
- `scripts/isik-aliased.json` = `{"301": 257}` (**OTSUS**). Kasutavad nii `excel-csv.py`
  (kui vana ID esineb tabelites) kui `scripts/eeltootle-protokollid.ts` (korpuse
  `council_member_id`). Korpust **ei muudeta**. Eeltöötluses: ID-de loendis asendatakse
  alias, duplikaadid ühendatakse — `"257;301"` → üks ID 257, kindlus kõrge (11 olemit);
  `"257;301;None"` → 257 + `None` = registriväline mitmesus (7); `"257;269;301;395;None"`
  → 3 kandidaati, mitmene (2). ET-06 valideerimine kontrollib ID-sid **pärast** aliaseid.
- `scripts/protokollid-vasted.json` += `"1918-01-22.json": "K002"` (K002 uus kuupäev,
  **OTSUS** K-03).

### AN-03 Kontroll enne commiti (`--kontrolli` ja CI-test)

1. Võrdlus vana `data/*.csv` ↔ uus: lisatud/eemaldatud/muudetud read tabeli kaupa.
   **Peab vastama** `ANDMEUUENDUS_2026-11_RAPORT.md` ptk 1-le; kõik muud erinevused on
   veaks, mis raporteeritakse ja tuleb enne commiti selgitada.
2. Osavõtt: vanade Excelite + paranduste peal jooksutatuna peab skript andma ≥ 99 %
   identsed `osavott.csv` read; erinevused loendina (dokumenteerida PR-is).
3. Viidete terviklikkus (kõik `isik_id`, `koosseis_id`, `koosolek_id`), korpuse ID-d ⊂
   isikud pärast aliaseid, `npm run eeltootle -- --kontrolli`, `npm test`, `npm run build`.
4. Teadaolev oodatav mõju: K002 osavõtt 27 rida uue kuupäevaga; 29.01.1934 "E.zur-Mühlen"
   võib nüüd isikuga siduda; Engelhardti (257) profiil saab protokollidest 11 kindlat + 7
   tõenäolist mainimist.

### AN-04 Uued koosseisu väljad (PEAB)

- `koosseisud.csv` += `volikogu_suurus` (toortekst), `volikogu_suurus_algne`,
  `volikogu_suurus_hiljem`, `volikogu_suurus_muutus` (kuupäev), `haaled_allikas`,
  `valimistulemuste_allikas_url`, `kandidaatide_allikas_url` (Exceli hüperlingid).
- "65/33" (1934–1939, **OTSUS** K-06): valiti 65, alates **9.04.1934** 33. Muutuse
  kuupäev = esimene koosolek, mille `koosseis_arv` võrdub teise arvuga (FAKT: 2.03.1934 =
  65, 9.04.1934 = 33; aprillis 1934 33 lahkumist). Muud väärtused: arv → `algne`; "-"
  (1940–1941) → tühi.
- Koosseisu leht: päisesse "Volikogu suurus: 65; alates 9. aprillist 1934: 33";
  liikmete arvu ajatelg (UX-07) näitab volikogu suurust astmelise viitejoonena.
  Koosseisude indeksi kaartidele suurus.

---

## 3. Kanoonilised nimekirjad (PEAB)

- **NK-01 Andmed.** `data/nimekirjad.csv` (35; Sheet2: `nimekiri_id, nimi, mitu_osapoolt,
  wikidata`, + aastate kaupa nimekujud). `data/valimisnimekirjad.csv` (78; Sheet1:
  `aasta, nr, nimi, haaled, wikidata_1…4, nimekiri_id`; 1929 alamnimekirjad eraldi ridadena).
  `valimised.csv` += `nimekiri_id` (toorkuju `nimekiri_nimi` jääb). Sidumine
  `scripts/nimekirjad-vasted.csv` järgi (aasta + nr + toorkuju → id); uus toorkuju, mida
  tabelis pole → skript katkeb ja nõuab rea lisamist. 1939 ridadel id tühi (ringkonnad).
  `nimekirjad_variandid_TAITMISEKS.csv` kustutatakse.
- **NK-02 Ajutised vasted (LAHTINE, koosolekule):** 1923 Aleksander Tamm (362, nr 7,
  "Linna rentnikute rühm") → id 20; 1926 Peeter Kase (49) ja Karl Unt (183) → id 24
  (tõenäolisem 25). Vastete failis staatus "KONTROLLIDA"; rakendus kuvab neil ridadel
  kanoonilise nime juures väikese märke "vaste kontrollimisel".
- **NK-03 Kasutajaliides.** Nimekirjafiltrid (isikud, koosseisu liikmed) ja koosseisu
  jaotusdiagramm (KS-03) **kanoonilise nime** järgi; hoiatus "nimekujud on ühtlustamata"
  eemaldatakse; toorkuju tooltipis ja ekspordis. Nimekirja Wikidata link (üks või mitu,
  `mitu_osapoolt`). Koosseisu lehel nimekirjade tabel: ametlik nimi, nr, hääled, valituid
  (Sheet1); jaotusdiagrammi hover lisab hääled. Isikute tabeli veerg "Peamine nimekiri" →
  kanooniline.
  *Aktsepteerimine:* 1926–1929 rahvaerakonna toorkujud (4 kuju) on filtris üks valik
  "Rahvaerakond"; 1929 jaotusdiagrammis üks "Majaomanikud, haridus- ja majandustegelased"
  (3 alamnimekirja häälte summa 3 613); Rütli ja Tamman selle all.

---

## 4. Valimiste kaart allikaviidetega (PEAB, OTSUS K-02)

- **VK-01** Iga isiku ja valimisaasta kohta **üks kaart**, kuhu koonduvad kõik read
  (kandidaatide nimekiri, 1917 venekeelne kandidaatide nimekiri, valimistulemused).
  Asendab UX-03 kaardi ülemineku: allika määramine rea kaupa, mitte rolli kaupa.
- **VK-02 Allikas rea kaupa** (valimistesse uus veerg `allikas`, skript tuletab):
  `valitud` → `tulemused` (viide `koosseisud.valimistulemuste_allikas` + URL);
  `valitav` → `kandidaadid` (viide `kandidaatide_allikas` + URL); 1917 `valitav`, mille
  `perenimi` on kirillitsas → `kandidaadid_vene` (viide puudub, **LAHTINE**).
  Dokumenteeritud reegel `data/README.md`-s; kui Excelisse lisatakse veerg `allikas`,
  kasutatakse seda.
- **VK-03 Iga andmekillu taga viide.** Nimekiri, nr, koht nimekirjas/üldjärjestuses,
  ringkond, hääled, amet, vanus/sünniaeg, aadress, märkused — igal väärtusel järel
  allikaviide (lühike kuju, link kui URL olemas, täiskuju tooltipis). Sama väärtus mitmest
  allikast → üks väärtus, kõik viited; erinevad väärtused → kõik, igaüks oma viitega
  (ei ühtlustata). **Viite puudumisel** kuvatakse väärtuse järel jämedas kirjas
  **VIIDE PUUDU** (`<strong>`), mitte tühi. Kaardi jaluses viidete koondloend ei ole
  vajalik.
- *Aktsepteerimine:* Oskar Allik (6) 1917 — üks kaart; eestikeelne nimekiri ja amet
  viitega "Eestimaa Kubermangu Teataja, nr. 35…" (link DIGAR-i), venekeelne nimekiri,
  vanus 32, aadress "Толстого 10", amet "конторщикъ" igaüks **VIIDE PUUDU**; isiku 1
  (Aavik) 1926 kandidaadi väärtused **VIIDE PUUDU** (1927–1929 kandidaatide allikas tühi,
  L-04), valitu väärtused viitega "Riigi Teataja, nr. 6, 24 jaanuar 1927"; profiili JSON
  sisaldab iga väärtuse juures `allikas` ja `viide` (või `null`).
- **VK-04** Venekeelsed nimekujud: kuvatakse kaardil originaalkujul; isikute tabelisse
  alternatiivkujudeks **ei lisata** (LAHTINE). Globaalne isikuotsing ei pea neid leidma.

---

## 5. Parandused (PEAB, kui pole märgitud)

| Nr | Koht | Probleem (FAKT) | Nõue | Aktsepteerimine |
|---|---|---|---|---|
| PA-01 | päis, `GlobalSearch.tsx` | placeholder "Otsi isikut või koosolekut…" lõigatakse kitsas kastis ("…koosoleku") | lühem tekst, mis mahub: "Otsi isikut või koosolekut" ilma kolmpunktita ja kasti min-laius nii, et 768–1280 px laiusel on tekst terve; < 768 px "Otsi…" | brauseris 768, 1024, 1280 px laiusel kogu tekst nähtav |
| PA-02 | jalus, `Footer.tsx` | `href="/tlv-andmestik.zip"` ilma basePath-ita → GitHub Pagesil 404 | link `avalikUrl("tlv-andmestik.zip")` (`lib/protokollid/laadi.ts`); git-ist eemaldada juhuslik `public/tlv-andmestik 2.zip`; ZIP sisaldab ka uusi CSV-sid ja `data/README.md` | deploy'tud lehelt ZIP laeb alla; test: jaluse href algab `/tlv-rakendus/` |
| PA-03 | koosseisu päis | valimiskuupäevad "18. detsember 1926–19.12.1926" (esimene sõnaga, teine numbritega) | ühine vorming `kuupaevadEesti([algus, lopp])` (`lib/protokollid/viide.ts`): "18.–19. detsember 1926"; sama koosseisude indeksis | kõik 9 koosseisu ühtse kujuga |
| PA-04 | koosseisu leht › Liikmed | aadressi veerg | eemaldada koosseisu liikmete tabelist (KS-04 lisaveerg tühistatakse); ekspordis jääb | tabelis pole veergu "Aadress" |
| PA-05 | koosseisu päis | arhiivi- ja trükiallikad tekstina | trükiallikad (valimistulemuste, kandidaatide allikas) **linkidena** Exceli hüperlinkide järgi (AN-04 `_url` veerud); arhiiviviited (`valimised_allikas`, `haaled_allikas`) linkidena PA-10 järgi | 1927–1929: "Riigi Teataja, nr. 6, 24 jaanuar 1927" viib `dea.digar.ee/article/AKriigiteataja/1927/01/24/12`; "ERA.2966.2.200" viib `ra.ee/dgs/_purl.php?shc=ERA.2966.2.200` |
| PA-06 | isikud, "Koosseise 0" | 18 isikut (pärast uuendust 17) on 0 koosseisuga, sest koosseis tuletatakse ainult `valitud`-ridadest ja liitumistest; neil kõigil on andmetes **liikmeks saamise kirje puudu**, kuigi nad olid volinikud: 8 isikut 1917–1919 (Bukk, Koloshenkow, Landmann, Lemmats, Meos, Piho, Sammel, Sõkutaja — protokollides puudujatena 5–10 korda), Jenson (1917–1919 lahkumine), 8 isikut 1924–1926 lahkumisega 26.03.1925/17.02.1926 (L-05), Engelhardt 1921–1923 lahkumine | koodis **ei tuletata** liikmelisust juurde. Tabelis "0" asemel "?" tooltipiga "Liikmeks saamise kirje puudub andmetes (valimistulemus või liitumine)"; profiilil märge sama tekstiga ja loetelu tõenditest (lahkumine X, protokollides nimetatud N korda). README "Lahtised andmeküsimused" uus L-06 isikute loeteluga | isik 395 Bukk: tabelis "?", profiilil märge; filtrid ja sortimine töötavad ("?" sorditakse 0 järele) |
| PA-07 | isiku leht › Liikmesmuutused | protokolliviide on tekst | protokolliviide **lingiks** koosoleku detaillehele; koosolek leitakse `allikaviide` (säilik:**kaader**) → `protokolli_lehed.csv` (`arhiiviviide` + `lehekulg`, mis on RA digikaadri number, vt PA-10) → protokoll → `koosolek_id` (FAKT: 633/633 vastavad ja kuupäev klapib; Transkribuse järjekorranumbriga klapiks ainult 627 — säilikus 57 erinevad); link `/koosolekud/<id>/`, eraldi ikooniga "ava protokolli kaader X" → `/protokollid/<id>/?lk=<kaader>`; allikaviide ise lingiks PA-10 järgi. Sama koosseisu sündmuste tabelis (UX-06) | isik 96 17.02.1926 → K126-tüüpi link õigele koosolekule; 1930-09-08 kahe koosoleku päeval viib õigele (K174/K175) |
| PA-08 | isiku leht › Liikmesmuutused | `liitumine&lahkumine` kuvab "07.02.1927 / 07.02.1927" | kui kuupäevad on võrdsed, üks kuupäev; erinevad → mõlemad | isik 96: "07.02.1927" |
| PA-09 | karjääririba, `karjaariSegmendid()` | isik 96 Mekkart 1927–1929: valitud + `liitumine&lahkumine` 07.02.1927 → riba koosseisu lõpuni. Põhjus: kui lõik on juba avatud (valitud), jäetakse `liitumine&lahkumine` vahele | `liitumine&lahkumine` sulgeb avatud lõigu sel kuupäeval (avamata korral 1-päevane lõik nagu praegu). Kontrollida, et `liikmedKuupaeval()` käsitleb sama juhtu samamoodi (reegel 1), ja ühtlustada | isik 96: 1927–1929 lõik valimistest 07.02.1927-ni; 1930–1934 24.01.1930–13.10.1930; test (TE4-05) |
| PA-10 | kõik arhiiviviited (isikud A1, koosseisud A2, muutused A5, protokollid A7 `VIITED.md`-s) | tekstina; `VIITED.md` eeldas, et `:N` on leht | **OTSUS 12.11.2026:** arhiiviviide on link `https://www.ra.ee/dgs/_purl.php?shc=<viide>` (näide `EAA.1211.1.158:1`). Number pärast `:` on **digikaader, mitte lehekülg**. Kui viide hõlmab mitu kaadrit (protokoll `ERA.2966.2.74` kaadrid 339–387, vahemik `ERA.5130.4.481>817`), on link **esimesele kaadrile** (`…:339`), kuvatekst jääb vahemikuga. Säiliku viide ilma kaadrita (`ERA.2966.2.200`) → `shc=ERA.2966.2.200`. Mitu viidet ühes lahtris (`,`/`;`) → igaüks oma link. Üks funktsioon `lib/viited.ts: arhiiviUrl(viide)`. **Terminoloogia:** kõikjal, kus kuvatakse `protokolli_lehed.lehekulg` (pildipaneel "lk 112", tsitaat "lk 339–387", protokolliviide, eksport), on see **kaader** → "kaader 112" / tsitaadis "kaadrid 339–387"; Transkribuse number jääb ainult lingi sisse. Veerunimi `lehekulg` jääb ühilduvuse pärast; `data/README.md` ja `VIITED.md` parandatakse ("lehekulg = RA digikaadri nr"). | `ERA.2966.2.57:112` → `…shc=ERA.2966.2.57:112` avab 4.12.1918 protokolli esimese kaadri (käsitsi kontroll RA veebis); K004 tsitaat "Rahvusarhiiv, ERA.2966.2.57, kaadrid 112–117", link `…:112`; isiku arhiiviviited on lingid; test TE4-08 |
| PA-11 (VÕIKS) | kohalik käivitamine Windowsis (`npm run dev`, `npm run build`); omanik kasutab macOS-i, kus see töötab | `predev`/`prebuild` käivitab `zip-data` = `mkdir -p public && cd data && zip …` — Windowsis `mkdir -p` ja `zip` puuduvad, käivitus katkeb; omanik saab rakendust näha ainult GitHub Pagesi kaudu | `zip-data` asendada Node'i skriptiga `scripts/zip-andmed.mjs` (nt pakett `archiver` või `fflate`; sama sisu: `data/*.csv` + `data/README.md` → `public/tlv-andmestik.zip`); kõik npm-skriptid platvormist sõltumatuks (ei `cd … &&`, `mkdir -p`, `rm`); `package.json` `engines.node >= 20`. `README.md` jaotis "Käivitamine oma arvutis" (Windows/macOS): Node 20 LTS paigaldus, `npm install`, `npm run dev` → `http://localhost:3000/tlv-rakendus/`; märge, et korpuseta kloonis on vaja `public/protokollid/` (või korpust) ja Pythonit vaja ainult `npm run andmed` jaoks | `npm run dev` ja `npm run build` töötavad Windowsis (PowerShell) ja macOS-is puhta kloonina pärast `npm install`; CI jätkab muutmata |

---

## 5a. Kontrollleht `/kontroll` (PEAB; lisatud 12.11.2026)

Andmestiku omaniku tööriist tabelite omavahelise vastavuse kontrolliks. **Ei ole
menüüs**, globaalses otsingus ega sisemistes linkides; lehel `<meta name="robots"
content="noindex">`; staatiliselt genereeritud nagu kõik teised (`app/kontroll/page.tsx`).
Lehe ülaosas: "Andmete kontrollleht — mõeldud testimiseks, mitte avalikuks kasutuseks"
ja andmete seis (CSV-de genereerimise aeg, ridade arvud). Kõik arvutused samade
funktsioonidega mis rakenduses (`lib/derive.ts`, reegel 1), uued puhtad funktsioonid
failis `lib/kontroll.ts`. Iga leiu juures lingid vastavale koosolekule/isikule/koosseisule
ja algandmete rea ID (`muutus_id`, `koosolek_id`, valimiste rea nr), et viga oleks Excelis
leitav. Iga ploki saab eksportida CSV-na (senine `ExportButton`).

- **KT-01 Liikmete arv ajas, koosseisu kaupa.** Iga koosseisu kohta joonis: tuletatud
  liikmete arv (astmeline joon igal muutuse kuupäeval), volikogu suurus
  (`koosseisud.volikogu_suurus`, sh 1934 muutus 65 → 33) viitejoonena ning iga
  koosoleku punkt protokollis kirjas oleva suurusega (`koosolekud.koosseis_arv`).
  Erinevuse kohad punasega. Joonise all tabel kõigist koosolekutest: kuupäev, K-ID,
  tuletatud liikmeid, `koosseis_arv`, volikogu suurus, erinevus; filter "ainult
  erinevused". 1940–1941 jäetakse välja (märkega: isikud pole tabelis).
- **KT-02 Kohalolu bilanss koosoleku kaupa.** Koosolekutel, kus on `kohal_arv`:
  kohal (protokoll) + protokollis nimetatud puudujad vs tuletatud liikmete arv;
  kahepäevastel mõlemad päevad. Erinevus tabelis.
- **KT-03 Muutuste loogika.** Reegli 1 järgi kronoloogiliselt läbi käies:
  (a) lahkumine/peatamine isikult, kes polnud sel hetkel liige (FAKT praegu: 11, L-05);
  (b) liitumine isikule, kes oli juba liige — v.a esimese koosoleku kinnitusread (UX-06
  "kinnitamine"; praegu 268 kinnitusrida, need eraldi loenduriga, mitte veana);
  (c) vahetuse paar ei klapi (lahkumise `asendaja_ID` ilma vastava liitumiseta või
  vastupidi; eri koosseis); (d) muutus väljaspool koosseisu ajavahemikku; (e) 3 muutust
  ilma isikuta.
- **KT-04 Osavõtt vs liikmelisus.** Protokollis nimetatud kohalolijad/puudujad
  (kindlus kõrge/keskmine), kes koosoleku päeval reegli 1 järgi **ei olnud** koosseisu
  liikmed (FAKT praegu: 104; 1917–1919 63, 1919–1921 13, 1921–1923 12, 1924–1926 5,
  1927–1929 8, 1930–1934 3); ja liikmed, keda ühelgi koosseisu koosolekul ei nimetata
  (ainult koosolekutel, mis loetlevad nimeliselt).
- **KT-05 Isikud.** Isikud ilma liikmeks saamise kirjeta (PA-06; praegu 18, pärast
  uuendust 17); isikud, kes on tabelis, aga ei esine üheski teises tabelis; juhatajad,
  kes polnud juhatamise päeval liikmed.
- **KT-06 Kokkuvõte lehe alguses**: iga kontrolli leidude arv koosseisu kaupa ühes
  tabelis (rida = koosseis, veerg = KT-kontroll), lahter link vastavale plokile.

*Aktsepteerimine:* `/kontroll/` avaneb otse aadressilt, nav-is ja sitemap'is seda pole;
1927–1929 KT-01 näitab 3 erinevust (K144: protokoll 55, tuletatud 56; K148: 55/54;
K161: 55/57); 1930–1934 2 (K166, K177); 1934–1939 2 (K300, K301: 33/32); KT-03(a) 11 rida
#3, #95, #233, #242–#248, #272; pärast andmeuuendust arvud uuenevad automaatselt.
Testid **TE4-09**: `lib/kontroll.ts` sünteetiliste andmetega (iga KT-kontroll vähemalt
üks positiivne ja üks negatiivne juhtum).

---

## 6. Testid (vitest + Python)

- **TE4-01** `excel-csv.py` (pytest või `python -m unittest`, `scripts/test_excel_csv.py`):
  kuupäevad (osaline, mitmepäevane, mõttekriips → sidekriips), hüperlingi lugemine,
  "65/33" parsimine, kirillitsa → `kandidaadid_vene`, alias 301 → 257, parandused rakenduvad
  ja hoiatavad, kui on juba allikas.
- **TE4-02** Aliased eeltöötluses: `"257;301"` → [257] kõrge; `"257;301;None"` → 257
  mitmene; `"257;269;301;395;None"` → 3 kandidaati; tundmatu ID pärast aliast → viga.
- **TE4-03** Nimekirjade sidumine: iga toorkuju vastete tabelis; puuduv → viga; 1939 tühi.
- **TE4-04** Valimiste kaart: kolm allikat ühel aastal; võrdne väärtus kahest allikast →
  üks väärtus kahe viitega; viide puudu → `viide: null` ja renderduses "VIIDE PUUDU".
- **TE4-05** `karjaariSegmendid`: valitud + liitumine&lahkumine → lõik suletakse;
  liitumine&lahkumine ilma valimiseta → 1-päevane; ühtlus `liikmedKuupaeval`-iga.
- **TE4-06** Protokolliviide → koosolek (säilik:leht kaudu), sh sama päeva kaks koosolekut.
- **TE4-07** `kuupaevadEesti` koosseisu valimiskuupäevadel (sama kuu, eri kuu).
- **TE4-08** `arhiiviUrl`: `EAA.1211.1.158:1` → `https://www.ra.ee/dgs/_purl.php?shc=EAA.1211.1.158:1`;
  säilik ilma kaadrita; vahemik `ERA.2966.2.74:339–387` ja `ERA.5130.4.481>817` → esimene
  kaader; mitu viidet lahtris → mitu linki; tühi → null.
- Olemasolevad testid rohelised; `npm run build`; käsitsi: isikud 6, 96, 257, 395;
  koosseisud 1927–1929 ja 1934–1939; jaluse ZIP deploy'tud lehelt.

---

## 7. Lahtised küsimused (koosolekule; ajutine lahendus kehtib)

- K001 kuupäev "11 jaanuaril 1918": vana või uue kalendri järgi? (seni nagu protokollis)
- 1923 Tamm nr 7 vs 9; 1926 Kase/Unt id 24 vs 25 (NK-02).
- 1917 venekeelse kandidaatide nimekirja allikas ja viide; kas venekeelsed nimekujud
  isikute alternatiivkujudeks (VK-02, VK-04).
- Kandidaatide allikas puudub koosseisudel 1921–1923, 1927–1929, 1930–1934 (L-04) →
  seni **VIIDE PUUDU**.
- Arhiiviviidete URL-muster on otsustatud (PA-10). Kontrollida RA veebis, et
  `lehekulg` (piltide failinime number) = RA digikaader ka säilikutes 83 ja 89 (jagatud
  lehed 134a/b, 254a/b — kas a ja b on üks kaader?).
- L-06 (uus): 17 isikut ilma liikmeks saamise kirjeta (PA-06) — andmete täiendus Excelis.
- Korpuse küsimused (uus linkimine uue isikute tabeliga, failinimed, K002 numeratsioon) —
  allikaprojektiga.

---

## 8. Töö järjekord

1. AN-01…AN-03: skript, parandused, aliased; võrdlusraport peab klappima; commit
   "andmeuuendus 12.11.2026" (Excelid + CSV-d + skriptid eraldi commitina).
2. Eeltöötlus aliastega (TE4-02); `npm run build`.
3. Kiired parandused PA-01…PA-04, PA-08, PA-09 (+ TE4-05, TE4-07).
4. NK-01…NK-03 kanoonilised nimekirjad.
5. VK-01…VK-04 valimiste kaart (+ TE4-04); AN-04 volikogu suurus; PA-05, PA-10 lingid ja
   terminoloogia (+ TE4-08); `VIITED.md` uuendus.
6. PA-06, PA-07 (+ TE4-06); kontrollleht KT-01…KT-06 (+ TE4-09) — soovitatav teha
   juba pärast sammu 1, et andmeuuenduse tulemust saaks selle abil üle vaadata.
7. `data/README.md`, `README.md` (L-06, uued failid, skript), `ANDMETOOTLUSE_ULEVAADE.md`
   uuendus; `CLAUDE.md` viide sellele dokumendile.
8. VÕIKS: PA-11 (Windowsi-ühilduvus, README käivitusjuhend).
