# Lähteülesanne, 5. etapp: minimalistlik avaleht, isikute nimekiri ja isiku leht

Rakendus: Tartu Linnavolikogu 1917–1941 (Next.js App Router, TypeScript, Tailwind,
`output: "export"`, `basePath: "/tlv-rakendus"`).
Repo: https://github.com/ut-history-archaeology/tlv-rakendus (seis pärast 4. etappi).
Kuupäev: 20.11.2026.

Loe enne alustamist: `CLAUDE.md`, `CLAUDE_CODE_ULESANNE_3.md` (UX-01…UX-06),
`CLAUDE_CODE_ULESANNE_4.md` (NK-03, VK-01…VK-04, PA-06…PA-10), `VIITED.md`,
`app/page.tsx`, `app/isikud/page.tsx`, `app/isikud/[id]/page.tsx`,
`components/IsikudTabel.tsx`, `components/ValimisedKoos.tsx`,
`components/SyndmusteTabel.tsx`, `components/Nav.tsx`, `components/Footer.tsx`,
`lib/derive.ts`, `lib/viited.ts`, `lib/format.ts`.

**Kujunduse alus:** mock-upid lõuendil „TLV rakendus – lehtede mock-upid“
(https://claude.ai/artifact/Nsg2o3ErBPhgu8XEN9tAmz), artboard'id **Avaleht
(minimalistlik)**, **Volinikud (minimalistlik)** ja **Isik (minimalistlik)**. Mock-upid
on staatilised ja kasutavad augustikuiseid andmeid: tekstid, arvud ja nurksulgudes
kohatäited (`[QID]`, `[N]`) ei ole nõuded. Nõuded on selles dokumendis.

Märgistus: **OTSUS** = andmestiku omanik kinnitas 20.11.2026; **EELDUS** =
kujundusotsus, mida omanik võib muuta (küsimused ptk 8). Prioriteedid: **PEAB** /
**VÕIKS** / **VÕIB**.

Põhimõtted jäävad: eesti keel, staatiline eksport, **URL-id ei muutu**
(`/`, `/isikud/`, `/isikud/<id>/` ja senised päringuparameetrid), "tuletatud"
märgistus, ekspordi sisu ja vormingud (ekspordis jäävad **kõik** veerud ja väljad, ka
need, mida lehel enam ei kuvata), andmevastuolusid ei lahendata koodis heuristikaga.

---

## 1. Eesmärk

**OTSUS:** need kolm lehte muutuvad minimalistlikuks. Igal lehel on üks selge ülesanne
ja vähe sektsioone. Kõrvalinfo kas kaob lehelt (jääb ekspordisse) või muutub üheks
reaks.

| Leht | Ülesanne | Sektsioonid |
|---|---|---|
| `/` | selgitada, mis see on, ja suunata edasi | pealkiri, kirjeldus failist, kaks nuppu, jalus |
| `/isikud/` | leida isik | pealkiri, otsing + 2 valikut, loend |
| `/isikud/<id>/` | ühe isiku lugu | päis, koosseisuriba, ajalugu, protokollides, jalus |

Teised lehed (koosseisud, koosolekud ja protokollid, kontroll) **ei muutu** selles
etapis. Need saavad sama kujunduse hiljem. Kaardileht eemaldatakse (ptk 5a).

---

## 2. Ühine kujundus (PEAB)

### DS-01 Kujundusmärgid

Tailwindi konfiguratsiooni (`theme.extend`) või CSS-muutujatena, nimetatud ja ühes kohas:

| Märk | Väärtus | Kasutus |
|---|---|---|
| taust | `#F6F5F1` | lehe taust |
| pind | `#FFFFFF` | sisestuskast, teisene nupp |
| tekst | `#22211E` | põhitekst, esmane nupp |
| tekst-2 | `#45433E` | alapealkirjad, kuupäevad |
| hall | `#5C5952` | metaread, jalus (kontrast taustal ≥ 4,5:1) |
| link | `#1F5E6B`, hover `#123E47` | lingid |
| joon | `#E2DFD8` | loendi eraldajad |
| raam | `#CFCBC2` | sisestuskast, teisene nupp |

Kirjatüübid `next/font/google` kaudu (build-ajal, ei vaja välisvõrku jooksvalt):
**Source Serif 4** (600; pealkirjad, isikute nimed loendis 500) ja **Inter** (400, 500;
kõik muu). Sisu laius **720 px** (`max-w-[720px] mx-auto`), külgpolsterdus 24 px.
Koosseisude värvipaletti neil kolmel lehel **ei kasutata** (**EELDUS E5-01**); palett jääb
teistele lehtedele.

### DS-02 Lihtne leheraam `components/LihtneLeht.tsx`

Uus paigutuskomponent kolmele lehele. Avaleht ja isikulehed **ei kasuta** `Nav.tsx`-i
ega globaalset otsingut (**OTSUS**). Isikute nimekirja ja isiku lehe ülaosas on üks rida:
vasakul tagasilink (`← Tartu Linnavolikogu 1917–1941` nimekirjal, `← Volinikud` isiku
lehel), paremal link **„Loe protokolle“** (`/koosolekud/`). Teistel lehtedel jääb
senine `Nav.tsx` alles.

Tehniliselt: kas route group (`app/(lihtne)/…`) oma `layout.tsx`-iga või
`app/layout.tsx`-is tingimus. Valik on vaba, aga URL-id ei tohi muutuda ja
`metadata`/`<title>` peab jääma lehepõhiseks.

### DS-03 Ligipääsetavus

- Lingid on `<a>`, nupud `<button>`. Kogu loendirida on üks `<a>` (isikute nimekiri).
- Otsingukastil on `<label>` (visuaalselt peidetud), valikutel on nähtav silt.
- Klaviatuuriga on kõik kättesaadav, fookus on nähtav (`focus-visible:outline`).
- Puutepinnad on ≥ 44 px kõrged.
- Koosseisuriba (ptk 5) on `role="img"` koos tekstilise `aria-label`-iga, ja iga
  lõik on link, millel on oma silt.

---

## 3. Avaleht `/` (PEAB)

### AV5-01 Sisu

Ülevalt alla, ilma muude plokkideta:

1. **Pealkiri** „Tartu Linnavolikogu 1917–1941“ (Source Serif 4, 52 px).
2. **Projekti kirjeldus** failist `content/avaleht.md` (AV5-02), 18 px, reavahe 1,65.
3. **Kaks suurt nuppu** kõrvuti, kitsal ekraanil üksteise all:
   - „Otsi Tartu linnavolikogu liikmeid“ → `/isikud/` (täidetud, tume taust);
   - „Loe protokolle“ → `/koosolekud/` (valge taust, raamiga).

   Mõlemad on `<a>`, min-kõrgus 96 px, tekst 22 px, paremal nool `→` (`aria-hidden`).
4. **Jalus** väikeses hallis kirjas: „Laadi alla kogu andmestik“ (PA-02 link
   `avalikUrl("tlv-andmestik.zip")`) ja link **Koosseisud** (`/koosseisud/`). Viimane
   on vajalik, sest avalehel pole enam menüüd (**EELDUS E5-02**).

Avalehelt **eemaldatakse**: ajatelg (AV-02), statistikakaardid (AV-03), „Kolm teed“
(AV-04), faktid (AV-05), globaalne otsing ja menüü. Komponente, mida teised lehed ei
kasuta, ei jäeta surnud koodina alles.

### AV5-02 Kirjeldus eraldi failist

- Fail **`content/avaleht.md`** repo juurkaustas, Markdown. **OTSUS:** omanik muudab
  avalehe teksti ainult seda faili muutes, koodi puutumata. Muudatus läheb lehele
  järgmise buildiga.
- Fail loetakse **build-ajal** (`fs.readFileSync` serverkomponendis) ja teisendatakse
  HTML-iks build-ajal. Kliendi JS-i see ei suurenda.
- Toetatud: lõigud, **rasvane**, *kursiiv*, lingid, loendid. Toores HTML on keelatud
  (teisendaja seadistusega välja lülitatud või puhastatud). Pealkirju (`#`) failis ei
  oodata: kui on, kuvatakse need tavalise rasvase lõiguna, sest lehe pealkiri on koodis.
- Sisemised lingid kujul `/isikud/6/` saavad automaatselt `basePath`-i ette. Välised
  lingid (`https://…`) avanevad uues aknas (`rel="noopener noreferrer"`).
- Kui fail puudub või on tühi, **katkeb build** selge veateatega („content/avaleht.md
  puudub — avalehe kirjeldus on kohustuslik“).
- Algsisu: senine avalehe lühiselgitus, mis tõstetakse faili muutmata kujul ümber.
  Omanik asendab selle hiljem.
- `README.md` uus jaotis **„Avalehe teksti muutmine“**: faili asukoht, mida
  Markdownis kasutada saab (näitega), kuidas muudatus lehele jõuab (commit → GitHub
  Actions → Pages). Jaotis peab olema mõistetav ka ilma programmeerimiskogemuseta.

*Aktsepteerimine:* `content/avaleht.md`-sse lisatud lõik ja link `/isikud/6/` ilmuvad
pärast `npm run build`-i lehele ja link viib `/tlv-rakendus/isikud/6/`-le; toores
`<script>` failis ei jõua HTML-i; faili kustutamisel build katkeb; avalehe HTML-is pole
`Nav`-i ega statistikat.

---

## 4. Isikute nimekiri `/isikud/` (PEAB)

### IS5-01 Pealkiri

„Volinikud“ ja üks lause: „N inimest, kes olid linnavolikogu liikmed või
asendusliikmed.“ N tuletatakse andmetest.

### IS5-02 Otsing ja kaks valikut

- **Suur otsingukast** (min-kõrgus 64 px, tekst 20 px, luubi ikoon): sama otsinguloogika
  mis praegu (IS-02: perenimi, eesnimi, alternatiivkujud, osalised vasted, debounce
  300 ms).
- Selle all kaks **natiivset `<select>`-i** nähtava sildiga:
  - **Koosseis**: „kõik“ + 9 koosseisu;
  - **Nimekiri**: „kõik“ + kanoonilised nimekirjad (NK-03).

  Mõlemad on üksikvalikud (**EELDUS E5-03**: seni mitmikvalik). URL-parameetrid jäävad
  samaks (`koosseis`, `nimekiri`, `q`). Kui URL-is on mitu väärtust (vana jagatud link),
  rakendatakse filter kõigiga nagu seni ja `<select>` näitab „mitu valitud“.
- Paremal servas tulemuste arv („55 nime“).

**Eemaldatakse lehelt:** filtrikiibid ja „Tühjenda kõik“ (UN-02, UN-03: kaks
`<select>`-i on ise nähtavad), „Oli juhataja“ lüliti (IS-06), veergude valik, „Minu
vaade“ (UN-08), sorteerimine veergude kaupa (IS-08, UN-05, UN-06) ja hover-eelvaade
(IS-10 teine pool). Parameetrid `juhataja` ja `sort` loetakse edasi ja rakendatakse, kui
need on URL-is, aga UI-s neid ei pakuta (**EELDUS E5-04**).

### IS5-03 Loend

Tabeli asemel on loend. Iga isik on üks rida ja kogu rida on link `/isikud/<id>/`:

- **vasakul üleval**: „Perenimi, Eesnimi“ (Source Serif 4, 22 px, 500);
- **paremal üleval**: volikogus oldud aastad, kujul „1917–1934“ (esimese lõigu algusaasta
  kuni viimase lõigu lõpuaasta `karjaariSegmendid()`-st; üks aasta → „1921“);
- **all hallis kirjas**: „6 koosseisu · Majaomanikud“ (koosseisude arv · peamine
  kanooniline nimekiri). Kui nimekirja pole, jääb ainult arv.
- PA-06 juhtum (liikmeks saamise kirje puudub): aastate asemel „?“ ja metareal
  „koosseis teadmata“, `title` sama tekstiga mis PA-06-s.

Järjestus on alati perenimi A–Z (eesti tähestik, `localeCompare("et")`). Kuvatakse 50
rida, nupp-link **„Näita veel“** lisab järgmised 50. Senine paginatsioon (`leht`
parameeter) jääb URL-is toimima. Kui tulemusi pole: „Ühtegi nime ei leitud.“ ja link
„Tühjenda otsing“.

### IS5-04 Allalaadimine

Loendi all väike hall link **„Lae nimekiri alla“**, mis avab senise `ExportButton`-i
menüü (CSV / Excel / JSON). Sisu ja failinimi on muutmata (IS-09, EX-07, EX-08): kõik
veerud, praegused filtrid.

*Aktsepteerimine:* `/isikud/?koosseis=1927-1929` näitab 55+ isikut ja Koosseisu valikus on
„1927–1929“; Allik (6) real on „1917–1934“ ja „6 koosseisu · …“; Bukk (395) real on „?“;
otsing „walter“ leiab Rätsepa; `/isikud/?sort=koosseise-desc` ei anna viga; Tab-klahviga
pääseb otsingust valikutesse ja esimesse ritta.

---

## 5. Isiku leht `/isikud/<id>/` (PEAB)

### PR5-01 Päis

- **Nimi** (Source Serif 4, 52 px).
- **Eluaastad** ühel real (18 px): osaline kuupäev nagu andmetes, märge „(tuletatud)“
  kui `synd_tuletatud`. Kui eluaastaid pole, rida puudub.
- **Üks hall rida** (15 px), eraldajaga `·`, ainult täidetud osad:
  - alternatiivkujud: „ka Oskar-Friedrich“;
  - **Wikidata link** `wikidataQid()` järgi: tekst „Wikidata ↗“, `title` = QID,
    `rel="noopener noreferrer"`. Kuvatakse ainult siis, kui QID on olemas.

  Kui kumbagi pole, rida puudub.

**OTSUS 20.11.2026:** isiku lehelt eemaldatakse **isanimi** ja **aadressid**. Samuti
kaovad sugu (oli juba peidetud), AKL ID ja aadresside kaart. Kõik need jäävad profiili
JSON-i ja PDF-i ning isikute ekspordi. UX-01 sildid (`dl`) asenduvad selle reaga.

### PR5-02 Koosseisuriba

- Lause: „Linnavolikogus **N koosseisus**, 1917–1934“ (aastad nagu IS5-03).
- Selle all **õhuke riba** (8 px), mis on jagatud 9 võrdseks lõiguks, üks iga koosseisu
  kohta. Lõigu täidetud osa on proportsionaalne isiku liikmepäevadega selles koosseisus
  (`karjaariSegmendid()`, PA-09 reeglid). Täidetud osa on `#22211E`, tühi `#E2DFD8`.
  Näiteks Allik 1924–1926: 15.–28.01.1924 annab kitsa täidetud osa koosseisu algusest.
- Iga lõik on link koosseisu lehele. `aria-label`/`title`: „1924–1926: liige
  15.01.1924–28.01.1924“ või „1934–1939: ei olnud liige“.
- Riba all väikeses kirjas „1917“ vasakul ja „1941“ paremal.
- PA-06 juhtum: lause „Liikmeks saamise kirje puudub andmetes“ ja tõendite loetelu nagu
  PA-06-s. Riba näitab ainult teadaolevaid lõike.

Senine Gantt-tüüpi karjääririba (PR-02) asendub sellega.

### PR5-03 Ajalugu: üks kronoloogiline loend

Pealkiri **„Ajalugu“**. Valimised (VK-01 kaardid) ja liikmesmuutused (UX-06
sündmusmudel, sh kinnitamine K3-04) on **üks loend**, kuupäeva järgi, filtrinuppudeta.
`ValimisedKoos` ja `SyndmusteTabel` kui eraldi sektsioonid kaovad isiku lehelt (koosseisu
lehel jääb `SyndmusteTabel` alles).

Rida on kahe veeruga: vasakul kuupäev (132 px, `kuupaevadEesti` lühikuju: „18.–19.12.1926“,
„07.02.1927“), paremal kaks rida:

| Sündmus | 1. rida (16 px) | 2. rida (hall, 13 px) |
|---|---|---|
| valimised, valiti | „Valiti, <kanooniline nimekiri>“ | koht nimekirjas / üldjärjestuses · esimene amet · tulemuste allikas lingina |
| valimised, ainult kandidaat | „Kandideeris, <kanooniline nimekiri>“ | koht · amet · kandidaatide allikas või **VIIDE PUUDU** |
| liitumine / lahkumine / rühmavahetus / peatamine / kinnitamine | „Liitus volikoguga“, „Lahkus, asemele <isik>“, „Asendas <isik>“, „Vahetas rühma: …“, „Kinnitati volikogu liikmeks“ | koosoleku link (PA-07) · arhiiviviide lingina (PA-10) |
| `liitumine&lahkumine` | ühe kuupäevaga (PA-08) | sama |

Asendaja ja asendatav on nimed lingina isiku lehele. Mitmepäevased valimised on ühel
real. Sama kuupäeva valimised ja kinnitamine on eraldi ridadel, valimised enne.

**VK-03 säilib ühe klõpsu taga (EELDUS E5-05):** valimiste real on 2. rea lõpus väike
link **„allikad“**. See avab rea all (`<details>`) VK-03 täisvaate: iga väärtus koos oma
viitega, erinevad väärtused eraldi, puuduv viide **VIIDE PUUDU**, venekeelsed nimekujud
(VK-04). Avatud olekus **ei kuvata aadressi** (OTSUS PR5-01). Kokku volditud real on
ainult üks allikaviide: valitul tulemuste allikas, kandidaadil kandidaatide allikas.

Ameti tekst lõigatakse 2. real 80 märgi juures `…`-ga, täistekst on `title`-s ja
„allikad“ all.

### PR5-04 Protokollides (VÕIKS osaliselt)

Pealkiri **„Protokollides“** ja kuni kolm lauset. Kui kõik on tühjad, kaob kogu
sektsioon.

- (PEAB) „Nimetatud N koosolekul.“ (kõrge + keskmise kindlusega mainimised pärast
  aliaseid AN-02) ja link **„Vaata mainimisi“**. Link avab sama lehe sees `<details>`
  loendi: kuupäev → `/protokollid/<id>/?isik=<isik_id>`.
- (VÕIKS) „Juhatas N koosolekut (1927–1929).“, kui isik oli juhataja. Juhatamise
  statistika plokk (PR-08) asendub sellega.
- (VÕIKS) „Osales N koosolekul M-st, mil oli liige.“ `osavott.csv` põhjal, märkega
  „(tuletatud)“. Osavõtu graafik (PR-06) jääb ära.

### PR5-05 Jalus

Joone all, hallis kirjas (14 px):

- „Arhiiviviited:“ ja iga viide eraldi lingina (`arhiiviUrl`, PA-10);
- lingid **Kopeeri viide** (senine tsitaadifunktsioon), **Lae alla (PDF)**, **Lae alla
  (JSON)**. Sisu on muutmata (PR-09), JSON sisaldab ka isanime ja aadresse.

**Eemaldatakse lehelt:** aadressid ja kaardilink (PR-05), osavõtu graafik (PR-06),
juhatamise plokk (PR-08), võrgugraaf (PR-11), isanimi, AKL ID ja ülemine menüü.

*Aktsepteerimine:*
- **Isik 6 (Allik):** päises ei ole isanime ega aadresse; riba 6 lõiguga, kus 1924–1926
  on kitsalt täidetud; ajaloos 10+ rida järjekorras 20.08.1917 … 24.01.1930; rida
  28.01.1924 „Lahkus, asemele Mihkel Massakas“ koos koosoleku lingi ja
  `ERA.2966.2.64a:10` lingiga; 1917 „allikad“ avab VK-03 vaate (eesti- ja venekeelne
  nimekiri, **VIIDE PUUDU** venekeelsetel väärtustel), ilma aadressita (`Толстого 10`
  ei kuvata).
- **Isik 12 (Belousov):** „Wikidata ↗“ viib `https://www.wikidata.org/wiki/Q12370898`.
- **Isik 96 (Mekkart):** 1927–1929 lõik on osaliselt täidetud (PA-09), ajaloos
  „07.02.1927“ üks kord.
- **Isik 395 (Bukk):** PA-06 lause ja tõendid, riba ilma täidetud lõikudeta.
- **Isik 257 (Engelhardt):** „Protokollides“ näitab mainimisi pärast aliast 301 → 257.
- Isikul ilma Wikidata ja alternatiivkujuta pole päises halli rida ega üksikut eraldajat.

---

## 5a. Kaardileht eemaldatakse (PEAB)

**OTSUS 20.11.2026:** kaardilahendust rakenduses ei tule. Algse lähteülesande kaardinõuded KT-01…KT-08 (`TLV rakendus ja ideed.docx`, ptk 4.7; **mitte** 4. etapi kontrolllehe KT-01…KT-06, mis jäävad),
PR-05 (isiku aadressi kaart) ja EX-06 (GeoJSON) tühistatakse; aadresside
geokodeerimist ei tehta.

- **KA5-01** Eemaldada `app/kaart/` ja ainult kaardi jaoks kasutatud komponendid, abifunktsioonid,
  geokodeeringu failid ja sõltuvused (nt Leaflet/MapLibre, kui neid mujal ei kasutata).
  `npm ls` ja `package.json` ei tohi neid enam sisaldada.
- **KA5-02** `Nav.tsx`-ist ja mobiilimenüüst kaob punkt „Kaart“. Globaalsest otsingust,
  avalehelt, isiku ja koosseisu lehelt kaovad kõik lingid `/kaart/`-le.
- **KA5-03** Et vanad jagatud lingid ei annaks 404, jääb `/kaart/` alles **ümbersuunajana**
  (sama muster mis `/protokollid/` UX-09-s): staatiline leht, mis suunab `/`-le, ja
  JS-ita kasutajale lause „Kaardivaadet rakenduses enam ei ole“ koos lingiga avalehele.
  Leht on `noindex` ja ei ole sitemap'is.
- **KA5-04** Aadressiandmed (`valimised.csv` elukoha veerud) jäävad andmestikku,
  ekspordi ja ZIP-i muutmata. Kaovad ainult kuvamine ja kaart.
- `README.md` ja `data/README.md`: kaardi mainimised eemaldada, märge tühistatud
  nõuetest.

*Aktsepteerimine:* `out/kaart/index.html` on ümbersuunaja; `grep -rn "/kaart"
app components lib` leiab ainult ümbersuunaja (sõna „kaart“ esineb edasi valimiste kaardi
tähenduses, VK-01); menüüs pole „Kaart“; build ja testid on
rohelised; isikute CSV ekspordis on aadressi veerud alles.

---

## 6. Testid (vitest)

- **TE5-01** `content/avaleht.md` teisendus: lõik, rasvane, link `/isikud/6/` saab
  `basePath`-i, väline link saab `rel`-i, `<script>` eemaldatakse, tühi või puuduv fail
  annab vea.
- **TE5-02** `isikuAastad(segmendid)` → „1917–1934“, „1921“, `null` (PA-06).
- **TE5-03** `koosseisuRibaLoigud(isik)` → 9 lõiku, igaühel täidetud osa (0…1), algus,
  lõpp ja silt. Allik: 6 lõigul > 0, 1924–1926 < 0,05. Mekkart 1927–1929 < 1.
- **TE5-04** `isikuAjalugu(andmed, id)`: valimised ja muutused ühes loendis, kuupäeva
  järgi; valimised enne kinnitamist samal kuupäeval; „Kandideeris“, kui `valitud`-rida
  puudub; `liitumine&lahkumine` üks rida.
- **TE5-05** Isikute filter: üksik- ja mitmikväärtusega `koosseis` URL-is annavad
  õige hulga; `sort` parameeter ei viska viga.
- Senised testid jäävad roheliseks, `npm run build` õnnestub. Käsitsi: lehed `/`,
  `/isikud/`, isikud 6, 12, 96, 257 ja 395 laiusel 375, 768 ja 1280 px; Lighthouse
  Accessibility ≥ 95 neil kolmel lehel.

---

## 7. Muudatused failides

**Muudetakse:** `app/page.tsx`, `app/isikud/page.tsx`, `app/isikud/[id]/page.tsx`,
`components/IsikudTabel.tsx` (→ loend; võib asendada uue `IsikudLoend.tsx`-iga, kui
tabelit mujal ei kasutata), `app/layout.tsx` või uus route group, `tailwind.config.*`,
`lib/derive.ts` (`isikuAastad`, `koosseisuRibaLoigud`, `isikuAjalugu`), `README.md`,
`CLAUDE.md` (viide sellele dokumendile).

**Uued:** `content/avaleht.md`, `lib/sisu.ts` (Markdowni lugemine ja teisendus),
`components/LihtneLeht.tsx`, `components/KoosseisuRiba.tsx`, `components/IsikuAjalugu.tsx`,
testifailid TE5-01…TE5-05. Markdowni teisendus: väike sõltuvus (nt `marked` +
`sanitize-html` või `remark` + `rehype-sanitize`). Valik põhjendada PR-is.

**Eemaldatakse:** `app/kaart/` (asendub ümbersuunajaga) ja kaardi komponendid (ptk 5a).

**Ei muudeta:** teiste lehtede kujundus, `Nav.tsx` (ainult nendel kolmel lehel ei
renderdata), ekspordiformaadid, andmeskriptid.

---

## 8. Lahtised küsimused (eeldus kehtib, kuni omanik otsustab)

- **E5-01:** kas koosseisude värvid peaksid isiku lehe ribal olema? Eeldus: ei,
  monokroomne.
- **E5-02:** kas avalehe jaluses peaks olema link Koosseisud, või jääb see leht ainult
  teiste lehtede menüüsse? Eeldus: jaluses on.
- **E5-03:** kas nimekirja filtrid võivad olla üksikvalikud? Eeldus: jah.
- **E5-04:** kas „Oli juhataja“ filter ja sorteerimine võivad nimekirjalehelt kaduda?
  Eeldus: jah, URL-iga töötavad edasi.
- **E5-05:** kas VK-03 väärtuspõhised viited võivad olla „allikad“ lingi taga, mitte
  kohe nähtavad? Eeldus: jah.
- Kas sama minimalistlik kujundus läheb järgmises etapis koosseisude ja koosolekute
  lehtedele (siis asendub `Nav.tsx` kõikjal)?

---

## 9. Töö järjekord

1. DS-01, DS-02 (kujundusmärgid, kirjatüübid, `LihtneLeht`).
2. AV5-01, AV5-02 + TE5-01, README jaotis.
3. IS5-01…IS5-04 + TE5-02, TE5-05.
4. PR5-01…PR5-03 + TE5-03, TE5-04; seejärel PR5-04 ja PR5-05.
5. KA5-01…KA5-04 kaardi eemaldamine.
6. Käsitsi kontroll (ptk 6), README/CLAUDE.md.
