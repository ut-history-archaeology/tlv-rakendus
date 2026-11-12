# Andmeuuendus 12.11.2026 — võrdlusraport

Võrreldud: algsed Excelid (augusti/oktoobri seis, millest tehti `data/*.csv`) ↔ uued
Excelid (12.11.2026) + uus fail `TLV_nimekirjad.xlsx`. Midagi pole veel asendatud.

## 1. Kokkuvõte

| Tabel | Vana → uus | Muudatus | Mõju rakendusele |
|---|---|---|---|
| isikud | 404 → 406 | **ID 301 kustutatud** (liidetud ID 257-ga, Paul Wilhelm Engelhardt); **uued 411 Lemm, 412 Sild, 413 Tents**; 140 rida täiendatud (alt-nimed 72+51, sünniandmed 30–47, arhiiviviited 34, 4 nime moderniseeritud kujule, 1 Wikidata, 1 surmaaeg) | 301 viited tuleb ümber suunata 257-le: `valimised` 1, `muutused` 2, `osavott` 3 rida **ja protokollikorpuses 20 nimeüksust 14 failis** |
| koosseisud | 9 → 9 | uued veerud **`volikogu_suurus`** (60/55/65/33/40/-) ja **`hääled_allikas`** (ERA.2966.2.195, ERA.40.1.452…459); 1917 esimene koosolek 11.09.1917; 1917 `valimised_allikas` ERA.2966.2.197 → **EAA.2623.1.805**; koosseisu nimes nüüd mõttekriips (1917–1919) | `koosseis_id` jääb sidekriipsuga (URL-id ei muutu); uued väljad koosseisu lehe päisesse ja VIITED.md-sse |
| koosolekud | 337 → 337 | 22.**01**.1918 → 22.**02**.1918 (K002); 29.01.1934 puudujate loendis "E.gur-Mühlen" → "E.zur-Mühlen" | K002 kuupäev muutub (ka `osavott`); korpuse fail on nimega `1918-01-22.json` → vaja käsitsi vastet; zur-Mühlen võib nüüd isikuga seostuda |
| muutused | 633 → 633 | #95 isik 301 → 257 | L-05 jääb lahtiseks: 257 polnud 1921–1923 valitud ega liitunud, aga lahkub 27.11.1922 |
| valimised | 1092 → 1174 | +79 rida **1917 venekeelne kandidaatide nimekiri** (samad 79 isikut, kirillitsas, aadressi ja ametiga); +4 kandidaati (1919 Tents, 1921 Engelhardt 257, 1923 Sild, Lemm); 301 → 257 | 1917 on nüüd igal kandidaadil kaks `valitav` rida — eristada allikas (vt K-02) |
| nimekirjad | uus | Sheet1: 78 ametlikku nimekirja (aasta, nr, nimi, **hääled**, kuni 4 Wikidata linki); Sheet2: **35 kanoonilist nimekirja** (korrastatud nimi, Wikidata, nimekujud aastate kaupa, "mitu osapoolt") | Kanoniseerimine on võimalik — vt ptk 2 |

**Mis ei ole uutes Excelites sees** (jääb parandusfaili, rakendamine nagu praegu):
AP-01 K026 kuupäev (Excelis endiselt 29.–30.**02**.1920), AP-02 K338 (13.11.1940 endiselt
üks rida), AP-03 K336. Lahtistest küsimustest ei lahenenud L-01…L-05 ükski
(L-04: `kandidaatide_allikas` on endiselt tühi koosseisudel 1921–1923, 1927–1929, 1930–1934).

## 2. Nimekirjade kanoniseerimine

Valimiste 139 toorkuju (1 034 rida) seoti kanooniliste nimekirjadega kahel viisil:
- **numbri järgi** 1917–1923 (`nimekiri_nr` + aasta → Sheet2 `<aasta>_nr`): 81 kuju;
- **nime järgi** 1926–1934 (käändelõpud ja "nimekiri/kandidaatide" eemaldatud,
  sarnasus sama aasta nimekirjadega): 58 kuju.

Tulemus failis `nimekirjad_vasted_EELNOU.csv` (iga toorkuju → `nimekiri_id`,
meetod, sarnasus, staatus):

| Staatus | Kujusid | Märkus |
|---|---|---|
| automaatne | 132 | numbri või nime järgi, sarnasus ≥ 0,85 |
| automaatne, vaata üle | 2 | 1929 "Tartu üürnikkude ja Tööerakonna ühise …" (0,80), 1934 "Vabadussõjalaste Rahvaliikumise kandidaatide esitamiskiri" (0,79) — tõenäoliselt õiged |
| parandatud käsitsi | 2 | 1929 "(nimekiri eesotsas J. O. Rütliga / V. Tammaniga)" → **26** (Sheet1 järgi alamnimekirjad "Tartu majaomanikud, haridus- ja majandustegelased … (eesotsas Rütli / Tamman)") |
| **KONTROLLIDA** | 3 | vt K-04, K-05 |

Kõik 1 034 nimekirjaga rida saavad `nimekiri_id`; 1939 ridadel nimekirju pole (ringkonnad).

Märkused Sheet2 kohta: kanooniline id 2 "Eesti Sotsiaaldemokraatlik Tööliste Partei"
hõlmab ka 1926–1934 "Eesti Sotsialistlik Tööliste Partei" (nii failis); 1934
"Kristlased" → id 19 Kristlik Rahvaerakond; 1929 alamnimekirjad (Juudi ×2, Vene ×2,
majaomanikud ×3) on Sheet1-s eraldi ridadena oma häältega, kanooniliselt üks id.

**Ettepanek andmestruktuuriks**
- `data/nimekirjad.csv` — 35 kanoonilist (Sheet2: `nimekiri_id, nimi, mitu_osapoolt, wikidata`);
- `data/valimisnimekirjad.csv` — 78 ametlikku (Sheet1: `aasta, nr, nimi, haaled, wikidata_1…4, nimekiri_id`);
- `data/valimised.csv` saab veeru `nimekiri_id`; toorkuju `nimekiri_nimi` jääb alles;
- tööfail `nimekirjad_variandid_TAITMISEKS.csv` kustutatakse; vastete tabel läheb
  `scripts/nimekirjad-vasted.csv` (käsitsi parandused korduvkasutatavad).
- Rakenduses: nimekirjafiltrid ja koosseisu jaotusdiagramm kanoonilise nime järgi
  (hoiatus "ühtlustamata" kaob), toorkuju tooltipis; nimekirja Wikidata link;
  koosseisu lehel häälte arv nimekirja kaupa (Sheet1 `hääled`).

## 3. Otsust vajavad küsimused

- **K-01 ID 301 → 257.** Kas korpuse nimeüksused (20 tk) suunatakse eeltöötluses
  ümber 257-le (ID-aliaste tabel `scripts/isik-aliased.json: {"301": 257}`), või
  uuendatakse korpus ise allikaprojektis? Soovitus: alias eeltöötluses, sest korpust
  me ei muuda.
- **K-02 1917 venekeelne nimekiri.** Kas need 79 rida on eraldi allikas (originaal
  "Списокъ кандидатовъ…") ja milline on selle viide? Rakendus ühendab ühe aasta read
  ühte kaarti ja eristab allikaid praegu ainult rolli järgi (`valitav`/`valitud`) —
  kolmanda allika jaoks soovitan valimistesse uut veergu `allikas` (nt
  `kandidaadid_ee`, `kandidaadid_ru`, `tulemused`). Kas kirillitsas nimed lähevad ka
  isiku alternatiivkujudeks (osal on juba isikute tabelis)?
- **K-03 K002 kuupäev 22.02.1918.** Kinnitan, et Exceli parandus on õige (protokoll:
  "22 (8) weebruaril 1918"). Korpuse fail `1918-01-22.json` jääb nimega, vaste K002-le
  käsitsi — nagu K026. OK?
- **K-04 1923 "Linna rentnikute rühm"** on valimistes nimekiri nr **7**, aga
  nimekirjade failis on nr 7 "Eesti Rahvaerakond" ja "Linna Rentnikkude rühm" nr **9**.
  Seotud id 20-ga (nime järgi). Kas valimiste `nimekiri_nr` 7 → 9 tuleb parandada?
- **K-05 1926 kaks majaomanike nimekirja** — "Tartu Majaomanikkude seltsi
  kandidaatide nimekiri" (P. Kase, isik 49) ja "Tartu majaomanikkude rühma nimekiri"
  (K. Unt, isik 183): kas id **24** (Maja- ja Kinnisvaraomanikkude ühing) või **25**
  (Majaomanike selts, Väikekaupmeeste selts …)? Praegu 24.
- **K-06 `volikogu_suurus` "65/33"** (1934–1939) — kas tähendab, et suurus muutus
  ajas 65 → 33? Kui jah, mis kuupäevast? Rakenduses kuvatakse praegu toortekstina.
- **K-07 isanimi ja AKL ID** — 3. etapis jäeti kuvast välja; uues Excelis on isanimi
  täidetud ka uutel isikutel. Kas jääb välja?

## 4. Soovitatav järgmine samm

Pärast vastuseid: üks Claude Code'i ülesanne ("4. etapp: andmeuuendus ja nimekirjad"),
mille sisu on
1. `scripts/excel-csv.py` — korduvkasutatav teisendus Excel → `data/*.csv` (praeguse
   kuju järgi) + `scripts/andmeparandused.json` (AP-01…AP-03, K-03) + ID-aliased;
   osavõtu parsimine ja sidumine samade reeglitega kui augustis;
2. võrdlus vana CSV ↔ uus CSV (peab vastama sellele raportile), viidete kontroll,
   korpuse ID-kontroll, `npm test`, `npm run build`;
3. nimekirjade kanoniseerimine (ptk 2) rakendusse;
4. `data/README.md` ja `ANDMETOOTLUSE_ULEVAADE.md` uuendus.
