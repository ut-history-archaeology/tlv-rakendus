# Lähteülesanne, 3. etapp: kasutajaliidese parandused

Rakendus: Tartu Linnavolikogu 1917–1941 (Next.js, App Router, `output: "export"`).
Repo: https://github.com/ut-history-archaeology/tlv-rakendus (seis 27.10.2026, commit
`96d119f`). Kuupäev: 28.10.2026.

Loe enne alustamist: `CLAUDE.md`, `CLAUDE_CODE_ULESANNE.md` (PR-*, KS-*, KO-*, UN-*,
EX-* nõuded), `CLAUDE_CODE_ULESANNE_2.md` (PT-*, O-01…O-14), `data/README.md`,
`app/isikud/[id]/page.tsx`, `app/koosseisud/[id]/page.tsx`, `components/MuutusteAjatelg.tsx`,
`app/koosolekud/page.tsx`, `app/protokollid/page.tsx`, `components/KoosolekudVaade.tsx`,
`lib/derive.ts`.

Märgistus: **FAKT** = kontrollitud repo koodi ja `data/*.csv` vastu 28.10.2026;
**EELDUS** = kujundusotsus, mille andmestiku omanik võib muuta (küsimused ptk 7).
Prioriteedid: **PEAB** / **VÕIKS** / **VÕIB**. Kõik varasemad põhimõtted jäävad
(eesti keel, koosseisude palett, "tuletatud"/"automaatne" märgistus, ekspordivormingud,
staatiline eksport, URL-id ei muutu).

---

## 1. Eesmärk

Kolm kasutajaliidese parandust, mis on tulnud rakenduse kasutamisest:

1. isiku leht — puuduvad/vigased väljad ja liiga lahtine paigutus;
2. koosseisu leht — liikmesmuutuste tabel ja ajatelg on raskesti jälgitavad;
3. koosolekute ja protokollide lehed kattuvad — otsus, kuidas need ühendada.

Lisaks ettevalmistus viidete vormistuse ühtlustamiseks (ptk 6): kõik rakenduses
kasutatavad viitekujud on koondatud faili `VIITED.md`; viitamisreeglid tulevad
andmestiku omanikult eraldi ja rakendatakse järgmises sammus.

---

## 2. Isiku leht `/isikud/[id]`

### 2.1 Faktid (kontrollitud)

- `isikud.csv`: `isanimi` on täidetud 197 isikul; kood kuvab seda päises eluaastate
  rea lõpus kujul " · isanimi: X" — väikeses hallis kirjas, kaob eluaastate rea sisse ja
  puudub, kui eluaastaid ei ole, siis algab rida eraldajaga. Isikute tabelis
  (`IsikudTabel`) isanime veergu ei ole; ekspordis on.
- `wikidata` veerg sisaldab **täis-URL-i** (`https://www.wikidata.org/wiki/Q12370898`,
  99 isikul); kood liidab ette `https://www.wikidata.org/wiki/` → link on vigane
  (`…/wiki/https://www.wikidata.org/wiki/Q…`). Sama viga on profiili JSON-ekspordis
  ainult kuvatekstis, mitte väärtuses.
- `valimised.csv`: 637 isik×aasta paari, neist **455-l on kaks rida** (`valitav` +
  `valitud`), mis pärinevad eri allikatest (`koosseisud.csv`: `kandidaatide_allikas` vs
  `valimistulemuste_allikas`). Ridade väljad erinevad sageli: `vanus`/`sünniaeg_tuletatud`
  on ainult kandidaadireal (327), `jrk_nimekiri`/`jrk_üld` enamasti ainult valitu real,
  `nimekiri_nimi` toorkuju erineb 219 paaris, `amet` 205, aadress 223 paaris
  (tavaliselt üks tühi, teine täidetud; mõnel päriselt erinev). Praegu kuvatakse kaks
  eraldi kaarti, kus sama info kordub.
- `isikuAadressid()` annab rea iga `valimised.csv` rea kohta → sama aadress kordub
  (nt "1926: Raatuse 10" kaks korda). Aadressiga isikuid 347, mitme eri aadressiga 89.
  Aadressid on aastatest 1917–1939 (mitte ainult 1926/1929/1934, nagu lehe märkus ütleb).

### 2.2 Nõuded

- **UX-01 PEAB — päise andmeplokk.** Päises asendab vaba tekstirea `dl`-loend selgete
  siltidega, ainult täidetud väljad: *Sündinud* (osaline kuupäev nagu on; "(tuletatud)"
  kui `synd_tuletatud`), *Surnud*, *Isanimi*, *Alternatiivkujud*, *Sugu* ei kuvata
  (**EELDUS E3-01**: pole uurijale infot, mis nimest ei nähtu), *Wikidata*, *Arhiiviviited*,
  *AKL ID* (**EELDUS E3-02**: kuvada "AKL: 36" lingita, sest tähendus pole dokumenteeritud —
  vt ptk 7 K3-01). Isanimi läheb ka isikute tabelisse peidetava veeruna (vaikimisi
  peidus; `IsikudTabel` veergude valik, kui see on olemas, muidu lisada lihtne
  "Näita isanime" lüliti) ja hover-eelvaatesse.
  *Aktsepteerimine:* isik 6 (Oskar Allik) näitab "Isanimi: Karl-Aleksander" eraldi real;
  isik 206, kellel eluaastad puuduvad, ei alga eraldajaga; isik ilma isanimeta ei näita
  tühja silti.

- **UX-02 PEAB — Wikidata link.** `lib/format.ts` uus `wikidataQid(v)`: võtab vastu nii
  `Q123`, `https://www.wikidata.org/wiki/Q123` kui `http://…/entity/Q123` ja tagastab
  `Q123` (tühi, kui ei klapi). Link `https://www.wikidata.org/wiki/<QID>`, kuvatekst
  "Wikidata: Q123", `rel="noopener noreferrer"`, väline-lingi ikoon. Profiili JSON-is
  väli `wikidata` = täis-URL (nagu CSV-s) ja lisaks `wikidata_qid`. Sama funktsioon
  isikute tabeli hover-eelvaates, kui see Wikidatat näitab.
  *Aktsepteerimine:* isik 12 (Belousov) → `https://www.wikidata.org/wiki/Q12370898`;
  test `wikidataQid` kolme sisendkujuga + prügi (`""`, `"n/a"` → `""`).

- **UX-03 PEAB — valimised ühe plokina aasta kohta.** Uus tuletusfunktsioon
  `lib/derive.ts: isikuValimisedKoos(andmed, isikId)` ühendab sama `aasta` read üheks
  kirjeks:
  ```ts
  interface ValimineKoos {
    aasta: number; koosseis_id: string;
    tulemus: "valitud" | "kandidaat";          // valitud, kui mõni rida roll=valitud
    nimekiri: { nr: string; nimi: string; allikad: Allikas[] }[];   // eri toorkujud eraldi, kummagi allikas
    koht: { jrk_nimekiri?: string; jrk_uld?: string; jrk_ringkond?: string };
    ringkond?: string; haaled?: { jsk1?: string; jsk2?: string; kokku?: number };   // 1939
    amet: { vaartus: string; allikad: Allikas[] }[];
    vanus?: string; synniaeg?: string;         // kandidaadirealt
    aadress: { tekst: string; allikad: Allikas[] }[];
    markused: { tekst: string; allikad: Allikas[] }[];
    allikad: Allikas[];                        // kõik, millest kirje koosneb
  }
  type Allikas = { roll: "valitav" | "valitud"; viide: string };  // viide = koosseisud.csv kandidaatide_allikas / valimistulemuste_allikas
  ```
  Reegel: kui väärtus on ainult ühel real → võetakse see; kui mõlemal ja võrdne → üks
  väärtus kahe allikaga; kui **erinev** → mõlemad väärtused, kumbki oma allikasildiga
  (ei ühtlustata, ei valita "õiget" — andmevastuolu jääb nähtavaks, vt `CLAUDE.md`).
  Kuva: üks kaart/rida aasta kohta, pealkiri "1926. aasta valimised → koosseis 1927–1929
  (link)", tulemusemärk "valitud" (roheline) või "kandidaat, ei osutunud valituks"
  (hall); read: Nimekiri (+ nr), Koht nimekirjas / üldjärjestuses, Ringkond ja hääled
  (1939), Amet, Vanus valimiste ajal, Aadress (vt UX-04 — aadress kuvatakse valimiste
  kaardil **ja** koondina), Märkused. Kaardi jaluses väike allikarida: "Allikad:
  kandidaatide nimekiri — Riigi Teataja, nr. 6, 24 jaanuar 1927; valimistulemused —
  ERA.2966.2.200" (tekst `koosseisud.csv`-st, vormistus täpsustub ptk 6 järgi).
  Erineva väärtuse korral väärtuse järel ülaindeks ¹/² → sama kaardi allikarea
  numbrid. Nimekirja juures HelpTip `ABI.nimekiri` jääb. Profiili JSON-i lisandub
  `valimised_koos: ValimineKoos[]`; senine `valimised` (toored read) jääb alles.
  *Aktsepteerimine:* isik 1 (Aavik) 1926: üks kaart, nimekiri üks kord, vanus 55 ja koht
  nimekirjas 6 (üldjärjestuses 46) samal kaardil, kaks allikat jaluses; isik, kel
  `nimekiri_nimi` toorkujud erinevad, näeb mõlemat kuju allikaviitega; ainult
  kandidaadiga aasta → hall märk; 1939: ringkond + hääled; test
  `isikuValimisedKoos` sünteetiliste paaridega (võrdne / erinev / ainult üks rida).

- **UX-04 PEAB — aadressid kompaktselt.** `isikuAadressid()` asendatakse
  `isikuAadressidKoos()`-ga: aadress normaliseeritakse võtmeks
  (tänav + maja + korter + muu; tõst ja tühikud ühtlustatud, muud ei muudeta), sama
  aadressi aastad koondatakse: `{ tekst: "Raatuse 10", aastad: [1926, 1929], allikad }`.
  Kuva: üks rida aadressi kohta kronoloogiliselt esimese aasta järgi, aastad sulgudes;
  plokk pealkirjaga "Aadressid valimisnimekirjades"; selgitav märkus parandatakse:
  "Elukoht valimisnimekirjade ja -tulemuste järgi (1917–1939)". Kui isikul on ainult
  üks aadress, kuvatakse see ühel real ilma loendita. Eksport: `aadressid` saab uue
  kuju `[{tekst, aastad}]`.
  *Aktsepteerimine:* isik 1 → "Raatuse 10 (1926)" üks kord; isik, kel 1923 ja 1929 sama
  tänav/maja → üks rida kahe aastaga; eri majanumber → kaks rida; test
  `isikuAadressidKoos` (dubleeriv paar, eri aastad, tõsteerinevus "Pikk" vs "pikk" =
  sama, `elukoht_muu` eraldi).

- **UX-05 VÕIKS — lehe üldine tihedus.** Sektsioonide järjekord: päis → karjääririba →
  valimised → liikmesmuutused → osavõtt → mainimised → juhatamine → aadressid →
  asendussuhted (**EELDUS E3-03**: tähtsam enne). Kaardid täislaiuses ridadena, mitte
  kahes veerus, kui kirjeid on ≤ 2; sektsioonipealkirjade vahe väiksem; tühje
  sektsioone ei renderdata (juba nii). Prindivaates sama järjekord.

---

## 3. Koosseisu leht `/koosseisud/[id]`

### 3.1 Faktid (kontrollitud)

- `muutused.csv` 633 rida: liitumine 413, lahkumine 174, liitumine&lahkumine 25,
  rühmavahetus 20, peatamine 1.
- **Asendus on kahe reana:** `lahkumine` (isik A, `asendaja_ID` = B) + `liitumine`
  (isik B, `asendatav_ID` = A), samas koosseisus. 174 lahkumisest 138-l on asendaja ja
  kõik 138 on paaris liitumisega; 135 paari on samal kuupäeval, 3 eri kuupäeval.
  36 lahkumisel asendajat pole (`asendaja_puudub`), 25 "liitumine&lahkumine" on
  ühepäevased.
- **Esimese koosoleku kinnitusread:** koosseisudes 1924–1940 on 270 `liitumine`-rida
  esimese koosoleku kuupäeval, `täpsustus` nt "walitud linnawolikogu liikmeteks",
  "uue wolikogu liikmete nimekirja", "kutsutud Linnavolikokku"; neist 266 isikut on ka
  `valimised.csv` `roll=valitud`. Need on sisuliselt "valitud liikmed kinnitati", mitte
  muutused — tabelis moodustavad nad 1927–1929 koosseisus 55 rida 96-st.
- Ajatelg (`MuutusteAjatelg`): 20-pikslisel ribal punktid liigi värviga, sama päeva
  punktid virnastatud (max 5, siis kordub), 338 koosoleku hallid jooned taustal;
  tooltip ainult hover'il; punkti klõps ei tee midagi. Esimese koosoleku 55 punkti
  satuvad ühte virna; eri päevade punktid kattuvad; liigid ei ole ilma legendita
  loetavad.

### 3.2 Nõuded

- **UX-06 PEAB — liikmesmuutused sündmustena.** Uus tuletus `lib/derive.ts:
  koosseisuSyndmused(andmed, koosseisId)` teisendab muutuste read sündmusteks:
  ```ts
  type Syndmus =
    | { liik: "kinnitamine"; kuupaev; isikud: number[]; allikaviide; protokoll }   // esimese koosoleku kinnitusread (reegel 1)
    | { liik: "vahetus"; kuupaev; lahkuja: number; asendaja: number; lahkumiseKuupaev; liitumiseKuupaev; allikaviited; protokollid; nimekiri; tapsustus }   // reegel 2
    | { liik: "lahkumine"; kuupaev; isik; … }        // ilma asendajata
    | { liik: "liitumine"; kuupaev; isik; … }        // ilma asendatavata (ja mitte kinnitus)
    | { liik: "liitumine&lahkumine"; … } | { liik: "rühmavahetus"; … } | { liik: "peatamine"; … };
  ```
  Reegel 1 (kinnitamine): `liitumine`-read koosseisu `esimene_koosolek` kuupäeval,
  millel `asendatav_ID` puudub → üks sündmus "Valitud liikmed kinnitati (n)" isikute
  loendiga (kokkuklapitav); read, mille isik **ei ole** `valimised` valitute hulgas,
  jäävad eraldi `liitumine`-sündmusteks ja saavad märke "ei olnud valimistulemustes"
  (8 juhtu kokku, **FAKT**: 1919 ×1, 1924 ×3, 1927 ×2, 1930 ×2). Koosseisudes 1917–1923 sellised read puuduvad → sündmust ei teki.
  Reegel 2 (vahetus): `lahkumine` A (`asendaja_ID` B) + `liitumine` B (`asendatav_ID` A)
  samas koosseisus → üks sündmus, kuupäev = lahkumise kuupäev; kui liitumine on hilisem,
  näidatakse "liitus 12.03.1928" lisana. Paarituks jäänud pool jääb omaette sündmuseks.
  Reegel 3: ülejäänud liigid 1:1. Kõik algsed `muutus_id`-d säilivad sündmuse sees
  (eksport ja test).
  Tabel: veerud Kuupäev · Sündmus · Isik(ud) · Nimekiri · Allikaviide; sündmuse tekst
  nt "**Lahkus** Jaan Tamm → **asemele** Karl Kask" (mõlemad lingid), "Kinnitati 55 valitud
  liiget ▸" (avab nimede loendi), "Lahkus … (asendajat ei nimetata)", "Rühmavahetus:
  A → nimekiri X". Filtri-kiibid liigi järgi (kinnitamine vaikimisi **nähtav, aga
  kokku**). Eksport: senine toor-eksport (`muutused` read) jääb; lisandub
  "Sündmused" eksport (üks rida sündmuse kohta, isikud `;`-ga). Isiku lehe
  liikmesmuutuste tabel (PR-03) kasutab sama sündmusmudelit, filtreerituna isikule
  (vahetus näidatakse kummalgi osapoolel).
  *Aktsepteerimine:* 1927–1929: tabelis ≤ 42 sündmust 96 rea asemel, esimene
  "Kinnitati 53 valitud liiget" + 2 eraldi liitumist 07.02.1927; iga vahetus on üks rida
  kahe lingiga; 36 asendajata lahkumist on märgistatud; test `koosseisuSyndmused`:
  paar samal/eri kuupäeval, paaritu lahkumine, kinnitusrida valitule/mittevalitule,
  `muutus_id`-de summa = sisendi ridade arv.

- **UX-07 PEAB — liikmesmuutuste ajatelg uuel kujul.** `MuutusteAjatelg` asendatakse
  kahekihilise joonisega (Recharts või SVG, laius 100 %, kõrgus ≈ 220 px):
  1. **Liikmete arv ajas** — astmeline joon (`liikmedKuupaeval` igal sündmuse
     kuupäeval + koosseisu algus/lõpp), y-telg "liikmeid", horisontaalne viitejoon
     valitud liikmete arvuga; koosseisu värv. Nii on kohe näha, millal koosseis kahanes
     või täienes.
  2. **Sündmuste riba** joone all — iga **kuupäev** üks marker, mille suurus/number
     näitab sündmuste arvu sel päeval (kinnitamine = üks sündmus), värv liigi järgi
     (sama `LIIGI_VARV`; segapäev = hall rõngas); ei virnastata. Koosolekud ei ole enam
     eraldi joontena (visuaalne müra), vaid x-telje väikesed tikid; tooltipis "koosolek
     8. sept 1930".
  Interaktsioon: hover → tooltip (kuupäev, sündmused loendina nimedega, max 8 + "…");
  klõps markeril → tabel (UX-06) filtreeritakse sellele kuupäevale (kiip, X eemaldab)
  ja keritakse tabelini; klaviatuur: markerid on `button`-id, Tab/Enter. Legend liigi
  kaupa + "joon = liikmete arv". `sr-only` tekstikirjeldus: "Liikmete arv muutus
  vahemikus 58…63; kõige rohkem sündmusi 07.02.1927 (kinnitamine, 55 isikut)".
  Mobiilis joonis keritav horisontaalselt (min laius 640 px).
  *Aktsepteerimine:* 1927–1929 lehel on joon, mis algab valitute arvust ja astub iga
  vahetuse juures; 07.02.1927 on üks marker numbriga, mitte 55 punkti; markerid ei
  kattu (sama päeva sündmused on ühes markeris; eri päevade markerid, mis jäävad
  < 8 px kaugusele, nihutatakse kahele reale); klõps markerile filtreerib tabeli;
  Lighthouse ligipääsetavus ≥ 90; test: liikmete arvu seeria sünteetilise koosseisuga
  (valitud 3, lahkumine, liitumine → 3,2,3).

- **UX-08 VÕIKS — liikmete tabel ja jaotusdiagramm.** Jaotusdiagrammi segment, mida on
  klõpsatud, jääb nähtavalt aktiivseks (raam) ja kiip "Nimekiri: …" on tabeli kohal
  (praegu kontrollida, kas on); liikmete tabelisse veerg "Staatus koosseisus":
  "valitud" / "liitus <kuupäev>" / "lahkus <kuupäev>" (sündmusmudelist), sorditav.

---

## 4. Koosolekud ja protokollid: ühendamine

### 4.1 Faktid

- `/koosolekud` ja `/protokollid` kasutavad sama komponenti `KoosolekudVaade`
  (variandid `koosolekud` / `protokollid`). Erinevused: koosolekute lehel KO-01
  sagedusdiagramm; protokollide lehel täistekstiotsing (PT-02), olemitüübi filter
  (PT-07), veerud "Päevakorrapunkte" ja "Sõnu", rida viib `/protokollid/<id>/`; 338 vs
  337 rida (ainult K336-l pole protokolli). Mõlemal: ajavahemik, juhataja, vorm, "Minu
  vaade" eraldi võtmega, eksport.
- Detaillehed on eri sisuga: `/koosolekud/<id>/` = metaandmed, kohalolu/puudujad,
  tuletatud kohalolijad, päevakord (KO-11), OCR-algus; `/protokollid/<id>/` =
  täistekst + märgendus + lehepildid (0,3–1,25 MB HTML). Navigatsioonis on need kaks
  eraldi menüüpunkti; globaalne otsing viitab mõlemale.
- Viited (PT-09 "Kopeeri viide") ja välised lingid sisaldavad URL-e
  `/protokollid/<K-id>/`, `?lk=`, `#p<nr>` — need **ei tohi muutuda**.

### 4.2 Otsus (soovitus) — **jah, nimekirjad ühendada; detaillehed jätta kaheks, aga
siduda sakkidena**

Põhjendus: kaks peaaegu identset tabelit sama 337–338 kirjega tekitavad küsimuse
"kumba ma vaatan?"; kasutaja mõtleb koosolekust ja selle protokollist kui ühest asjast.
Detaillehtede täielik ühendamine ei ole mõistlik: protokollileht on juba suur (O-06
piir 2 MB) ja koosoleku kohalolu-vaade on iseseisvalt kasulik ning prinditav; samuti
peavad viite-URL-id püsima.

- **UX-09 PEAB — üks nimekirjaleht `/koosolekud`.** Ühendatud `KoosolekudVaade`
  (variandid kaovad): KO-01 diagramm jääb üles; selle all **täistekstiotsing** (PT-02,
  kokkuklapitav plokk "Otsi protokollide tekstist", avatud kui `?q=` on URL-is);
  tabel kõigi 338 reaga, veerud: Kuupäev · Nädalapäev · Vorm · Juhataja · Kohal ·
  Koosseisu suurus · Päevakorrapunkte · Sõnu · **Avamine** (kaks ikooni/linki: "koosolek"
  → `/koosolekud/<id>/`, "protokoll" → `/protokollid/<id>/`; K336-l protokolli link
  puudub, tooltip "protokolli täistekst puudub"). Rea klõps viib **koosoleku** lehele
  (**EELDUS E3-04**; protokoll on ühe klõpsu kaugusel sakina, vt UX-10). Filtrid:
  senised + olemitüüp (PT-07) ainult siis, kui otsinguplokk on avatud. "Minu vaade"
  võti `tlv-vaade-koosolekud` (vana `tlv-vaade-protokollid` loetakse üks kord ja
  migreeritakse). Eksport: üks nupp, kõik veerud (koosolek + protokollid.csv veerud),
  failinimi `tlv-koosolekud-…`. URL-parameetrid `q`, `tyybid`, `algus`, `lopp`,
  `juhataja`, `vorm`, `aasta`, `sort`, `leht` jäävad samaks.
  `/protokollid/` (ilma id-ta) jääb alles **ümbersuunajana**: staatiline leht, mis
  `useEffect`-is teeb `router.replace("/koosolekud/" + location.search + "#otsing")`
  ja kuvab vahepeal lause "Protokollide nimekiri on nüüd koosolekute lehel" lingiga
  (JS-ita kasutaja näeb linki). Nav: üks punkt **"Koosolekud ja protokollid"**
  (`/koosolekud/`), "Protokollid" eemaldatakse; avalehe statistikakaart "koosolekut"
  saab alapealkirja "337 protokolli täistekstiga"; globaalse otsingu kategooria
  "Koosolekud" jääb, täistekstiotsingu kirje viib `/koosolekud/?q=…#otsing`.
  *Aktsepteerimine:* `/koosolekud/?q=walimine` avab otsinguploki ja näitab tabamusi;
  `/protokollid/?q=walimine&algus=1930-01-01` suunab samade parameetritega; tabelis
  338 rida, K336 ilma protokolli-ikoonita; vana salvestatud "Minu vaade" protokollide
  lehelt töötab; kõik `CLAUDE_CODE_ULESANNE_2.md` PT-01/PT-02/PT-06/PT-07
  aktsepteerimiskriteeriumid kehtivad uuel lehel (337 protokolliga rida + 1 ilma);
  nav on 5 punkti (Avaleht, Isikud, Koosseisud, Koosolekud ja protokollid + otsing).

- **UX-10 PEAB — detaillehed sakkidena.** Mõlema detaillehe päise alla ühine
  sakiriba (`ProtokolliSakid`): **"Koosolek"** (`/koosolekud/<id>/`) · **"Protokolli
  tekst ja originaal"** (`/protokollid/<id>/`); aktiivne sakk esile, teine tavaline
  link (prefetch väljas protokolli sakil, et 1 MB ei laetaks hover'il). Päis on
  mõlemal lehel sama kujuga: "Koosolek 27. oktoober 1930" + vorm, koosseis, juhataja,
  arhiiviviide, Transkribuse link; protokollilehe pealkiri "Protokoll …" asendub
  "Koosolek … — protokoll" (**EELDUS E3-05**; metadata `title` jääb eristatavaks:
  "Koosolek … (protokoll)"). Koosoleku lehelt kaob IN-02 rida "Protokoll: Täistekst →"
  (sakk asendab); K336-l on sakk "Protokolli tekst" passiivne märkega "puudub".
  "Eelmine / järgmine koosolek" nooled päises mõlemal lehel (kronoloogiliselt
  `kuupaev`, siis `koosolek_id`) — hoiab sakis püsides sama lehe tüübi (**VÕIKS**).
  *Aktsepteerimine:* K178 mõlemal lehel sama päis ja sakid; sakivahetus säilitab
  `?lk=`/`#p` parameetreid ei pea (eri sisu), aga `?isik=` kantakse koosoleku lehelt
  protokolli lehele üle; viide-URL-id `/protokollid/K178/?lk=360` töötavad muutmata.

- **UX-11 VÕIB — koosoleku lehe päevakord ja protokoll lähemale.** Koosoleku lehel
  päevakorrapunktide loendis (KO-11) iga pealkirja juures protokolli punkti esimene
  lause halli eelvaatena (`paevakorrapunktid.csv` + `public/protokollid/<id>.json`
  build-ajal; ≤ 160 märki). Ei muuda lehe mahtu oluliselt (338 × ≤ 2 kB).

---

## 5. Muudatused failides

**Muudetakse:** `app/isikud/[id]/page.tsx` (UX-01…UX-05), `components/IsikudTabel.tsx`
(isanimi veerg/eelvaade), `lib/format.ts` (`wikidataQid`), `lib/derive.ts`
(`isikuValimisedKoos`, `isikuAadressidKoos`, `koosseisuSyndmused`, liikmete arvu seeria),
`lib/types.ts`, `app/koosseisud/[id]/page.tsx` (UX-06…UX-08), `components/MuutusteAjatelg.tsx`
(UX-07, uus sisu), `components/KoosolekudVaade.tsx` (variandid → üks vaade, UX-09),
`app/koosolekud/page.tsx`, `app/protokollid/page.tsx` (ümbersuunaja), `components/Nav.tsx`,
`components/GlobalSearch.tsx`, `app/page.tsx`, `app/koosolekud/[id]/page.tsx` ja
`app/protokollid/[id]/page.tsx` (UX-10 sakid, ühine päis), `lib/abitekstid.ts`
(uued: `kinnitamine`, `vahetus`, `valimisteAllikad`), `README.md`, `CLAUDE.md`
(viide sellele dokumendile), `CLAUDE_CODE_ULESANNE.md`/`_2.md` ei muudeta (ajalugu),
kuid README-s märgitakse, et PT-01 nimekiri elab nüüd `/koosolekud`.

**Uued:** `components/ValimisedKoos.tsx`, `components/SyndmusteTabel.tsx`,
`components/LiikmeteAjatelg.tsx` (UX-07; vana `MuutusteAjatelg.tsx` kustutatakse),
`components/ProtokolliSakid.tsx`, `components/KoosolekuPais.tsx` (ühine päis),
`lib/derive-valimised.test.ts`, `lib/derive-syndmused.test.ts`, `lib/format.test.ts`.

---

## 6. Viited (ettevalmistus; rakendamine pärast omaniku juhist)

Faili `VIITED.md` on koondatud kõik viitekujud, mida rakendus kuvab või eksporti
paneb (arhiiviviited isikutel, muutuste allikaviited, koosseisude valimisallikad,
protokollide arhiivi- ja Transkribuse viited, Wikidata, AKL, andmestiku enda viide,
automaatmärgenduse mudelid). Andmestiku omanik annab iga liigi kohta vormistusreegli
(kuidas kuvada, kas ja kuhu linkida, kuidas tsiteerida). Selle põhjal lisatakse hiljem
nõue **UX-12 (viidete ühtne vormistus)**: üks funktsioon `lib/viited.ts`
(`vormistaViide(liik, toorväärtus) → { tekst, url?, tooltip }`), mida kasutavad kõik
lehed ja `lib/protokollid/viide.ts`. Kuni selleni kuvatakse viited toorkujul nagu
praegu; UX-03 allikarida kasutab toorteksti.

---

## 7. Testid (vitest)

- **TE3-01** `wikidataQid`: `Q1`, `https://www.wikidata.org/wiki/Q1`,
  `http://www.wikidata.org/entity/Q1`, ` Q1 ` → `Q1`; `""`, `abc` → `""`.
- **TE3-02** `isikuValimisedKoos`: ainult kandidaat; valitud+kandidaat võrdsete
  väljadega → üks väärtus kahe allikaga; erinev `nimekiri_nimi` → kaks kuju; 1939 hääled;
  `vanus` kandidaadirealt; allikad `koosseisud.csv`-st õige koosseisu järgi.
- **TE3-03** `isikuAadressidKoos`: dubleerimine samal aastal → üks; sama aadress eri
  aastatel → aastad koos; tõst/tühikud; `elukoht_muu` eraldi aadress.
- **TE3-04** `koosseisuSyndmused`: vahetus samal/eri kuupäeval; paaritu lahkumine;
  kinnitamine (valitud) vs liitumine esimesel koosolekul (mittevalitud); 1917–1923
  koosseisus kinnitamist ei teki; `muutus_id`-de hulk säilib; liitumine&lahkumine,
  rühmavahetus, peatamine 1:1.
- **TE3-05** liikmete arvu seeria (UX-07): sünteetiline koosseis → `[algus:3, lahkumine:2,
  liitumine:3, lõpp:3]`; kinnitamine arvu ei muuda (valitud on juba sees).
- **TE3-06** markerite paigutus (UX-07): kaks kuupäeva < 8 px → teine rida; sama päev →
  üks marker arvuga.
- **TE3-07** `/protokollid/` ümbersuunaja säilitab `location.search` ja lisab `#otsing`.
- Olemasolevad testid (derive, protokollid) peavad jääma rohelisteks; `npm run build`
  väljund: 338 koosoleku-, 337 protokolli-, 404 isiku-, 9 koosseisulehte + `/protokollid/`.

---

## 8. Välja jäetud ja lahtised küsimused

**Välja jäetud:** uued andmed või andmeparandused (v.a kuva); nimekirjade
kanoniseerimine (UX-03 näitab toorkujusid allikaga); isikute ühendamine Wikidatast
tõmmatud andmetega; detaillehtede täielik ühendamine üheks URL-iks.

**Eeldused:** E3-01 sugu ei kuvata · E3-02 AKL ID kuvatakse lingita · E3-03 sektsioonide
uus järjekord · E3-04 rea klõps → koosoleku leht · E3-05 protokollilehe pealkirja kuju.

**Küsimused:**
- **K3-01** Mis on `AKL_ID` (14 isikul, nt 36, 38, 48)? Kui see on välise registri ID,
  kas sellele on link? Kuni vastuseta: "AKL: 36" lingita.
- **K3-02** Kas valimiste kaardil kuvada ka `alt_perenimi`/`alt_eesnimi`/`isanimi`
  erinevused ridade vahel (nimekujud allikates)? Eeldus: ei — need on juba isiku päises
  alternatiivkujudena; kaardil ainult sisuväljad.
- **K3-03** UX-09: kas koosolekute lehel jääb KO-01 diagramm üles või läheb
  täistekstiotsingu alla? Eeldus: diagramm üles (olemasolev harjumus), otsing selle all
  kokkuklapitavana.
- **K3-04** Kas "Kinnitati valitud liiged" sündmus peaks olema ka isiku lehel
  liikmesmuutuste tabelis (iga valitud isik saab rea "kinnitati 07.02.1927") või piisab
  karjääriribast? Eeldus: isiku lehel kuvada ühe reana "Valitud liikmena kinnitatud
  07.02.1927 (protokoll ERA.2966.2.68:4)".
- **K3-05** Viidete vormistusreeglid — vt `VIITED.md`.

---

## 9. Töö järjekord

1. UX-02 (Wikidata) + UX-01 — väike, kohe nähtav kasu; TE3-01.
2. UX-03, UX-04 (+ TE3-02, TE3-03); UX-05.
3. UX-06 sündmusmudel + tabel (+ TE3-04), isiku lehe PR-03 samale mudelile.
4. UX-07 uus ajatelg (+ TE3-05, TE3-06); UX-08.
5. UX-09 nimekirjade ühendamine + ümbersuunaja + nav + avaleht (+ TE3-07); UX-10 sakid;
   UX-11.
6. README/CLAUDE.md; käsitsi kontroll: isikud 1, 6, 12, 206; koosseis 1927–1929;
   `/koosolekud/?q=walimine`; `/protokollid/K178/?lk=360`; Lighthouse.
7. Pärast omaniku juhist (`VIITED.md`): UX-12 viidete vormistus.
