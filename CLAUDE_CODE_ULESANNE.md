# Lähteülesanne: Tartu Linnavolikogu 1917–1941 veebirakendus

## Eesmärk

Ehitada Next.js rakendus Tartu Linnavolikogu ajalooandmestiku (1917–1941)
sirvimiseks ja uurimiseks. Andmestik: 404 isikut, 9 koosseisu, 337 koosolekut,
633 liikmesmuutust, 1092 valimiskirjet, 5087 osavõtukirjet. Sihtrühm on nii
ajaloohuviline avalikkus kui ka süvauurijad.

## Andmed

Kõik andmed on kaustas `data/` puhastatud CSV-failidena. **Loe enne alustamist
läbi `data/README.md`** — seal on täielik andmesõnastik, seosed ja tuletamis-
reeglid. Viitamisterviklikkus on valideeritud: kõik `isik_id` ja `koosseis_id`
viited klapivad.

Soovituslik lähenemine: andmestik on väike (kokku < 10 000 rida), seega laadi
CSV-d build-ajal JSON-iks (või SQLite'i) ja tee filtreerimine/sorteerimine
kliendipoolselt. Eraldi API-serverit ega andmebaasi pole vaja.

## Tehnoloogia

- Next.js (App Router) + TypeScript
- Tailwind CSS; komponendid nt shadcn/ui
- Diagrammid: Recharts vms
- Keel: kogu kasutajaliides EESTI keeles
- Staatiliselt genereeritav (SSG) — kõik lehed peavad töötama ilma serverita

## VÄLJA JÄETUD funktsionaalsus (andmed puuduvad — ÄRA ehita)

Järgmised algse visioonidokumendi osad jäävad sellest etapist välja, sest
vajalikud andmed pole veel valmis. Ehita rakendus nii, et neid saab hiljem
lisada, aga ära loo tühje lehti ega placeholder-vaateid:

1. **Protokollide leht** (`/protokollid`) — JSON-annoteeritud protokollid
   pole veel kättesaadavad. Samuti: isikuprofiili "mainimised protokollides",
   koosoleku päevakorrapunktid, täistekstiotsing protokollidest.
2. **Kaardileht** (`/kaart`) — aadressid on geokodeerimata. Samuti:
   isikuprofiili minikaart. Aadressid ISE on olemas (valimised.csv
   elukoht-veerud) — kuva neid TEKSTINA isikuprofiilis ja liikmete tabelis.
3. **Nimekirjade kanoniseerimine** — pooleli (eraldi tööfail). Rakendus
   kasutab toorkujusid (`nimekiri_nimi`) ja kuvab nimekirjafiltrite juures
   hoiatuse: "Nimekirjade nimekujud on ühtlustamata — sama nimekiri võib
   esineda mitme variandina."
4. Fotod/illustratsioonid, ajalooliste kaartide kiht, keelevalik.

## Lehed ja nõuded

Prioriteedid: **PEAB** = ilma selleta pole valmis; **VÕIKS** = tee, kui aega
jääb, järjekorras.

### Globaalsed komponendid

- Ülemine navigatsiooniriba: 5 lehte (Avaleht, Isikud, Koosseisud,
  Koosolekud + globaalne otsing).
- **Globaalne otsingukast** — otsib korraga isikuid (nimi) ja koosolekuid
  (kuupäev); tulemused kategooriate kaupa.
- Jalus: andmeallikad ("Tartu Linnavolikogu andmestik, 2026; Rahvusarhiiv"),
  link kogu andmestiku allalaadimiseks (ZIP kõigist CSV-dest).
- Kontekstuaalne abi: "?" ikoon keerukate mõistete juures (koosseis,
  nimekiri, erakorraline koosolek, "linnavalitsus volikogu ülesandeis").
- Eksport-nupp igal andmevaatel (vt Ekspordi-nõuded all).

### 1. Avaleht `/`

- **AV-01 PEAB**: Pealkiri "Tartu Linnavolikogu 1917–1941" + 1–2 lauset
  (404 isikut, 9 koosseisu, 337 koosolekut, 633 liikmesmuutust).
- **AV-02 PEAB**: Horisontaalne ajatelg 1917–1941: 9 koosseisu värviliste
  ribadena (igal koosseisul kindel värv, mida kasutatakse LÄBIVALT kogu
  rakenduses), valimispäevad vertikaaljoontena. Koosseisule klõps →
  koosseisu leht.
- **AV-03 PEAB**: 4 võtmestatistika kaarti (koosseisud, isikud, koosolekud,
  muutused), igaüks klikitav vastavale lehele.
- **AV-04 VÕIKS**: "Kolm teed andmetesse" — kolm suurt CTA-d (volinikud,
  koosolekud, koosseisud).
- **AV-05 VÕIKS**: huvitavate faktide karussell (3–5 fakti, ARVUTA need
  andmetest, nt pikima karjääriga volinik koosseisude arvu järgi; iga fakt
  klikitav asjakohasele lehele).

### 2. Isikute nimekiri `/isikud`

- **IS-01 PEAB**: tabel: Perenimi, Eesnimi, Koosseisude arv, Esimene
  koosseis, Viimane koosseis, Peamine nimekiri (toorkuju). Koosseisude arv
  tuletatakse valimistest (roll=valitud) + muutuste liitumistest.
  Paginatsioon 50 rida.
- **IS-02 PEAB**: reaalajaline tekstiotsing (perenimi, eesnimi, ka alt-kujud,
  osalised vasted, diakriitika-tundetu).
- **IS-03 PEAB**: mitmikvalik-filter koosseisu järgi.
- **IS-04 PEAB**: mitmikvalik-filter nimekirja järgi (toorkujud + hoiatus,
  vt "Välja jäetud" p 3).
- **IS-06 VÕIKS**: lüliti "oli juhataja" (andmed: koosolek_juhatajad.csv,
  15 isikut).
- **IS-08 PEAB**: sorteerimine igalt veerult.
- **IS-09 PEAB**: eksport CSV/Excel/JSON — KÕIK andmebaasi veerud,
  aktiivsed filtrid arvesse.
- **IS-10 PEAB**: rida klikitav → profiil; hover-eelvaade (nimi, eluaastad,
  koosseisud).

### 3. Isikuprofiil `/isikud/[id]`

- **PR-01 PEAB**: täisnimi, eluaastad (osalised kuupäevad kuva nagu on,
  nt "1871–?"), alternatiivkujud, wikidata-link kui olemas, arhiiviviited.
- **PR-02 PEAB**: karjääririba — Gantt-laadne ajatelg 1917–1941, kus isiku
  koosseisud on värviribadena (koosseisu läbiv värv); klikk → koosseisu leht.
- **PR-03 PEAB**: kronoloogilised sündmused tabelina (muutused.csv):
  kuupäev, liik, protokolliviide, asendaja/asendatav LINGINA teisele
  profiilile.
- **PR-04 PEAB**: valimiste kaart: iga valimisaasta, roll
  (valitud/kandidaat), nimekiri (toorkuju), koht nimekirjas (jrk-veerud),
  1939 puhul ringkond ja hääled.
- **PR-05 (muudetud) VÕIKS**: teadaolevad aadressid TEKSTINA
  (valimised.csv elukoht-veerud, aastate kaupa). MITTE kaardina.
- **PR-06 VÕIKS**: osavõtustatistika osavott.csv põhjal: mitmel koosolekul
  nimetatud kohalolijana/puudujana. Kasuta ainult kirjeid
  sidumise_kindlus ∈ {kõrge, keskmine}. Kuva ka tuletatud kohalolu
  (vt README "kohaloleku tuletamise reegel") eraldi märkega "tuletatud".
- **PR-08 VÕIKS**: juhatamise statistika (mitu koosolekut, vahemik, vormid).
- **PR-09 PEAB**: eksport: JSON (struktureeritud profiiliandmed) + PDF
  (formateeritud leht; kui PDF osutub keerukaks, piisa brauseri
  print-stiililehest window.print() jaoks).
- **PR-11 VÕIKS**: väike võrguvisualisatsioon: isik keskel, asendussuhted
  (asendaja_ID/asendatav_ID) servadena.

### 4. Koosseisud `/koosseisud` ja `/koosseisud/[id]`

`[id]` = koosseis_id slug (nt `1921-1923`).

- **KS-01 PEAB**: indeksleht 9 kaardiga: aastad, liikmete arv (valitud +
  hiljem liitunud), valimiste kuupäev, koosolekute arv, muutuste arv.
  Koosseisu läbiv värv.
- **KS-02 PEAB**: koosseisu pea-plokk: aastad, valimispäev(ad), esimene ja
  viimane koosolek, suurus, arhiiviviited. 1940-1941 erikoosseisu juures
  selgitus, et tegu on nõukogude okupatsiooni aja linnavalitsusega volikogu
  ülesandeis.
- **KS-03 PEAB**: poliitilise jaotuse virndiagramm (100% lintdiagramm)
  AINULT valimistulemuste (roll=valitud) põhjal, toornimekirjade kaupa.
  Hover: nimi, arv, protsent. Klõps segmendil filtreerib all liikmete
  tabelit. NB: 1939/1940 koosseisul nimekirjad puuduvad — kuva sel juhul
  ringkondade jaotus või jäta diagramm koos selgitusega ära.
- **KS-04 PEAB**: liikmete tabel (sama komponent nagu /isikud, eelfiltritud;
  lisaveerg aadress tekstina, kui on).
- **KS-05 VÕIKS**: muutuste ajatelg koosseisu kestuse peal, koosolekud
  vertikaaljoontena.
- **KS-06 VÕIKS**: koosolekute loetelu (kuupäev, vorm, kohalolnud, juhataja;
  rida → koosoleku leht).
- **KS-07 VÕIKS**: 1934-1939 koosseisu lehel 1939. a valimiste erikuvar:
  hääled 4 ringkonna kaupa tulpdiagrammina (valimised.csv, aasta=1939).
- **KS-08 PEAB**: eksport CSV/Excel/JSON (liikmed + muutused + koosolekud).
- **KS-09 VÕIB**: kahe koosseisu kõrvutivõrdlus (jaotus, liikmete kattuvus).

### 5. Koosolekud `/koosolekud` ja `/koosolekud/[id]`

- **KO-01 PEAB**: sagedusdiagramm aastate kaupa 1918–1941, tulbad
  vormi kaupa värvitud (korraline / erakorraline / linnavalitsus volikogu
  ülesandeis / pidulik / määramata). Aastal klõps filtreerib tabelit.
- **KO-02 PEAB**: tabel: Kuupäev, Nädalapäev, Vorm, Juhataja, Kohalolnud
  (arv), Koosseisu suurus. Kahepäevastel koosolekutel kuva mõlemad
  kuupäevad ja mõlemad kohalolu-arvud. 50 rida lehel.
- **KO-03 PEAB**: ajavahemiku filter (liugur või kuupäevavalijad, mõlemad
  töötavad).
- **KO-05 PEAB**: juhataja-filter (ripploend isikutega
  koosolek_juhatajad.csv-st; Robert Sinka ilma lingita). Juhataja nimel
  klõps tabelis → isikuprofiil.
- **KO-07 (kohandatud) PEAB**: koosoleku detailleht: kuupäev(ad), vorm,
  koosseis (link), juhataja(d) (link profiilile), kohalolnute/puudujate
  arvud, protokollis nimetatud isikud osavott.csv-st (seotud nimed
  lingitud profiilile, sidumata nimed halli tekstina toorkujul,
  sidumise_kindlus="mitmene" puhul märge), tuletatud kohalolijate loend
  (koosseisu liikmed miinus puudujad, märkega "tuletatud"),
  protokolli_algus_txt kuvatav kokkuklapitava plokina pealkirjaga
  "Protokolli algus (toores OCR-tekst)". PÄEVAKORDA EI OLE (JSON puudub).
- **KO-08 PEAB**: sorteerimine igalt veerult.
- **KO-09 PEAB**: eksport CSV/Excel/JSON filtri järgi; detaillehelt PDF/print.
- **KO-10 VÕIB**: kalendrivaade (tabel ↔ kalender toggle).

## Üldnõuded (kõigil tabelivaadetel)

- **UN-01**: filtrid rakenduvad reaalajas; tekstiotsingul debounce 300 ms.
- **UN-02**: aktiivsed filtrid kiipidena tabeli kohal, X eemaldab.
- **UN-03**: "Tühjenda kõik filtrid" nupp, kinnituseta.
- **UN-04**: filtrid URL-i query-parameetrites (jagatav link).
- **UN-05**: sorteerimine veeru pealt (asc→desc), nool aktiivsel veerul,
  sorteeritakse KOGU filtreeritud andmestikku.
- **UN-06**: Shift+klõps = teisene sorteerimisveerg (max 3).
- **UN-07**: paginatsioon.
- **UN-08**: filtrieelistuste salvestus localStorage'i ("Minu vaade").
  NB: localStorage kasutus on lubatud, sest tegu on iseseisva Next.js
  rakendusega (mitte Claude.ai artifactiga).

## Ekspordi-nõuded

- **EX-01**: eksport-nupp tabeli parem-ülanurgas, "↓ Lae alla".
- **EX-02**: CSV: UTF-8 (BOM-iga, et Excel õigesti avaks), SEMIKOOLON-
  eraldaja (Eesti Exceli vaikimisi), esimene rida veerunimed, kõik
  andmeveerud (mitte ainult kuvatud).
- **EX-03**: Excel .xlsx: üks leht, esimene rida külmutatud, Arial,
  automaatne veerulaius (nt exceljs või xlsx-teek).
- **EX-04**: JSON: päises eksporditimestamp, filtrid, ridade arv; andmed
  body-s.
- **EX-05 VÕIKS**: PDF (või print-stiilileht).
- **EX-07**: failinimi kirjeldav: `tlv-isikud-koosseis-1921-1923-2026-08-14.csv`.
- **EX-08**: metaandmed CSV-s #-kommentaaridena, JSON-is eraldi võtmena:
  aeg, URL, filtrid, ridade arv, allikas "Tartu Linnavolikogu andmestik, 2026".
- **EX-09 VÕIKS**: jaluses "Laadi alla kogu andmestik" (ZIP data/-kaustast).

## Andmeloogika erireeglid

1. **Koosseisu liikmelisus kuupäeval D**: alusta valimised(roll=valitud,
   koosseis) hulgast; rakenda muutused kronoloogiliselt kuni D
   (liitumine lisab, lahkumine eemaldab, liitumine&lahkumine = mõlemad samal
   päeval, peatamine eemaldab ajutiselt). See on alus nii tuletatud
   kohalolule (KO-07) kui liikmete arvule (KS-01).
2. **Osavõtus** kasuta profiili-statistikas ainult kindlus ∈ {kõrge,
   keskmine}; "mitmene" ja "puudub" kirjeid kuva ainult koosoleku detail-
   lehel toorkujul.
3. **Osalised kuupäevad** (nt sünniaeg "1871") kuva nagu on; ära teisenda
   1. jaanuariks.
4. **Koosseisu värvid**: defineeri üks värvipalett (9 värvi) konstandina ja
   kasuta kõikjal (ajatelg, kaardid, karjääririba, diagrammid).
5. **1940–41 periood**: kuva alati koos kontekstimärkega nõukogude
   okupatsiooni kohta; sidumata isikunimed (Beganitskaja, Lange jt) on
   teadlik andmelünk, mitte viga.

## Kvaliteedinõuded

- Responsiivne (mobiil + töölaud), tabelitel horisontaalne kerimine kitsalt.
- Ligipääsetavus: semantiline HTML, klaviatuuriga navigeeritavad filtrid,
  diagrammidel tekstialternatiivid.
- Kõik 337 koosoleku- ja 404 isikulehte genereeritakse staatiliselt
  (generateStaticParams).
- Testi vähemalt: liikmelisuse tuletamise loogika (reegel 1) ühiktestidega;
  1–2 tuntud juhtu käsitsi kontrollitud (nt koosseisu suurus vs
  koosseis_arv veerg koosolekutes).
