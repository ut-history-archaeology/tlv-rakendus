# Tartu Linnavolikogu 1917–1941

Next.js (App Router) rakendus Tartu Linnavolikogu ajalooandmestiku sirvimiseks:
404 isikut, 9 koosseisu, 338 koosolekut, 633 liikmesmuutust, 1092 valimiskirjet.

Lähteülesanne: `CLAUDE_CODE_ULESANNE.md`. Andmesõnastik: `data/README.md`.

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
| suurim `index.html` (K222, 1934-02-26) | 1,23 MB (sisaldab inline RSC-payloadi ≈ 0,8 MB; märgistus ≈ 0,45 MB) |
| K266 (1937-03-22, 151 kB teksti, 2 348 olemit) | 1,09 MB |
| suurim `index.txt` (RSC-payload kliendipoolseks navigeerimiseks) | 0,65 MB |
| `out/` kokku | 736 MB (pildid 344 MB, protokollid 241 MB, `_next` 2 MB) |

Otsus O-06: piir 2 MB lehe kohta peab → leht jääb täielikult staatiliseks, kliendipoolset
sisu laadimist ei ole. Kui HTML-i mahtu on vaja veel vähendada, on järgmine samm
renderdada tekst serveris HTML-stringiks (`dangerouslySetInnerHTML`), mis poolitaks
RSC-payloadi; selle hind on React-saarte (popover, HelpTip) asendamine delegeeritud JS-iga.

Kuva eripärad: `tabelid` vahemikud ja `LIST OR TABULAR` lehed (`Leht.loend`, 1 596 lehte)
säilitavad reavahetused (pre-wrap, monospace; E-09); kõne teise kõne sees (vahelehüüe)
pesastatakse; K002 korduvate punktinumbrite id on `p<nr>-<jrk>` (L-03).

## Teadlikud piirangud (vt lähteülesanne)

- Kaardileht ja nimekirjade kanoniseerimine on välja jäetud (andmed pole valmis).
  Protokollide nimekiri `/protokollid` ja täistekstiotsing on 2. etapi samm 4 (pooleli);
  protokolli vaade `/protokollid/[id]` on olemas.
- Protokolli vaates on märgendus (olemid, isikuseosed, kõned) automaatne ja vigadega;
  `?q=` esiletõst leiab vasted ainult ühe tekstisõlme sees (olemi piiri ületavat fraasi
  ei märgita); tooltip on CSS-põhine (`data-tip`), ekraanilugejale on seletus legendis.
- 1940–41 nõukogude perioodi linnavalitsuse liikmed puuduvad isikute
  tabelist; sidumata nimed kuvatakse halli toortekstina.
- Tuletatud kohalolijate arv võib protokolli omast erineda seal, kus
  puudujakirjeid ei õnnestunud isikutega siduda — sellised loendid on alati
  märgistatud sõnaga "tuletatud".

## Lahtised andmeküsimused

Vastuolud, mis on arenduse käigus ilmnenud ja mida koodis heuristikaga **ei
lahendata** (2. etapi lähteülesanne, ptk 13). Esitatakse andmestiku omanikule;
kui otsus on tehtud, liigub kirje `data/README.md` jaotisse "Andmeparandused".

| Nr | Leitud | Küsimus | Seis |
|---|---|---|---|
| L-02 | 27.10.2026 | Lähteülesanne (ptk 3.6) ütleb, et protokollidega sidumata pilte on 219; `public/pildid/1200` sisaldab 7 308 PNG-d, `protokolli_lehed.csv` kasutab 7 117 → sidumata on **191** (loetelu: `npm run eeltootle -- --kontrolli`). Kumb arv on õige ja kas 191 orbpilti eemaldada enne commiti (ET-09 p 6, L-14)? | lahtine |
| L-03 | 27.10.2026 | `1918-01-22.json` (K002) päevakorrapunktide numeratsioon algab failis kolm korda otsast (1–4, 1–2, 1–2; tekstis "Harutusele tuleb:" uus loend). Numbrid `nr` jäetakse nagu allikas, punktidele on lisatud positsioon `jrk` (1…8); püsiaadress `#p<nr>` ei ole selles protokollis üheselt määratud. Kas kasutada K002 puhul `#p<jrk>` või nummerdada punktid ümber? | lahtine |
| L-01 | 27.10.2026 | K338 (protokoll nr 28, 13.11.1940) on lisatud ainult `koosolekud.csv`-sse; `osavott.csv`-s selle koosoleku kohalolijaid ("Koos on: K. Jalak, A. Taev, V. Irs, H. Johani, F. Lange") ei ole, sest teiste 1940–41 ridade osavõtt on parsitud algsest `TLV_koosolekud.xlsx`-ist, mitte korpusest. Kas lisada käsitsi (kõik sidumata, nagu teistel 1940–41 ridadel)? | lahtine |
