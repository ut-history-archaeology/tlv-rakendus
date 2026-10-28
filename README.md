# Tartu Linnavolikogu 1917–1941

Next.js (App Router) rakendus Tartu Linnavolikogu ajalooandmestiku sirvimiseks:
404 isikut, 9 koosseisu, 338 koosolekut, 633 liikmesmuutust, 1092 valimiskirjet.

Lähteülesanne: `CLAUDE_CODE_ULESANNE.md` (1. etapp) ja `CLAUDE_CODE_ULESANNE_2.md`
(2. etapp: protokollide leht `/protokollid`, täistekstiotsing, paralleelvaade arhiivi
originaaliga). Andmesõnastik: `data/README.md`.

## Käivitamine

```bash
npm install
npm run dev        # arendusserver → http://localhost:3000
npm run build      # staatiline eksport kausta out/
npm start          # serveerib out/ kausta (npx serve)
npm test           # ühiktestid (liikmelisuse tuletamise reegel, protokollide sidumine jm)
npm run eeltootle  # protokollikorpuse eeltöötlus (vt all); lipud: --kontrolli, --ilma-piltideta
```

### Protokollikorpuse eeltöötlus (2. etapp)

`korpus/json/*.json` (337 EstNLTK-faili, ~375 MB, gitis) töödeldakse skriptiga
`scripts/eeltootle-protokollid.ts` (`npm run eeltootle`, tsx) kujule:

- `public/protokollid/<K-id>.json` — ühe protokolli tekst + märgendused (gitis EI ole,
  genereeritakse `prebuild`-is / `predev`-is automaatselt, kui korpus on olemas ja väljund
  puudub või on vananenud: `npm run eeltootle:kui-vaja`);
- `public/protokollid/otsing/<aasta>.json` — täistekstiotsingu killud; `_meta.json`;
- `data/protokollid.csv`, `data/paevakorrapunktid.csv`, `data/protokolli_mainimised.csv` —
  commititakse, et tabelid töötaksid ka korpuseta kloonis (vt `data/README.md`).

Protokoll ↔ koosolek vasted: automaatreegel + käsitsi tabel `scripts/protokollid-vasted.json`.
Skript katkestab vigade korral (tundmatu isiku-ID, sidumata fail, kattuvad punktid,
lehed/pildid ei klapi) ja logib hoiatused. Ilma korpuse JA väljundita build katkeb
teatega „protokollide eeltöötlus puudub“. Väljundi maht ≈ 49 MB (protokollid 34 MB,
killud 15 MB); kestus ≈ 6 s.

Rakendus on täielikult staatiliselt genereeritav (`output: "export"`):
kõik 404 isiku-, 338 koosoleku- ja 9 koosseisulehte ehitatakse build-ajal
CSV-failidest (`data/`), serverit ega andmebaasi pole vaja.

## Ülesehitus

- `lib/data.ts` — CSV-de laadimine build-ajal (papaparse)
- `lib/derive.ts` — tuletusloogika: koosseisu liikmelisus kuupäeval D,
  tuletatud kohalolu, isiku karjäärisegmendid jm (ühiktestid `lib/derive.test.ts`)
- `lib/colors.ts` — koosseisude läbiv 9-värviline palett
- `lib/export.ts` — eksport CSV (UTF-8 BOM, semikoolon) / Excel / JSON
- `lib/protokollid/` — protokollikorpuse puhtad funktsioonid: `types.ts`, `korpus.ts`
  (base_span, pealkirjad), `vasted.ts` (SD-01), `sidumine.ts` (SD-02/SD-03),
  `eeltootlus.ts` (fail → ProtokollAndmed), `lehed.ts` (ET-09/ET-05), `plokid.ts`,
  `segmendid.ts` (renderdaja sisend), `kirjakuju.ts` (PT-08), `otsing.ts` (ET-04/PT-02),
  `viide.ts`, `eksport.ts` (txt/md), `mainimised.ts` (ET-08), `kuva.ts` (tekstivaate
  mudel: plokid → segmendid, lehemarkerid, pesastatud kõned), `laadi.ts` (basePath-URL-id,
  kliendipoolne JSON-laadimine), `loe.ts` (build-aegne JSON-lugemine); testid `*.test.ts`
- `app/` — lehed; `components/` — UI-komponendid (kasutajaliides eesti keeles)

### Protokolli vaade `/protokollid/[id]` (2. etapp, samm 3)

Tekst renderdatakse build-ajal HTML-i serverikomponendis `ProtokollTekst` (töötab ilma
JS-ita; plokid on natiivsed `<details>`). Interaktiivsus tuleb väikestest saartest:
`OlemiLegend` (märgenduse peitmine), `OlemPopover` (mitmese isiku kandidaadid),
`ProtokollJuht` (`#p<nr>`, `?q=` esiletõst, `?isik=` esiletõst, "Ava/Sule kõik", print,
punkti viide) ja `ProtokollTegevused` (JSON/TXT/Markdown/print/viide; protokolliandmed
laetakse alles nupuvajutusel `public/protokollid/<id>.json`-ist).

Mõõtmine 27.10.2026 (`next build`, 337 protokollilehte, build ≈ 30 s kokku):

| Näitaja | Väärtus |
|---|---|
| suurim `index.html` (K222, 1934-02-26) | 1,25 MB (sisaldab inline RSC-payloadi ≈ 0,8 MB; märgistus ≈ 0,45 MB) |
| K266 (1937-03-22, 151 kB teksti, 2 348 olemit) | 1,09 MB |
| suurim `index.txt` (RSC-payload kliendipoolseks navigeerimiseks) | 0,65 MB |
| `out/` kokku | 763 MB (isikud 92 MB, koosolekud 73 MB — iga lehe RSC-payload sisaldab globaalse otsingu indeksit) (pildid 344 MB, protokollid 241 MB, `_next` 2 MB) |

Otsus O-06: piir 2 MB lehe kohta peab → leht jääb täielikult staatiliseks, kliendipoolset
sisu laadimist ei ole. Kui HTML-i mahtu on vaja veel vähendada, on järgmine samm
renderdada tekst serveris HTML-stringiks (`dangerouslySetInnerHTML`), mis poolitaks
RSC-payloadi; selle hind on React-saarte (popover, HelpTip) asendamine delegeeritud JS-iga.

**Paralleelvaade (PT-05, samm 3a).** `ParalleelVaade` (klient) võtab serveris renderdatud
teksti `children`-ina: töölaual (≥ 1024 px) tekst ja pildipaneel kõrvuti, lohistatav/klaviatuuriga
liigutatav jaotur (30–70 %, `tlv-pildipaneel-laius`), paneel vaikimisi avatud (`tlv-pildipaneel`);
kitsamal sakid "Tekst" / "Originaal". `LehePilt` — 1200-PNG, suurendus 1×…4× (nupud, Ctrl+ratas,
kahe näpuga, topeltklõps), lohistamine, klaviatuur (+ − 0 ↑ ↓); `LehtedeRiba` — 300-PNG eelvaated
`loading="lazy"`. Sünk: tekst → pilt `aktiivneLeht()` (nähtavad markerid, ülemine kolmandik,
rAF); pilt → tekst avab ploki (`leheplokid()`) ja kerib markerile, lukk 600 ms. `?lk=` loetakse
mount'is, lehevahetus kirjutab `replaceState`. Pildid laetakse alles paneeli avamisel
(SSR-HTML-is `<img>`-e pole); naaberlehed (±1) eellaetakse. `out/` 739 MB (< 1 GB).

### Protokollide nimekiri ja täistekstiotsing `/protokollid` (samm 4)

> **3. etapist (UX-09) alates elab PT-01 nimekiri ja PT-02 otsing lehel `/koosolekud`**;
> `/protokollid/` on ümbersuunaja. Allolev kirjeldus on 2. etapi seis (ajalugu).

`KoosolekudVaade` on üldistatud (`variant="protokollid"`, `protokollid`, `killud` propid):
diagrammita, veerud Päevakorrapunkte ja Sõnu, rida → `/protokollid/<id>/`, eksport kõigi
`protokollid.csv` veergudega, "Minu vaade" `tlv-vaade-protokollid`; koosolekute lehel lisandub
veerg "Protokoll" ja ekspordi veerg `protokoll_olemas` (IN-03). Ajavahemiku filter (`algus`/`lopp`)
kehtib korraga tabelile ja otsingule (PT-06).

`TaistekstOtsing` (PT-02): `?q=` URL-is, debounce 300 ms, min 3 märki; `lib/protokollid/otsing.worker.ts`
(Web Worker, webpack `new Worker(new URL(...))`, publicPath `/tlv-rakendus/_next/`) laeb ainult
vahemiku aastate killud, puhverdab mälus, näitab "Laen 1930… (3/5)"; tulemused protokollide kaupa
kronoloogiliselt, tabamus `<mark>`-iga, link `/protokollid/<id>/?q=…#p<nr>`, 50 tabamust lehel,
eksport CSV/XLSX/JSON. Kontekst 1 / ±2 lauset / kogu päevakorrapunkt (`tlv-otsing-kontekst`, PT-10).
**Piirang:** killud sisaldavad ainult normaliseeritud teksti (väiketähed, diakriitikata, w→v),
seega tulemuste laused kuvatakse normaliseeritud kirjakujus; algkuju näeb protokolli lehel.
Kontroll kildude peal 27.10.2026: "walimine" = "valimine" = 1 274 tabamust 205 protokollis;
"raekojas" 1937. a 13 tabamust; `?algus=1930-01-01&lopp=1930-12-31` → 16 rida;
`?algus=1940-08-01` → 29 rida; suurim "Sõnu" 1934-08-27.

### VÕIKS-nõuded (samm 5)

- **KO-11** koosoleku lehel sektsioon "Päevakord" (`data/paevakorrapunktid.csv`), pealkirjad
  lingitud `/protokollid/<id>/#p<nr>` (K002 korduvad numbrid → `#p<nr>-<jrk>`); JSON-eksporti
  lisandub `paevakord`. 1. etapi lause "PÄEVAKORDA EI OLE" ei kehti enam.
- **PR-12** isikuprofiilil "Mainimised protokollides" (`lib/derive.ts` `mainimisedProfiilile`):
  kindlad (kõrge/keskmine) ja tõenäolised (`N;None`) eraldi, loetelu kronoloogiliselt lingiga
  `/protokollid/<id>/?isik=<id>`, > 20 → "Näita kõiki"; JSON-eksporti `mainimised_protokollides`.
- **PT-08** kirjakuju-lüliti `KirjakujuVaade`: ajalooline kuju on serveris renderdatud; moderniseeritud
  kuju laetakse JSON-ist ja renderdatakse kliendis `moderniseeri()`-ga (kõik vahemikud nihutatud);
  seis `tlv-kirjakuju` + `?kuju=mod`; näidatakse "<n> sõna <m>-st moderniseeritud". `?q=` esiletõst
  rakendub ainult serveris renderdatud (ajaloolisele) tekstile.
- **PT-07** otsingus nimeüksuse tüübifilter (`?tyybid=PER,ORG`, kiip tabeli kohal; päringuta =
  kõik laused, kus tüüp esineb). **IN-04** globaalses otsingus kolmas kategooria "Protokollid"
  lingiga `/protokollid/?q=…` (3. etapist `/koosolekud/?q=…#otsing`).

Kuva eripärad: `tabelid` vahemikud ja `LIST OR TABULAR` lehed (`Leht.loend`, 1 596 lehte)
säilitavad reavahetused (pre-wrap, monospace; E-09); kõne teise kõne sees (vahelehüüe)
pesastatakse; K002 korduvate punktinumbrite id on `p<nr>-<jrk>` (L-03).

## 3. etapp: kasutajaliidese parandused (`CLAUDE_CODE_ULESANNE_3.md`)

- **Isiku leht** (UX-01…UX-05): päis siltidega `dl`-loendina (sündinud/surnud, alternatiivkujud,
  Wikidata, arhiiviviited). **Isanime ja AKL ID-d ei kuvata ega ekspordita kusagil** (andmestiku
  omaniku otsus 28.10.2026; väljad on alles `data/*.csv`-s ja ZIP-is) — see tühistab UX-01
  vastavad osad, E3-02 ja K3-01. `wikidataQid()` (`lib/format.ts`) parandab Wikidata lingi.
  Valimised: `isikuValimisedKoos()` + `ValimisedKoos` — üks kaart aasta kohta; kandidaadi- ja
  valitu rea erinevad väärtused kuvatakse mõlemad, ülaindeks ¹/² viitab jaluse allikareale
  (vt L-04). Aadressid: `isikuAadressidKoos()` (võti = tõst ja tühikud ühtlustatud; `elukoht_muu`
  eraldi aadress). Sektsioonide järjekord E3-03 järgi.
- **Liikmesmuutused sündmustena** (UX-06): `koosseisuSyndmused()` — kinnitamine (esimese koosoleku
  liitumised ilma asendatavata, isik valitud), vahetus (ainult täpne paar `lahkumine` A→B +
  `liitumine` B←A; 123 paari), ülejäänud 1:1; kõik `muutus_id`-d säilivad. Ahelaid läbi
  `liitumine&lahkumine` (15 juhtu) ei paarita. Esimese koosoleku liitumised, mille isik puudub
  valimistulemustest (8), saavad märke "ei olnud valimistulemustes" — kõik on asendajad.
  `SyndmusteTabel` koosseisu ja isiku lehel; eksport "Lae alla" (sündmused) + "Toorread".
- **Ajatelg** (UX-07): `LiikmeteAjatelg` — liikmete arv (`liikmeteArvuSeeria()`, erireegel 1;
  ühepäevase liikme järel lisapunkt järgmisel päeval) ja üks marker kuupäeva kohta
  (`paigutaMarkerid()`, lähemal kui 14 px → teine rida); klõps filtreerib sündmuste tabeli
  (`KoosseisuMuutused`). **UX-08**: aktiivse jaotussegmendi raam, liikmete tabelis
  "Staatus koosseisus".
- **Koosolekud ja protokollid** (UX-09…UX-11): üks nimekiri `/koosolekud` (KO-01 diagramm,
  kokkuklapitav otsinguplokk `#otsing`, avatud kui `?q=`/`?tyybid=`; veerg "Avamine";
  rea klõps → koosoleku leht; "Minu vaade" `tlv-vaade-koosolekud`, vana `tlv-vaade-protokollid`
  migreeritakse `useTabeliSeis` 3. argumendiga). `/protokollid/` → `protokollideNimekirjaUusUrl()`
  (säilitab `location.search`, lisab `#otsing`). Detaillehtedel ühine `KoosolekuPais` +
  `ProtokolliSakid` (`?isik=` kantakse üle, protokolli sakil prefetch väljas) ja eelmine/järgmine
  (`naaberKoosolekud()`; protokollilehel jäetakse protokollita koosolekud vahele). Koosoleku lehe
  päevakorras punkti esimene lause (`punktiEelvaade()`, ≤ 160 märki).
- Kontroll 28.10.2026 (headless Chrome `out/`-i peal): isikud 1, 2, 6, 12, 40, 217; koosseis
  1927–1929 (34 sündmust, 07.02.1927 üks marker "6", klõps → 6 rida + kiip); `/koosolekud/?q=walimine`
  1 274 tabamust 205 protokollis; `/protokollid/?q=walimine&algus=1930-01-01` → `/koosolekud/…#otsing`;
  338 rida, K336 "protokoll puudub"; K178 päis/sakid mõlemal lehel, `/protokollid/K178/?lk=360`;
  Lighthouse ligipääsetavus: koosseis 1927–1929 ja isik 1 96, `/koosolekud` 100, K178 koosolek 100,
  protokoll 97. Build: 338 + 337 + 404 + 9 lehte + `/protokollid/`; `out/` 767 MB.
- Viidete ühtne vormistus (UX-12) ootab omaniku juhist (`VIITED.md`); seni toorkujud.

## Teadlikud piirangud (vt lähteülesanded, 2. etapi ptk 13)

- Kaardileht ja nimekirjade kanoniseerimine on välja jäetud (andmed pole valmis).
- 1940–41 nõukogude perioodi linnavalitsuse liikmed puuduvad isikute tabelist; sidumata
  nimed (Jalak, Taev, Johani, Lange, Mägi jt) kuvatakse halli toortekstina — teadlik andmelünk.
  Samal perioodil kõnesid ei tuvastatud.
- Tuletatud kohalolijate arv võib protokolli omast erineda seal, kus puudujakirjeid ei
  õnnestunud isikutega siduda — sellised loendid on alati märgistatud sõnaga "tuletatud".
- **Automaatmärgendus on vigadega**: nimeüksused (NER-mudel), kõnetuvastus ja isikute
  linkimine on automaatsed; iga selline element kannab märget "automaatne" (legend, silt
  või tooltip). Kindluse sõnavara: kõrge / keskmine / mitmene / puudub; registriväline
  mitmesus (`N;None`) lingitakse `?`-märgiga, ≥ 4 kandidaati = sidumata. Sidumata
  kõnelejad (~4 %, nt linnanõunikud Roo, Sinka) kuvatakse nimena ilma lingita.
- `normalized_form` katab vaid osa vana kirjaviisi sõnu — moderniseeritud kuju on segakuju.
- Täistekstiotsingu tulemused kuvatakse normaliseeritud kirjakujus (väiketähed,
  diakriitikata, w→v), sest killud ei sisalda algteksti; algkuju on protokolli lehel.
  `?q=` esiletõst protokolli lehel leiab vasted ainult ühe tekstisõlme sees ja ainult
  ajaloolisel (serveris renderdatud) kujul.
- Kuupäevi ei tõsteta esile ja kuupäeva-kategooriat otsingus ei ole (automaatkihis
  DATE-tüüpi pole; heuristikat ei ehitata).
- Kahe sama päeva protokolli vaste (1930-09-08, 1940-09-26, -10-11, -11-05, -11-13) tugineb
  protokollinumbrile ja on fikseeritud käsitsi `scripts/protokollid-vasted.json`-is.
- K026 kuupäev on parandatud korpuse teksti põhjal (29.–30.03.1920); K077 protokolli tekstis
  on vale aastaarv (1925 pro 1923); K338 (protokoll nr 28, 13.11.1940) on lisatud korpuse,
  mitte algse `TLV_koosolekud.xlsx` põhjal — kõigil kolmel lehel on märkus.
- Lehepildid on 1200 px mustvalged koopiad (mitte arhiivikvaliteet); 28 tekstita lehte
  kuvatakse pildina ilma tekstita; jagatud lehtedel (134/134a/134b, 254/254a/254b) on üks
  pilt mitme tekstilõigu kohta; tekst–pilt sünk on lehe täpsusega (rea koordinaate pole);
  Transkribuse lehenumber erineb arhiivi lk-st ja seda ei kuvata numbrina, ainult lingina.
- Toor-EstNLTK-faile rakendus ei paku, ainult link GitHubi (`korpus/json/<fail>`).
- Protokollidega sidumata pilte (kaaned, tiitellehed; 191 tk `public/pildid/`-s) ei kuvata
  (vt L-02).

## Käsitsi kontrollid (2. etapp, 27.10.2026)

Genereeritud HTML-i põhjal kontrollitud: K174 (1 punkt) ja K175 (11 punkti, 40 kõnet) ning
1940. a paarid õiges järjekorras protokollinumbri järgi; K329 "nr 29" 2 punkti + 1 lisa,
K338 "nr 28" 1 punkt; K077 ja K026 lehel märkus; K026 kuvatakse 29.–30. märts 1920; K272
"A. Piip" 2× isik 128, "J. Lill" 82 `?`-ga, "J. Roo" sidumata; K004 "Koppel" popover (58, 266)
ja lehed 112–117 ↔ Transkribus 26–31 (lk 112 link `…/pages/26`); K143 lk 38 tekstita marker;
K225 134/134a/134b eraldi markerid, sama pilt; K266 93 markerit, 2 348 olemit; K336-l
"protokolli täistekst puudub"; suurima lehe `out/` maht 1,25 MB (< 2 MB); `du -sh out/`
763 MB (< 1 GB), `out/pildid` 344 MB; SSR-HTML-is pilte ei laeta (`<img>` puudub).

Headless Chrome'is (Puppeteer-skript `out/`-i peal, 27.10.2026) kontrollitud: `#p3` avab punkti;
`?isik=116` tõstab olemid esile ja avab plokid; `?q=Piip` K272-l 2 vastet; lehe avamisel laetakse
1 suur pilt + 6 eelvaadet; markeri klõps aktiveerib lehe (ka pärast sünkroonimislukku) ja kirjutab
`?lk=`; "Koppel" popover kandidaatidega 58 ja 266; "Kopeeri viide" sisaldab arhiiviviidet, lk-d ja
Transkribuse URL-i; `?lk=360` K178-l avab punkti ja marker on ekraanil; kirjakuju-lüliti annab
"Tartu linnavolikogu erakorraline koosolek", olemid alles, `#p3`/`?q=` toimivad ka kliendirenderduse
järel; otsing "walimine" = "valimine" = 1 274 tabamust 205 protokollis (kogu korpus külmalt
≈ 1,0 s, killud puhvris 17–26 ms Workeris); "raekojas" 1937 laeb ainult `1937.json`; tulemuselt
klõps avab K004 sissejuhatuse esiletõstuga; KO-11 link avab K175 punkti; mobiilis (375 px) sakid,
"Originaal" laeb 1 pildi, enne seda 0; Markdown-eksport 11 pealkirja. Lighthouse (K004 `?lk=113`):
ligipääsetavus 97, parimad tavad 96; konsoolis ainult `favicon.ico` 404. JS-vigu ei esinenud.

Käsitsi (päris seadmes) veel kontrollimata: suurendus ja lohistamine puutel, kerimissünk K266-l
pika lugemise jooksul, eksport-failide avanemine Excelis, trükieelvaade.

## Lahtised andmeküsimused

Vastuolud, mis on arenduse käigus ilmnenud ja mida koodis heuristikaga **ei
lahendata** (2. etapi lähteülesanne, ptk 13). Esitatakse andmestiku omanikule;
kui otsus on tehtud, liigub kirje `data/README.md` jaotisse "Andmeparandused".

| Nr | Leitud | Küsimus | Seis |
|---|---|---|---|
| L-02 | 27.10.2026 | Lähteülesanne (ptk 3.6) ütleb, et protokollidega sidumata pilte on 219; `public/pildid/1200` sisaldab 7 308 PNG-d, `protokolli_lehed.csv` kasutab 7 117 → sidumata on **191** (loetelu: `npm run eeltootle -- --kontrolli`). Kumb arv on õige ja kas 191 orbpilti eemaldada enne commiti (ET-09 p 6, L-14)? | lahtine |
| L-03 | 27.10.2026 | `1918-01-22.json` (K002) päevakorrapunktide numeratsioon algab failis kolm korda otsast (1–4, 1–2, 1–2; tekstis "Harutusele tuleb:" uus loend). Numbrid `nr` jäetakse nagu allikas, punktidele on lisatud positsioon `jrk` (1…8); püsiaadress `#p<nr>` ei ole selles protokollis üheselt määratud. Kas kasutada K002 puhul `#p<jrk>` või nummerdada punktid ümber? | lahtine |
| L-01 | 27.10.2026 | K338 (protokoll nr 28, 13.11.1940) on lisatud ainult `koosolekud.csv`-sse; `osavott.csv`-s selle koosoleku kohalolijaid ("Koos on: K. Jalak, A. Taev, V. Irs, H. Johani, F. Lange") ei ole, sest teiste 1940–41 ridade osavõtt on parsitud algsest `TLV_koosolekud.xlsx`-ist, mitte korpusest. Kas lisada käsitsi (kõik sidumata, nagu teistel 1940–41 ridadel)? | lahtine |
| L-04 | 28.10.2026 | `koosseisud.csv` `kandidaatide_allikas` on tühi koosseisudes 1921–1923, 1927–1929 ja 1930–1934, kuigi neil on vastavalt 91, 74 ja 76 `roll=valitav` rida `valimised.csv`-s. 3. etapi lähteülesande näide (UX-03: "kandidaatide nimekiri — Riigi Teataja, nr. 6 …; valimistulemused — ERA.2966.2.200") ei vasta andmetele: 1927–1929 "Riigi Teataja, nr. 6, 24 jaanuar 1927" on `valimistulemuste_allikas` ja ERA.2966.2.200,…201 on `valimised_allikas`. Rakendus kuvab valimiste kaardil valitava rea allikana "allikas märkimata". Kas kandidaatide allikaks on neis koosseisudes `valimised_allikas` (arhiivitoimik) ja kas see tuleks `kandidaatide_allikas` veergu lisada? | lahtine |
| L-05 | 28.10.2026 | 11 `lahkumine`-rida `muutused.csv`-s käib isiku kohta, kes erireegli 1 järgi (valitud + varasemad liitumised) ei olnud lahkumise eelõhtul koosseisu liige: #3 (1917–1919, isik 389), #95 (1921–1923, isik 301), #233, #242–#248, #272 (1924–1926; isikud 228, 325, 331, 337, 333, 347, 328, 366, 362). Nende asendajate liitumine suurendab liikmete arvu, lahkumine seda ei vähenda — UX-07 ajateljel tõuseb 1924–1926 koosseisu liikmete arv 26.03.1925 60-lt 68-le. Kas neil isikutel puudub `liitumine`-rida (või `valimised.csv` `roll=valitud` rida) või on lahkumise isik vale? Rakendus arvutab liikmelisust edasi erireegli 1 järgi. | lahtine |
