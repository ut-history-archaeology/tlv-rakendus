# Tartu Linnavolikogu 1917–1941

Next.js (App Router) rakendus Tartu Linnavolikogu ajalooandmestiku sirvimiseks:
404 isikut, 9 koosseisu, 337 koosolekut, 633 liikmesmuutust, 1092 valimiskirjet.

Lähteülesanne: `CLAUDE_CODE_ULESANNE.md`. Andmesõnastik: `data/README.md`.

## Käivitamine

```bash
npm install
npm run dev        # arendusserver → http://localhost:3000
npm run build      # staatiline eksport kausta out/
npm start          # serveerib out/ kausta (npx serve)
npm test           # ühiktestid (liikmelisuse tuletamise reegel jm)
```

Rakendus on täielikult staatiliselt genereeritav (`output: "export"`):
kõik 404 isiku-, 337 koosoleku- ja 9 koosseisulehte ehitatakse build-ajal
CSV-failidest (`data/`), serverit ega andmebaasi pole vaja.

## Ülesehitus

- `lib/data.ts` — CSV-de laadimine build-ajal (papaparse)
- `lib/derive.ts` — tuletusloogika: koosseisu liikmelisus kuupäeval D,
  tuletatud kohalolu, isiku karjäärisegmendid jm (ühiktestid `lib/derive.test.ts`)
- `lib/colors.ts` — koosseisude läbiv 9-värviline palett
- `lib/export.ts` — eksport CSV (UTF-8 BOM, semikoolon) / Excel / JSON
- `app/` — lehed; `components/` — UI-komponendid (kasutajaliides eesti keeles)

## Teadlikud piirangud (vt lähteülesanne)

- Protokollide leht, kaardileht ja nimekirjade kanoniseerimine on selles
  etapis välja jäetud (andmed pole valmis).
- 1940–41 nõukogude perioodi linnavalitsuse liikmed puuduvad isikute
  tabelist; sidumata nimed kuvatakse halli toortekstina.
- Tuletatud kohalolijate arv võib protokolli omast erineda seal, kus
  puudujakirjeid ei õnnestunud isikutega siduda — sellised loendid on alati
  märgistatud sõnaga "tuletatud".
