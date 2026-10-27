# Lähteülesanne, 2. etapp: protokollide leht

Rakendus: Tartu Linnavolikogu 1917–1941 (Next.js, App Router, `output: "export"`).
Repo: https://github.com/ut-history-archaeology/tlv-rakendus. Kuupäev: 20.10.2026.

Loe enne alustamist: `CLAUDE.md`, `README.md`, `CLAUDE_CODE_ULESANNE.md` (1. etapp),
`data/README.md` (andmesõnastik), `lib/data.ts`, `lib/derive.ts`, `lib/format.ts`,
`lib/export.ts`, `components/KoosolekudVaade.tsx`, `app/koosolekud/[id]/page.tsx`.

Märgistus selles dokumendis: **FAKT** = kontrollitud korpuse näidisfailide,
`corpus_summary.md` või repo koodi vastu; **EELDUS** = oletus, mille andmestiku omanik
on 20.10.2026 kinnitanud (ptk 13); 27.10.2026 lisandunud eeldused E-12…E-15 — E-12 on
kinnitatud otsusena O-14 (pildid samas repos `public/pildid/`), L-14…L-15 ootavad kinnitust. Prioriteedid nagu 1. etapis: **PEAB** / **VÕIKS** / **VÕIB**.

**Muudatus 27.10.2026:** lehepildid on olemas (`protokolli_lehed.csv`, PNG-d), seepärast
on PT-05 nüüd **PEAB**-nõue (tekst ja originaal kõrvuti), otsus O-08 on asendatud, lisatud
ptk 3.6, ET-05 on parandatud (Transkribuse lehenumber ≠ arhiivi lk) ning lisatud ET-09,
TE-16…TE-18; piltide hoidmine on otsustatud (O-14: samas repos `public/pildid/`). Kõik 27.10 muudatused on
tekstis märgitud *(27.10.2026)*.

---

## 1. Eesmärk

Lisada rakendusele protokollide leht (`/protokollid`, `/protokollid/[id]`), mis
võimaldab sirvida 337 koosolekuprotokolli täisteksti koos automaatmärgendustega
(päevakorrapunktid, nimeüksused, kõned, moderniseeritud kirjakuju) ja teha
täistekstiotsingut üle kogu korpuse. 1. etapis jäeti see leht teadlikult välja
("Välja jäetud" p 1), sest JSON-korpus polnud valmis. Nüüd on.

Funktsionaalsed nõuded tulevad dokumendist UUS (PT-01…PT-10). Käesolev lähteülesanne
seob need olemasoleva koodi ja korpuse tegeliku kujuga ning lisab eeltöötluse,
sidumisreeglid, testid ja piirangud. Lisaks on andmestiku omaniku otsusel (ptk 13)
kaks väikest VÕIKS-nõuet väljaspool UUS-i (PR-12 profiili mainimised, KO-11 koosoleku
päevakord) ja kolm andmeparandust CSV-des (AP-01…AP-03).

---

## 2. Mis on juba olemas (seos 1. etapiga)

| Olemas | Kus | Kuidas 2. etapis kasutatakse |
|---|---|---|
| 337 koosolekut, `koosolek_id` K001…K337, `kuupaev`/`kuupaev_lopp`, `vorm`, `koosseis_id`, `protokolli_algus_txt` | `data/koosolekud.csv`, `lib/data.ts` | Protokoll seotakse koosolekuga; protokolli ID = `koosolek_id` |
| 404 isikut, `isik_id` 1–410 (puuduvad 191, 198, 303, 306, 309, 314) | `data/isikud.csv` | `council_member_id` viitab samasse ID-ruumi (**FAKT**, vt ptk 4.2) |
| Koosolekute tabel filtrite, sortimise, paginatsiooni, URL-seisu, "Minu vaate" ja ekspordiga | `components/KoosolekudVaade.tsx`, `lib/useTabeliSeis.ts`, `components/TabeliOsad.tsx`, `components/ExportButton.tsx` | PT-01 taaskasutab sama komponenti (üldistada) |
| Ajavahemiku filter (kuupäevavalijad `algus`/`lopp`) | `KoosolekudVaade.tsx` | PT-06 |
| Otsingu normaliseering (tõst, diakriitika, w→v) | `lib/format.ts: normalizeOtsing` | PT-02 päringu ja teksti normaliseering |
| Eksport CSV/XLSX/JSON + metaandmed (EX-01…EX-08) | `lib/export.ts` | PT-01 tabeli eksport; PT-09 JSON-meta sama kujuga |
| Profiili JSON + prindi/PDF nupud | `components/ProfiilTegevused.tsx` | PT-09 eeskuju (laiendada txt/md/viide nuppudega) |
| Koosseisude värvipalett, vormide värvid | `lib/colors.ts` | Jääb; lisandub nimeüksuste palett |
| Abitekstid ja "?"-ikoon | `lib/abitekstid.ts`, `components/HelpTip.tsx` | Uued mõisted: automaatmärgendus, kõne, kirjakuju |
| "tuletatud"-märgistus ja sidumise kindluse sõnavara (kõrge/keskmine/mitmene/puudub) | `app/koosolekud/[id]/page.tsx`, `lib/types.ts: SidumiseKindlus` | Sama sõnavara nimeüksuste sidumisel (ptk 4.2) |
| Koosoleku detaillehe plokk "Protokolli algus (toores OCR-tekst)" | `app/koosolekud/[id]/page.tsx` | Jääb; lisandub link täistekstile |
| Jaluse ZIP kõigist `data/*.csv` | `package.json: zip-data` | Uus `data/protokollid.csv` läheb ZIP-i automaatselt |
| vitest, `lib/**/*.test.ts` | `vitest.config.ts`, `lib/derive.test.ts` | Uued testid samas mustris |

Mis puudub täielikult: protokollitekstide eeltöötlus, protokollide lehed, täistekstiotsing,
annotatsioonide kuvamine, kirjakuju-lüliti, txt/markdown-eksport, viite kopeerimine.
*(27.10.2026)* Lisaks puudub kõik lehepiltidega seotu: `protokolli_lehed.csv` laadimine,
pildipaneel, tekst–pilt sünkroonimine; `scripts/teisenda_pildid.py` ja PNG-d on olemas, kuid
veel mitte repos (lähevad `public/pildid/`, O-14).

---

## 3. Korpus: faktid ja kontroll näidisfailide vastu

Allikad: `readme.md`, `corpus_reading_example.ipynb`, `corpus_summary.md`, 7 näidisfaili.

### 3.1 Üldist (FAKT)

- 337 EstNLTK-JSON-faili, kokku 373,7 MB; puhast teksti 12,5 MB (mediaan 31 kB faili
  kohta, suurimad 4 faili 151–163 kB: `1931-03-30`, `1934-02-14`, `1934-08-27`, `1937-03-22`).
- Faili juurvõtmed: `text`, `meta`, `layers`, `relation_layers`.
- `meta.meeting_dates` (1 või 2 ISO-kuupäeva) ja `meta.transcribus_url`
  (`https://rahvusarhiiv.transkribus.eu/document/<dok>/pages/<n>`; `<n>` = protokolli
  esimese lehe **järjekorranumber Transkribuse dokumendis**, mis ei ole alati sama kui
  arhiivi leheküljenumber — vt 3.6; *parandatud 27.10.2026*).
- Failinimi = `KUUPÄEV.json`; 4 failil `KUUPÄEV_KUUPÄEV.json` (kahepäevane koosolek);
  5 failil `KUUPÄEV_2.json` (sama päeva teine protokoll): `1930-09-08_2`, `1940-09-26_2`,
  `1940-10-11_2`, `1940-11-05_2`, `1940-11-13_2`.
- 4 failil pole päevakorrapunkte (`1921-03-01`, `1922-08-28`, `1934-09-24`, `1937-09-06`;
  kõik 1–2 kB tekstiga, nt kvoorumi puudumisel ära jäänud koosolek).
- Tekstis on reavahetused `\n` OCR-ridade kaupa. Poolitused on tekstis **juba kokku
  liidetud** (`textline_info.hyphenated_added/removed` näitab, kust silp liigutati);
  `words`-kihi `compound_tokens_type: hyphenation` tähistab päris sidekriipsuga liitsõnu
  (nt "Kurs-Olesk"), mitte poolitusi.

### 3.2 Kihid, mida rakendus kasutab (FAKT)

Kõik span-kihid: `spans[].base_span` on kas `[algus, lõpp]` (märgikohad `text`-is) või,
kui kiht on `enveloping: "words"`, **loend** sõnavahemikke `[[a,b],[c,d],…]` — olemi
tekstivahemik on siis `[base_span[0][0], base_span[-1][1]]`. `annotations` on loend,
näidistes alati pikkusega 1.

| Kiht | Spane kokku | Mida võetakse | Märkused |
|---|---|---|---|
| `agenda_points` (`number`) | 3 511 | päevakorrapunkti vahemik + number | Punktid ei kattu, nende vahel pole tühikuid; tekst enne esimest punkti = sissejuhatus (juhataja, kohalolijad), pärast viimast = lõpuosa + lisad. Numeratsioon `number` on täisarv ka siis, kui tekstis on rooma number ("I."). |
| `agenda_point_titles` (`number`) | 3 511 | pealkirja vahemik | Alati vastava punkti sees, punkti alguses. Paaris `agenda_points`-iga numbri järgi. |
| `named_entities` (`tag`, `council_member_id`, `council_member_match_status`, `council_member_ambiguous`) | 184 865 | olemi vahemik, tüüp, sidumine | `tag` ∈ {ORG 50 322, MONEY 47 319, PER 44 918, LOC 24 886, POSITION 17 420}. **DATE-tüüpi ei ole.** Olemid ei ületa päevakorrapunkti piire (kontrollitud 3 suurimas näidisfailis). |
| `words` (`normalized_form`, `compound_tokens_type`) | 2 187 718 | ainult `normalized_form`, kui see **erineb** algkujust | `normalized_form` on sageli olemas ka identsena ("22." → "22.", "A.Piip" → "A.Piip") — need jäetakse eeltöötluses välja. Erinevaid kujusid on 1918–1930 tekstides ~10–15 % sõnadest (peamiselt w→v: "wolikogu" → "volikogu"), 1937. a tekstis 0,5 %. |
| `sentences` | 128 727 | lausepiirid | Otsingu kontekst (PT-02, PT-10). Keskmine lause 70–120 märki, pikim näidistes 2 010 (tabel). |
| `speeches` (**relation_layer**; `named_spans.speaker`, `named_spans.speech`, `speech_type`, `speaker_name`) | 4 349 | kõneleja vahemik, kõne vahemik(ud), nimi | `speech_type` on alati DIRECT. `speech` võib koosneda **mitmest tükist** (1930-10-27: 29/152 kõnet), tükkide vahel on vahelehüüded, nt " (Olesk: See on teine asi). ". Kõned ei ületa päevakorrapunkti piire. 1940. a augustist kõnesid ei ole (kõik 1940-08…1941 failid: 0). |
| `appendix_regions` (`description`) | 312 | lisa vahemik + kirjeldus | Asuvad pärast viimast päevakorrapunkti (näidistes). 1928-02-24: lisad on 78 % tekstist. |
| `table_regions` | 1 138 | tabeli vahemik | Kuvada reavahetusi säilitades. |
| `textline_info` (`xml_file`, `page_class`, …) | 290 403 | **ainult** lehekülje piirid: `xml_file` → tekstivahemik | `xml_file` nt `era2966_002_0000074_00339_t.xml`: viimane number = **arhiivi leheküljenumber** säilikus (võib olla ka `00134a`). Transkribuse lehenumber tuleb `protokolli_lehed.csv` veerust `transkribus_lk`, mitte failinimest (*parandatud 27.10.2026*, vt 3.6). Tekstiridade koordinaate pildil atribuutides **ei ole**. |

Ei kasutata: `speech_chunks` (tehniline, readme keelab), `manual_*_arhiivipraktika`
(ainult 125 / 6 failil, teine tüübiskeem), `textline_info` ülejäänud atribuudid.

### 3.3 Isikute linkimine `named_entities`-kihis (FAKT)

`council_member_id` väärtuste kujud (`corpus_summary.md` + näidised):

| Kuju | Arv korpuses | Näide | Tähendus (readme) |
|---|---|---|---|
| `"None"` | 157 343 | `Davet Reimann` | pole volikoguliige / sidumine ebaõnnestus / pole isikunimi (sh kõik ORG, LOC, MONEY, POSITION) |
| üks ID | 24 133 | `"128"` (A. Piip) | üheselt seotud |
| ID + `None` | 3 183 | `"82;None"` (J. Lill) | registriväline mitmesus: üks volinik klapib, aga sama nimega mainitakse ka mitte-volinikke |
| mitu ID-d (± `None`) | 206 | `"38;39;None"` (Jaska), `"258;290"` (Fischer) | mitu volinikku klapib |
| äärmus | — | `"22;46;…;None"` — 27 ID-d eesnimele "Karl" (1937-03-22) | eesnime-põhine mitmesus, praktiliselt sidumata |

`council_member_ambiguous = true` kõigil kujudel, kus on `;` (3 389 spani).
`council_member_match_status` väärtused: `not_per`, `exact`, `exact;context_exact`,
`no_match`, `ambiguous_exact`, `ambiguous_surname;levenshtein_fuzzy`,
`ambiguous;levenshtein_fuzzy`, `ambiguous_firstname;levenshtein_fuzzy`, `exact;ocrmistake`,
`exact;ocrmistake;context_exact`. Väärtuste täpne seletus on välisrepo README-s
(Rahvusarhiiv2/pp-tartu-linnavolikogu, pole avalikult kättesaadav) — rakendus kasutab
seda ainult kindlusastme tuletamiseks (ptk 4.2), mitte kuvamiseks.

ID-ruum: korpuses 398 erinevat ID-d; näidisfailide 185 ID-d on **kõik** olemas
`data/isikud.csv`-s ning klapivad nimega (128 = Ants Piip, 116 = Lui Olesk, 134 = Peeter
Põld, 209 = Aleksander Tõnisson). `data/isikud.csv` (404 rida) on identne projekti
`TLV_isikud.xlsx`-iga (404 rida, ID-d 1–410). Kõigi 398 ID kontroll on eeltöötluse
kohustuslik samm (ET-06).

### 3.4 Kõneleja ja isiku seos (FAKT, näidiste põhjal)

`speeches.named_spans.speaker` vahemik kattub praktiliselt alati `named_entities`
PER-spaniga, millel on `council_member_id`. Näidistes 221 kõnest: 172 üheselt seotud,
40 mitmesed, 8 PER-span ilma ID-ta (nt "J.Roo", "R.Sinka", "U. Hartmann" — pole
volinikud), 1 ilma PER-spanita ("Olesks"). Seega **eraldi nimesidumist ei tehta** —
kõneleja seotakse sama PER-olemi kaudu (SD-03).

### 3.5 Protokoll ↔ koosolek: kontroll `koosolekud.csv` vastu (FAKT)

Failinime kuupäev(ad) vs `kuupaev`/`kuupaev_lopp`, 337 faili vs 337 rida:

- 331 faili klapivad üheselt ühe reaga.
- Sama päeva kaks protokolli → CSV-s kaks rida: `1930-09-08` (K174 erakorraline,
  K175 korraline; failid vastavalt `1930-09-08.json` ja `_2`), `1940-09-26` (K315/K316),
  `1940-10-11` (K322/K323), `1940-11-05` (K326/K327). Fail ilma sufiksita = väiksem
  `koosolek_id`, `_2` = suurem; 1930-09-08 kontrollitud vormi järgi
  (fail ilma sufiksita algab "erakorraline koosolek" = K174).
- Kahepäevased: `1920-02-23_1920-02-24` = K025 ✓; `1923-12-28_1923-12-29` = K084 ✓;
  `1926-12-29_1926-12-30` = K127 ✓; `1920-02-29_1920-03-30` = K026, aga CSV
  `kuupaev_lopp` on **`1920-02-30`** (vigane kuupäev). Protokolli tekst ütleb
  "29 ja 30 märtsil 1920" ja K026 asub tabelis veebruari–aprilli vahel; `1920-02-29` oli
  pühapäev, 1920-03-29 esmaspäev. Õige on 1920-03-29/30 → **andmeparandus AP-01**
  (CSV parandatakse; korpuse faili ümber ei nimetata, vaste käib käsitsi tabelist).
- **`1925-06-25.json` ↔ K077 (`1923-06-25`)**: failinimi järgib protokolli OCR-teksti
  "esmaspäewal 25.juunil 1925"; CSV paneb koosoleku 1923. aastasse (K077 asub K076
  1923-05-28 ja K078 1923-08-27 vahel, koosseis 1921-1923, nädalapäev esmaspäev — 25.06.1923
  oli esmaspäev, 25.06.1925 neljapäev). CSV on tõenäoliselt õige, protokolli aastaarv on
  kirja- või OCR-viga. **Käsitsi vaste** `1925-06-25.json → K077`.
- **`1940-11-13.json`** ("Protokoll nr. 28", 2 kB) ja **`1940-11-13_2.json`** ("Protokoll
  nr. 29"): CSV-s on ainult üks rida K329, mille `protokolli_algus_txt` = "Protokoll nr.
  29" → `_2` = K329; failile nr 28 **pole koosoleku rida** → **andmeparandus AP-02**:
  `koosolekud.csv`-sse lisatakse uus rida **K338** (13.11.1940, protokoll nr 28) ja
  `1940-11-13.json → K338`.
- **K336** (`1941-01-14`, "Arakiri Protokoll pr. 2" — protokolli nr 2 ärakiri; K335 on sama
  protokoll) — korpuses on ainult üks `1941-01-14.json` → K335. K336 jääb tabelisse
  omaette reana märkega "ärakiri" (AP-03); protokolli täisteksti tal ei ole.

Tulemus pärast AP-01…AP-03: **337 protokolli seotakse 337 koosolekuga 338-st**; ainult
K336-l protokolli ei ole. Protokollide leht näitab 337 protokolli.

### 3.6 Lehepildid ja `protokolli_lehed.csv` (FAKT, lisatud 27.10.2026)

Allikas: andmestiku omaniku kontrollitud faktid + `protokolli_lehed.csv` (kontrollitud
siin uuesti: 7 121 rida, 337 protokolli, 7 117 erinevat pilti).

- Originaalid: 7 308 mustvalget TIF-i (1-bit, CCITT G4), 949 MB, aastakaustades; iga
  aastakaust = üks säilik, failinimi `<säilik>_<lk>.tif` (nt `0057_003.tif`, `064a_001.tif`).
  TIF-e reposse ega väljundisse ei panda.
- Teisendatud PNG-d (mustvalged; halltoon-WebP/JPEG oleks 2–4× suurem):
  `pildid/1200/<aasta>/<säilik>_<lk>.png` (lehevaade, kokku 304 MB, keskmiselt ≈ 44 kB)
  ja `pildid/300/<aasta>/<säilik>_<lk>.png` (eelvaade, kokku 40 MB, ≈ 6 kB).
  Teisendusskript `scripts/teisenda_pildid.py` (Python + Pillow); **buildis seda ei käivitata**.
- `protokolli_lehed.csv` veerud: `protokoll` (korpuse failinimi), `jrk` (1…n protokolli
  sees, pidev), `arhiiviviide` (nt `ERA.2966.2.57`; 23 säilikut, sh `ERA.2966.2.64a` ja
  `ERA.2966.9.8`), `lehekulg` (arhiivi lk, võib olla `134a`), `xml_file`
  (`textline_info.xml_file`; tühi, kui leht on tekstita), `pilt` (tee `<aasta>/<säilik>_<lk>.png`,
  sama nimi 1200- ja 300-kaustas), `transkribus_lk`, `tekstita` (0/1).
- Kõik 7 093 tekstiga lehte (`textline_info.xml_file`) on pildiga seotud; ükski leht ei
  kuulu kahele protokollile. Protokollis on 1…93 lehte (mediaan 17; suurim `1937-03-22`).
- **28 tekstita lehte 23 protokollis** (nt `1928-02-24` lk 38, `1937-03-22` lk 106):
  `textline_info` ridu pole, pilt on; `tekstita=1`, `xml_file` tühi. Eeldus (omaniku
  kinnitatud): need kuuluvad protokolli pildiseeriasse ja kuvatakse järjekorras.
- **Jagatud lehed**: `1934-04-30` lk 134 ja `1937-05-31` lk 254 on Transkribuses jagatud
  osadeks `…a`/`…b`; CSV-s on **kolm** rida (134, 134a, 134b), millel on sama `pilt` ja
  sama `transkribus_lk`, aga eri `xml_file` (st eri tekstivahemikud). (Lähtefaktide tekst
  ütleb "kaks rida" — CSV-s on kolm; rakendus peab lugema CSV-d.)
- 219 pilti (kaaned, tiitellehed) ei kuulu ühegi protokolli juurde — neid ei kuvata ega
  kopeerita väljundisse (vt ET-09).
- Aastakaust ≠ alati protokolli aasta (`1941-*` kaustas `1940`, `1925-06-25.json` kaustas
  `1923`): pildi tee võetakse **alati CSV-st**.
- **Transkribuse lehenumber = pildi järjekorranumber säiliku kaustas, mitte arhiivi lk**
  (kontrollitud 337/337 esimese lehe vastu). Erinevus on säilikus 57 (1918), kus pildid
  hüppavad lk 17 → 104: `1918-12-04` lk 112–117 = Transkribuse lehed 26–31. Vana ET-05
  reegel ("URL-i lõpp = lk") oleks avanud 4 protokolli (`1918-12-02`, `-04`, `-09`, `-16`)
  vale lehe. Lisaks on jagatud lehtedel (134/134a/134b) üks Transkribuse number.

---

## 4. Andmete sidumise reeglid

### 4.0 Andmeparandused enne sidumist (PEAB, otsustatud 20.10.2026)

- **AP-01** `data/koosolekud.csv` K026: `kuupaev` → `1920-03-29`, `kuupaev_lopp` →
  `1920-03-30`, `nadalapaev` → `esmaspäev`; `data/osavott.csv` K026 ridade `kuupaev` →
  `1920-03-29`. Koosseis (1919-1921) ei muutu. Kontrollida, et `koosseisud.csv`
  esimese/viimase koosoleku kuupäevad ei viita K026-le (ei peaks).
- **AP-02** `data/koosolekud.csv` uus rida **K338**: `kuupaev=1940-11-13`,
  `nadalapaev=kolmapäev`, `vorm=linnavalitsus linnavolikogu ülesandeis`,
  `koosseis_id=1940-1941`, `kuupaev_txt="13. novembril 1940"`, `protokolli_algus_txt` =
  `1940-11-13.json` teksti algus (sissejuhatus, nagu teistel ridadel), ülejäänud veerud
  tühjad; `juhataja` tühi (1940–41 ridadel on see tühi). `koosolek_juhatajad.csv`-sse
  rida ei lisata (K. Jalak pole volinike tabelis; võrdle Robert Sinka käsitlusega).
  **NB:** K338 ei ole kronoloogilises ID-järjekorras — koodis ei tohi eeldada, et
  `koosolek_id` järjekord = kuupäeva järjekord (kontrollida `KoosolekudVaade`
  vaikesortimist: see on `kuupaev`, OK; `koosseisud.csv` `viimane_koosolek` ei muutu).
- **AP-03** K336 jääb; `data/README.md`-s ja koosoleku lehel märge "protokolli nr 2
  ärakiri (vt K335)". Tehniliselt: `protokollid.csv` real K336 `markus="ärakiri K335-st,
  protokollifaili pole"`.
- Kõvakodeeritud arvud "337 koosolekut" → 338 (`README.md`, `app/layout.tsx` metadata
  description, `data/README.md`; avaleht loeb `andmed.koosolekud.length`, OK).
  `data/README.md`-s dokumenteerida mõlemad parandused ja K338 päritolu (korpus, mitte
  algne `TLV_koosolekud.xlsx`).

### 4.1 SD-01 Protokollifail ↔ koosolek (PEAB)

1. Failinimi parsitakse: `D1[_D2|_2].json`. `D1` peab võrduma `koosolekud.kuupaev`.
2. Kui `D1`-le vastab täpselt üks rida → vaste. Kui `D2` on olemas, kontrollitakse
   `kuupaev_lopp === D2`; erinevus logitakse hoiatusena (K026 juhtum), vaste jääb.
3. Kui `D1`-le vastab kaks rida: sufiksita fail → väiksem `koosolek_id`, `_2` → suurem.
   Lisakontroll: `meta`-vaba, aga `text`-i esimesed 60 märki võrreldakse
   `protokolli_algus_txt` esimeste 60 märgiga (normaliseeritud tühikud); mittesobivus
   logitakse hoiatusena.
4. Käsitsi ülekirjutused failis `scripts/protokollid-vasted.json`
   (`{"1925-06-25.json": "K077", "1920-02-29_1920-03-30.json": "K026",
   "1940-11-13.json": "K338", "1940-11-13_2.json": "K329"}`), mis rakenduvad enne
   automaatreegleid. Väärtus `null` tähendaks teadlikult sidumata faili (praegu ühtegi).
   1940. a sama päeva paarid (26.09 nr 14/15, 11.10 nr 21/22, 05.11 nr 25/26)
   kontrollib arendaja `protokolli_algus_txt` protokollinumbri järgi ja kirjutab
   tulemuse samuti sellesse faili (kommentaariga), isegi kui automaatreegel annab sama.
5. Iga koosolek võib saada **maksimaalselt ühe** protokolli ja iga fail ühe koosoleku;
   rikkumine = eeltöötluse viga (build katkeb).
6. Protokolli ID = `koosolek_id` (nt `K174`); URL `/protokollid/K174/`.

### 4.2 SD-02 Nimeüksus ↔ isik (PEAB)

Sisend: `council_member_id`, `council_member_ambiguous`, `council_member_match_status`.
Eeltöötlus teisendab need kujule `{ isik_id: number | null, kandidaadid: number[],
kindlus: "kõrge" | "keskmine" | "mitmene" | "puudub" }`, kasutades 1. etapi sõnavara
(`lib/types.ts: SidumiseKindlus`):

| `council_member_id` | `ambiguous` | `match_status` | → `isik_id` | → `kandidaadid` | → `kindlus` | Kuvamine protokollis |
|---|---|---|---|---|---|---|
| `"None"` | false | `not_per` (ORG/LOC/MONEY/POSITION) | null | [] | — | ei puutu isikusidumisse |
| `"None"` | false | `no_match` (PER) | null | [] | puudub | PER-allajoonitus, lingita; tooltip "isik (sidumata)" |
| `"N"` | false | `exact`, `exact;context_exact` | N | [N] | kõrge | link `/isikud/N/`; tooltip "isik: <toorkuju> → <Eesnimi Perenimi>" |
| `"N"` | false | sisaldab `levenshtein_fuzzy` või `ocrmistake` | N | [N] | keskmine | link; tooltip lisab "(ebakindel vaste)" |
| `"N;None"` | true | mis tahes | N | [N] | mitmene (registriväline) | link + ülaindeks `?` nagu `osavott` mitmene; tooltip "tõenäoliselt <nimi>; sama nimega võib esineda mitte-volinik" (**EELDUS E-01**) |
| `"N;M[;…][;None]"`, 2–3 ID-d | true | mis tahes | null | [N, M, …] | mitmene | lingita allajoonitus + `?`; klõps/tooltip loetleb kandidaadid linkidena |
| ≥ 4 ID-d | true | mis tahes | null | [] | puudub | nagu sidumata (**EELDUS E-02**; nt "Karl" 27 kandidaati) |

Reeglid:
- `isik_id`, mis puudub `data/isikud.csv`-s → eeltöötluse viga (ET-06).
- Kuvamisel kasutatakse alati protokolli **toorkuju** (nagu `nimi_toor`); kanooniline nimi
  ainult tooltipis ja ekspordis.
- Igal protokollilehel peab olema nähtav märge, et isikud, organisatsioonid jm on
  **automaatselt tuvastatud ja seotud** (vt PT-04 ja ptk 9 reegel 2).

### 4.3 SD-03 Kõneleja ↔ isik (PEAB)

- Kõneleja vahemik `named_spans.speaker` → otsitakse PER-olem, mille vahemik kattub
  kõneleja vahemikuga (ühine lõik ≥ 1 märk). Leitud olemi sidumine (SD-02) kehtib
  kõnelejale. Kui kattuvaid PER-olemeid on mitu, võetakse pikima kattuvusega.
- Ilma PER-olemita kõneleja ("Olesks") → sidumata; kuvatakse `speaker_name` toorkujul.
- Eraldi nimepõhist sidumist (`speaker_name` vs `isikud.csv`) **ei tehta** — see oleks
  uus, vigadele avatud heuristika (otsus O-13: sidumata kõnelejad jäävad nimena ilma lingita).

### 4.4 SD-04 Päevakorrapunktid ↔ olemasolevad koosolekuandmed (FAKT)

`koosolekud.csv`-s ja teistes CSV-des **ei ole** päevakorraga seotud veerge; ainus
kokkupuude on `protokolli_algus_txt` (= protokolli sissejuhatus enne 1. punkti) ja
`muutused.csv` protokolliviited (`liitus_prot` jne on kuupäevad, st viitavad koosolekule,
mitte punktile). Seega päevakorrapunkte ei seota ühegi CSV-kirjega; nad elavad ainult
eeltöödeldud protokolliandmetes. Punkti püsiv aadress on `/protokollid/K174/#p3`
(`number`-atribuut).

---

## 5. Eeltöötlus

### 5.1 Asukohad

```
korpus/json/*.json                  toorkorpus (337 faili, ~374 MB) — EI lähe väljundisse
scripts/eeltootle-protokollid.ts    eeltöötlusskript (tsx)
scripts/protokollid-vasted.json     käsitsi vasted/ülekirjutused (SD-01 p 4)
data/protokollid.csv                GENEREERITUD, commititakse: protokoll ↔ koosolek + statistika
data/paevakorrapunktid.csv          GENEREERITUD, commititakse: punktide pealkirjad (KO-11, ET-07)
data/protokolli_mainimised.csv      GENEREERITUD, commititakse: isik × protokoll mainimiste arv (PR-12, ET-08)
data/protokolli_lehed.csv           SISEND (27.10.2026), commititakse: protokoll × leht × pilt (ptk 3.6)
public/pildid/1200/<aasta>/*.png    SISEND (27.10.2026): lehevaate PNG-d, 304 MB, tavalises gitis (O-14)
public/pildid/300/<aasta>/*.png     SISEND (27.10.2026): eelvaate PNG-d, 40 MB
scripts/teisenda_pildid.py          TIF → PNG teisendus (Python); EI käivitata buildis
public/protokollid/<K-id>.json      GENEREERITUD: ühe protokolli andmed (laetakse lehel)
public/protokollid/otsing/<aasta>.json  GENEREERITUD: täistekstiotsingu kildud aastate kaupa
public/protokollid/_meta.json       GENEREERITUD: versioon, genereerimisaeg, failide loend
```

`korpus/` ei ole `public/` all, Next.js ei kopeeri seda `out/`-i (**FAKT**: `output: "export"`
kopeerib ainult `public/` ja genereeritud lehed). `korpus/` lisada `.eslintignore`-i /
`tsconfig.exclude`-i, et tööriistad 374 MB läbi ei kammiks.

**Git (otsustatud):** korpus `korpus/json/` läheb tavalisse gitti (ilma LFS-ita);
`public/protokollid/` on `.gitignore`-is ja genereeritakse `prebuild`-is nii lokaalselt
kui GitHub Actionsis (`deploy.yml` ei muutu, `npm ci` + `npm run build` piisab).
Kolm `data/*.csv` väljundit commititakse, et tabelid ja profiilid töötaksid ka
korpuseta kloonis.

### 5.2 ET-01 Skript ja käivitamine (PEAB)

- `npm run eeltootle` = `tsx scripts/eeltootle-protokollid.ts` (lisada `tsx` devDependency).
  Skript jagab normaliseerimiskoodi rakendusega (`lib/format.ts: normalizeOtsing`,
  `lib/protokollid/*` tüübid), seepärast TypeScript, mitte Python.
- Lipud: `--korpus <kaust>` (vaikimisi `korpus/json`), `--valjund <kaust>` (vaikimisi
  `public/protokollid`), `--kontrolli` (ainult valideerib, ei kirjuta).
- `prebuild`: `npm run zip-data && npm run eeltootle:kui-vaja`, kus `eeltootle:kui-vaja`
  käivitab eeltöötluse, kui `korpus/json` on olemas ja `public/protokollid/_meta.json`
  on vanem kui korpuse failid või puudub; kui korpust pole, aga väljund on → vahele;
  kui pole kumbagi → build katkeb selge veateatega (`protokollide eeltöötlus puudub`).
- Töötab ühe failiga korraga (streamimata; 6 MB JSON mahub mällu), ajakulu eesmärk
  < 3 min kogu korpusele.
- Logib kokkuvõtte: faile, seotud koosolekuid, hoiatused (SD-01 p 2–3), sidumata
  failid, ID-de kontroll (ET-06), väljundi maht.

### 5.3 ET-02 Mida korpusest võetakse ja mis kujul salvestatakse (PEAB)

Ühe protokolli fail `public/protokollid/K174.json` (TypeScript-tüüp `ProtokollAndmed`
failis `lib/protokollid/types.ts`):

```ts
interface ProtokollAndmed {
  id: string;                    // koosolek_id, nt "K174"
  fail: string;                  // "1930-09-08.json"
  kuupaevad: string[];           // meta.meeting_dates
  transkribus_url: string;       // meta.transcribus_url (dokumendi URL; lehe URL vt ET-05)
  arhiiviviide: string;          // "ERA.2966.2.74" protokolli_lehed.csv veerust (27.10.2026)
  tekst: string;                 // text tervikuna, muutmata
  sissejuhatus: [number, number];        // 0 … esimese punkti algus
  paevakord: { nr: number; algus: number; lopp: number; pealkiri: [number, number] }[];
  lopuosa: [number, number] | null;      // viimase punkti lõpp … teksti lõpp (lisad maha arvatud)
  lisad: { algus: number; lopp: number; kirjeldus: string }[];     // appendix_regions
  tabelid: [number, number][];           // table_regions
  laused: [number, number][];            // sentences (märgikohad)
  olemid: {                              // named_entities
    a: number; l: number;                // algus, lõpp
    t: "PER" | "ORG" | "LOC" | "MONEY" | "POSITION";
    isik_id: number | null;
    kandidaadid: number[];
    kindlus: "kõrge" | "keskmine" | "mitmene" | "puudub" | null;   // null kui t !== PER
  }[];
  koned: {                               // speeches
    koneleja: [number, number];
    nimi: string;                        // speaker_name
    isik_id: number | null; kandidaadid: number[]; kindlus: …;    // SD-03 kaudu
    tykid: [number, number][];           // speech võib olla mitmetükiline
  }[];
  normid: [number, number, string][];    // words.normalized_form, AINULT kui erineb algkujust
  lehed: Leht[];                         // protokolli_lehed.csv + textline_info (ET-09; muudetud 27.10.2026)
  statistika: { sonu: number; lauseid: number; paevakorrapunkte: number; olemeid: number;
                konesid: number; lehekylgi: number; lehekylgi_tekstita: number; tekst_kb: number };
}

/** Üks protokolli leht (27.10.2026). Järjekord = protokolli_lehed.csv jrk. */
interface Leht {
  jrk: number;                 // 1…n protokolli sees
  lk: string;                  // arhiivi leheküljenumber, nt "112", "134a"
  arhiiviviide: string;        // "ERA.2966.2.57"
  algus: number | null;        // tekstivahemik `tekst`-is (textline_info.xml_file kaudu);
  lopp: number | null;         //   null, kui tekstita=true
  pilt: string;                // "1918/0057_112.png" — sama nimi kaustades pildid/1200 ja pildid/300
  transkribus_lk: number;      // Transkribuse lehe järjekorranumber (URL-i jaoks)
  tekstita: boolean;
  jagatud: boolean;            // sama pilt jagatud mitme rea vahel (134/134a/134b)
}
```

Kõik vahemikud on märgikohad `tekst`-is (`base_span` kujud teisendatakse ET-02 juures,
vt ptk 3.2). `sonu` = `words`-kihi spanid, mille tekst sisaldab vähemalt ühte tähte või
numbrit (kirjavahemärgid välja; **EELDUS E-03**).

### 5.4 ET-03 `data/protokollid.csv` (PEAB)

Üks rida protokolli kohta (337; kui tulevikus jääb mõni fail sidumata, läheb see eraldi
reale tühja `koosolek_id`-ga):

`koosolek_id;fail;kuupaev_1;kuupaev_2;transkribus_url;arhiiviviide;lehekylgi;sonu;lauseid;paevakorrapunkte;olemeid;olemeid_PER;seotud_isikuid;konesid;tekst_kb;lisasid;tabeleid;markus`

Komaeraldaja nagu teistel `data/*.csv`-del (mitte semikoolon — semikoolon on ainult
ekspordis). `markus` sisaldab SD-01 hoiatusi ("kuupaev_lopp erineb: 1920-02-30 vs
1920-03-30", "käsitsi vaste"). Fail commititakse, et PT-01 tabel ja koosolekute leht
töötaksid ka ilma korpuseta (ainult täistekst vajab `public/protokollid/`).

### 5.5 ET-04 Otsingukillud (PEAB)

`public/protokollid/otsing/<aasta>.json` (1918…1941, 24 faili):

```ts
interface OtsinguKild {
  aasta: number;
  protokollid: {
    id: string; kuupaev: string; kuupaev_lopp: string;
    tekst_norm: string;          // normalizeOtsing(tekst) — sama pikkusega kui tekst? EI (vt all)
    laused: [number, number][];  // lausepiirid tekst_norm-is
    laused_tyybid: number[];     // bitmask lause kohta: PER=1, ORG=2, LOC=4, MONEY=8, POSITION=16 (PT-07)
    paevakord: [number, number, number][]; // nr, algus, lopp tekst_norm-is
  }[];
}
```

Normaliseeritud tekst: `tekst_norm` = tekst, millele on **kõigepealt** rakendatud
`normid`-asendused (moderniseeritud kirjakuju) ja **seejärel** `normalizeOtsing`
(väiketähed, diakriitika maha, w→v). Et asendused muudavad pikkust, salvestatakse
`laused`/`paevakord` vahemikud juba `tekst_norm` koordinaatides ning lisaks
`algkuju_kaardistus: number[]` (iga lause algus algses tekstis), et tulemuselt saaks
avada protokolli õiges kohas. Päringule rakendatakse sama `normalizeOtsing`. Nii leiab
"walimine" ja "valimine" ühe ja sama koha nii siis, kui `normalized_form` on olemas, kui
siis, kui pole (w→v on normaliseeringus juba sees — **FAKT**, `lib/format.ts`).

Eeldatav maht (näidiste põhjal, **FAKT** mõõdetud 7 failil, ekstrapoleeritud):
- `public/protokollid/<id>.json`: 1,9× teksti maht → kokku ≈ **24 MB** (gzip ≈ 8 MB);
  suurim ≈ 270 kB (`1937-03-22`), mediaan ≈ 60 kB.
- otsingukillud: ≈ 1,2× teksti maht → kokku ≈ **15 MB** (gzip ≈ 5 MB); suurim aasta ≈ 1 MB.
- `data/protokollid.csv`: < 100 kB.
Kokku lisandub `out/`-i ≈ 40 MB staatilisi faile, mida laetakse ainult vajadusel
(üks protokoll või vajalikud aastakillud korraga).

### 5.6 ET-05 Arhiiviviide ja leheküljed (PEAB; *parandatud 27.10.2026*)

- **Arhiiviviide** võetakse `protokolli_lehed.csv` veerust `arhiiviviide` (nt
  `ERA.2966.2.57`); `xml_file` nimest seda enam ei tuletata (E-04 kaotab kehtivuse —
  CSV on autoriteetne, kuid eeltöötlus kontrollib, et `xml_file` säiliku number klapib
  CSV viitega, ja hoiatab erinevusest).
- **Arhiivi lk** = CSV `lehekulg` (string; `134a` võimalik). Viidetes (PT-09) kasutatakse
  alati arhiivi lk-d.
- **Transkribuse lehe URL** = `transkribus_url`, kus lõpunumber asendatakse CSV
  `transkribus_lk`-ga. **Mitte** arhiivi lk-ga ega `xml_file` numbriga (ptk 3.6:
  säilikus 57 erinevad need 87 võrra). Protokolli enda URL (`meta.transcribus_url`)
  jääb "Ava Transkribuses" lingiks protokolli tasemel; kontroll: esimese lehe
  `transkribus_lk` peab võrduma `meta.transcribus_url` lõpunumbriga (337/337 FAKT).

### 5.7 ET-06 Valideerimine (PEAB)

Skript katkestab (exit 1), kui:
- mõni `council_member_id` ID puudub `data/isikud.csv`-s;
- failil pole vastet ega `null`-kirjet `protokollid-vasted.json`-is;
- kaks faili viitavad samale `koosolek_id`-le;
- `agenda_points` ja `agenda_point_titles` numbrid ei paaristu või punktid kattuvad;
- mõni olemi/kõne/lause vahemik on tekstist väljas.
Hoiatused (ei katkesta): SD-01 p 2–3 erinevused; koosolekud ilma protokollita (K336);
kõned ilma PER-olemita; ≥ 4 kandidaadiga olemid (arv).

Lehtede kohta (*27.10.2026*, vt ET-09) katkestab lisaks, kui:
- mõni `textline_info.xml_file` ei esine `protokolli_lehed.csv`-s või CSV `xml_file`
  ei esine korpuses;
- CSV `protokoll` nimi puudub korpuses või `jrk` ei ole pidev 1…n;
- CSV-s viidatud `pilt` puudub kaustas `public/pildid/1200/` või `public/pildid/300/`
  (kontroll jäetakse vahele lipuga `--ilma-piltideta`, nt korpuseta arenduskloonis);
- esimese lehe `transkribus_lk` ≠ `meta.transcribus_url` lõpunumber.
Hoiatused: tekstita lehed (arv ja loetelu), jagatud lehed, `xml_file` säiliku number ≠
CSV `arhiiviviide`, `public/pildid/` failid, mida ükski CSV rida ei kasuta (219 oodatud).

### 5.8 ET-07 `data/paevakorrapunktid.csv` (PEAB, KO-11 ja PT-01 jaoks)

Üks rida päevakorrapunkti kohta (3 511): `koosolek_id,nr,pealkiri,algus,lopp,sonu`.
`pealkiri` = `agenda_point_titles` tekst ilma algusnumbrita ("1." / "I.") ja
reavahetused tühikuteks; `algus`/`lopp` märgikohad `tekst`-is. Läheb jaluse ZIP-i
automaatselt.

### 5.9 ET-08 `data/protokolli_mainimised.csv` (PEAB, PR-12 jaoks)

Agregaat `olemid`-est (ainult `t = PER`, `isik_id` olemas):
`isik_id,koosolek_id,kuupaev,kindlus,arv` — üks rida isiku × protokolli × kindluse kohta
(`kindlus` ∈ kõrge / keskmine / mitmene; "mitmene" siin = ainult registriväline `N;None`
juhtum, sest mitme kandidaadiga olemitel `isik_id` puudub). Eeldatav maht ≈ 20–30 tuhat
rida, < 1 MB. Ei sisalda kõnelejaid eraldi (kõneleja on sama PER-olem, SD-03).

### 5.10 ET-09 Lehtede ja piltide sidumine (PEAB; *lisatud 27.10.2026*)

Sisend: `data/protokolli_lehed.csv` (ptk 3.6) + korpuse `textline_info`. Väljund:
`ProtokollAndmed.lehed` (ET-02 `Leht[]`).

1. Protokolli read võetakse CSV-st `protokoll` = korpuse failinimi, järjestatakse `jrk`.
2. Tekstivahemik: `textline_info` spanid rühmitatakse `xml_file` kaupa → `[esimese rea
   algus, viimase rea lõpp]`; seotakse CSV reaga `xml_file` võrdsuse kaudu.
   Tekstita rida (`tekstita=1`) saab `algus = lopp = null`.
3. Kontroll: tekstiga lehtede vahemikud on `jrk` järjekorras kasvavad ja ei kattu
   (jagatud lehtede 134/134a/134b vahemikud on eraldi ja järjestikused). Rikkumine →
   viga.
4. `jagatud = true`, kui sama `pilt` esineb protokollis rohkem kui ühel real.
5. `pilt` teed ei muudeta (suhteline `<aasta>/<säilik>_<lk>.png`); rakendus liidab
   ette `basePath + /pildid/1200/` või `/pildid/300/` (`lib/protokollid/laadi.ts`).
6. Pilte eeltöötlus ei genereeri ega kopeeri; `public/pildid/` on repos (O-14).
   Protokollidega sidumata 219 pilti `public/pildid/`-s olla ei tohi (väljundi maht) —
   skript `--kontrolli` loetleb nad; eemaldamine on andmestiku omaniku samm enne commiti.
7. `data/protokollid.csv` saab lisaveerud `lehekylgi_tekstita`, `esimene_lk`, `viimane_lk`.

Lehekülje püsiv aadress rakenduses: `/protokollid/<K-id>/?lk=<arhiivi lk>` (nt
`?lk=134a`); `#p<nr>` jääb päevakorrapunktile. Kui mõlemad on URL-is, võidab `lk`
(kerib lehele; punkt avatakse, kui leht algab selle sees).

---

## 6. Tehnoloogia ja piirangud

- Jääb: Next.js App Router, TypeScript, Tailwind, Recharts, `output: "export"`,
  `basePath: "/tlv-rakendus"`, eestikeelne kasutajaliides, koosseisude palett.
- **Kõik lehed staatilised.** 337 protokollilehte `generateStaticParams` kaudu
  (`data/protokollid.csv` ridadest, millel on `koosolek_id`). Täistekstiotsing töötab
  **kliendis** eelgenereeritud kildudega (ET-04) Web Workeris; serverit pole.
- **Toorkorpus ei lähe väljundisse ega brauserisse** — ainult ET-02/ET-04 failid.
- Lehe maht: protokollileht renderdab teksti build-ajal HTML-i (prinditav, töötab
  ilma JS-ita). Suurima protokolli (151 kB teksti, 2 348 olemit) HTML + RSC-payload
  eeldatavalt 1–2 MB. **Piir: üks protokollileht ≤ 2 MB `out/`-is** (kontrollida buildi
  järel `du`-ga). Otsustatud: eelistada täielikult staatilist lehte, kuni piir peab.
  Kui piir ületatakse, laetakse ≥ 100 kB tekstiga protokollide päevakorrapunktide sisu
  kliendis `public/protokollid/<id>.json`-ist (pealkirjad ja sissejuhatus jäävad
  SSG-sse); mõõtmistulemus ja otsus dokumenteerida `README.md`-s.
- `basePath` tõttu kõik `fetch`-id `public/protokollid/…` failidele käivad läbi
  abifunktsiooni, mis lisab `/tlv-rakendus` (jaluse ZIP-link on praegu ilma —
  kontrollida, et see GitHub Pagesil töötab; sama muster).
- Buildi aeg: 337 suurt lehte lisaks; eesmärk kogu `next build` < 5 min GitHub Actionsis.
- **Pildid (27.10.2026):** `out/` kogumaht peab jääma GitHub Pagesi 1 GB piiri sisse:
  pildid ≈ 344 MB + protokolliandmed ≈ 40 MB + HTML/JS (mõõta; eeldatavalt < 150 MB) →
  ≈ 0,55 GB. Pilte **ei laeta koos lehega**: HTML-is on ainult lehe-eelvaadete `<img
  loading="lazy">` pildivaate ribas ja üks 1200-pilt aktiivse lehe kohta; naaberlehed
  (±1) eellaetakse alles pildivaate avamisel. `next/image` optimeerimist ei kasutata
  (`images.unoptimized` on juba seatud); tavaline `<img>` + `srcset` puudub (ainult
  kaks fikseeritud suurust). PNG-d on samas repos tavalises gitis `public/pildid/` (O-14).

---

## 7. Lehed ja nõuded

### Globaalsed muutused (integratsioon; minimaalne, et uus leht oleks kättesaadav)

- **IN-01 PEAB**: `components/Nav.tsx` LEHED-loendisse "Protokollid" (`/protokollid/`)
  Koosolekute järele. Mobiilimenüü sama.
- **IN-02 PEAB**: koosoleku detaillehel (`app/koosolekud/[id]/page.tsx`) päise `dl`-i
  rida "Protokoll: Täistekst →" lingiga `/protokollid/<id>/`, kui protokoll on olemas;
  kui pole (K336): "protokolli täistekst puudub". Plokk "Protokolli algus (toores
  OCR-tekst)" jääb (**EELDUS E-05**).
- **IN-03 PEAB**: koosolekute tabelis (`KoosolekudVaade`) ikoon/veerg "Protokoll" (link),
  et nimekirjast pääseks täistekstile; ekspordis veerg `protokoll_olemas` (jah/ei).
- **IN-04 VÕIKS**: globaalses otsingus (`GlobalSearch.tsx`) kolmas kategooria üherealise
  kirjega "Otsi protokollide täistekstist: „<päring>“ →" → `/protokollid/?q=<päring>`.
  Täistekstiotsingut ennast globaalsesse kasti ei ehitata (**EELDUS E-06**).
- **IN-05 PEAB**: `lib/abitekstid.ts` uued abitekstid: `automaatmargendus` ("Isikud,
  organisatsioonid, kohad, rahasummad ja ametinimetused on tuvastatud automaatselt
  keelemudeliga ja võivad sisaldada vigu; isikute seosed profiilidega on samuti
  automaatsed."), `kone` ("Kõned on tuvastatud automaatselt; kaudkõnesid ei kuvata."),
  `kirjakuju` ("Moderniseeritud kuju asendab vana kirjaviisi sõnad (nt wolikogu →
  volikogu) seal, kus automaatne normaliseering on olemas; ülejäänud tekst jääb
  algkujule."), `paevakorrapunkt`, `protokolliLisa`.
- **IN-06 PEAB**: `lib/colors.ts` konstant `OLEMI_VARVID` 5 tüübile (PER, ORG, LOC,
  MONEY, POSITION), eristatavad koosseisude paletist ja värvipimedusele sobivad; iga
  tüüp saab lisaks värvile **oma allajoonituse stiili** (pidev / punktiir / kriipsjoon /
  topelt / laineline), et värv ei oleks ainus tunnus.
- **IN-07 PEAB**: `README.md` ja `data/README.md` täiendus (uued failid, eeltöötlus,
  `korpus/` käsitlus, piirangud); `CLAUDE.md` viide sellele dokumendile.

### 1. Protokollide nimekiri `/protokollid`

- **PT-01 PEAB — nimekiri.** Tabel `KoosolekudVaade` komponendiga (üldistada:
  `read`, `lisaveerud`, `reaLink` propid), eelfiltreeritud ridadele, millel on protokoll
  (`data/protokollid.csv`). Veerud: Kuupäev, Nädalapäev, Vorm, Juhataja, Kohalolnud,
  Koosseisu suurus + **Päevakorrapunkte** + **Sõnu** (`statistika.sonu`). Rida →
  `/protokollid/<id>/`. 50 rida lehel, sortimine igalt veerult (UN-05…UN-07), filtrid
  URL-is (UN-04), "Minu vaade" (`tlv-vaade-protokollid`), eksport CSV/XLSX/JSON kõigi
  `protokollid.csv` veergudega + koosoleku veerud (EX-02…EX-08; failinimi
  `tlv-protokollid-…`). Lehe sissejuhatav lause: "<n> protokolli 338 koosolekust;
  <m> koosolekul protokolli täistekst puudub." KO-01 sagedusdiagrammi sellel lehel ei
  korrata (**EELDUS E-07**). Veerg "Sõnu" = sõnade arv (otsustatud; teksti maht kB-des
  jääb ainult `protokollid.csv`-sse ja eksporti).
  *Aktsepteerimine:* tabelis 337 rida; `1930-09-08` ja `1940-11-13` kahel real; sorteerimine veerul
  "Sõnu" annab esimeseks `1934-08-27` või `1931-03-30` (≥ 150 kB teksti); eksport-CSV
  avaneb Excelis õigete täpitähtedega; URL `?algus=1930-01-01&lopp=1930-12-31` annab 16 rida.

- **PT-06 PEAB — ajavahemiku filter.** Samad `algus`/`lopp` kuupäevavalijad nagu
  koosolekute lehel; kehtib nii tabelile kui täistekstiotsingule (PT-02); otsingus
  laetakse ainult vahemikku jäävate aastate killud.
  *Aktsepteerimine:* `?algus=1940-08-01` → tabelis 29 protokolli (1940-08-20 …
  1941-01-17), otsing laeb ainult 1940 ja 1941 killud (kontroll võrgupaneelilt).

- **PT-02 PEAB — täistekstiotsing.** Otsingukast tabeli kohal (`?q=` URL-is, debounce
  300 ms, min 3 märki). Otsitakse alamsõne (fraasi) normaliseeritud tekstist (ET-04);
  tõstu-, diakriitika- ja w/v-tundetu; tulemus leitakse nii algkujust kui
  moderniseeritud kujust ("walimine" = "valimine"). Töötab Web Workeris; vajalikud
  killud laetakse esimesel päringul ja puhverdatakse mälus; laadimise ajal
  edenemisnäidik ("Laen 1930…1934"). Tulemus: protokollide kaupa kronoloogiliselt
  (kuupäev lingina → protokoll), iga tabamuse juures lause, milles tabamus on,
  ± 1 lause (vaikimisi), tabamus `<mark>`-iga, päevakorrapunkti number; link viib
  `/protokollid/<id>/?q=<päring>#p<nr>` ja protokollilehel tõstetakse päringu vasted
  esile ning vastav punkt avatakse. Kokkuvõte: "<n> tabamust <m> protokollis".
  Tulemuste paginatsioon 50 tabamust lehel. Hoiatus otsingu juures: "Tekst on OCR-i ja
  automaatse normaliseeringu tulemus; osa sõnu võib olla valesti loetud." Eksport:
  tulemused CSV/XLSX/JSON (protokoll, kuupäev, punkt, lause, tabamuse kontekst).
  *Aktsepteerimine:* "walimine" ja "valimine" annavad sama tabamuste arvu; "Lui Olesk"
  leiab `1918-12-04` sissejuhatuse; päring "raekojas" piiratuna 1937. aastaga ei lae
  teiste aastate kilde; kogu korpuse otsing pärast kildude laadimist < 2 s töölaual
  (mõõta); tulemuselt klõps avab õige punkti avatuna ja tabamus on esiletõstetud.

- **PT-07 VÕIKS — nimeüksuste kategooria filter.** Mitmikvalik tüüpide isik /
  organisatsioon / koht / rahasumma / ametinimetus (ET-04 `laused_tyybid`). Kui `q`
  puudub, tulemus = laused, milles valitud tüüp esineb (sama tulemuste vaade);
  kui `q` on, piiratakse tabamused lausetega, kus tüüp esineb. **Kuupäeva ("date")
  kategooriat ei pakuta — automaatkihis seda tüüpi ei ole (FAKT); otsustatud jätta
  välja, regulaaravaldis-heuristikat ei ehitata.**
  *Aktsepteerimine:* filter "rahasumma" 1937. aastal annab tulemusi `1937-03-22`-st
  (1 560 MONEY-olemit); kiip filtri kohal, X eemaldab.

- **PT-10 VÕIB — konteksti suurus.** Valik tulemuste kohal: "1 lause" / "laiem
  kontekst (±2 lauset)" / "kogu päevakorrapunkt"; salvestub localStorage'i
  (`tlv-otsing-kontekst`). "Lõik" UUS-i mõttes ei ole korpuses eristatav (**FAKT**:
  tekstis pole lõiguvahesid), seepärast asendus "±2 lauset" (otsustatud, E-08).

### 2. Protokolli vaade `/protokollid/[id]`

`[id]` = `koosolek_id`. `generateStaticParams` `data/protokollid.csv`-st.

- **PT-03 PEAB — struktureeritud täistekst.** Pea-plokk: pealkiri "Protokoll
  <kuupäev(ad) eesti kujul>", `vorm`, koosseis (värviruut + link, nagu koosoleku lehel),
  juhataja(d) linkidena (`koosolek_juhatajad.csv`), link koosoleku lehele, arhiiviviide
  + "Ava Transkribuses" (`transkribus_url`), statistika (punkte, sõnu, kõnesid,
  lehekülgi). 1940-1941 koosseisu puhul senine kontekstimärge (`ABI.
  linnavalitsusVolikoguYlesandeis`). Sisu plokkidena, iga plokk kokkukäiv
  (`<details>`/`<summary>` või nupp `aria-expanded`): **Sissejuhatus** (tekst enne 1.
  punkti; avatud vaikimisi), **päevakorrapunktid** 1…n (pealkiri `summary`-s, vaikimisi
  kinni, `id="p<nr>"`), **Lõpuosa**, **Lisad** (iga `appendix_regions` eraldi plokk
  pealkirjaga `kirjeldus`). Nupud "Ava kõik" / "Sule kõik". URL-i `#p<nr>` avab punkti ja
  kerib sinna. Protokoll ilma päevakorrapunktideta (4 faili) → kogu tekst ühes avatud
  plokis "Protokolli tekst" + märge "Päevakorrapunkte selles protokollis ei ole
  eristatud". Tekstikuva: OCR-read liidetakse lõigu sees tühikuga, aga `tabelid`
  vahemikes ja `LIST OR TABULAR` lehekülgedel säilitatakse reavahetused (`pre-wrap`,
  monospace) (**EELDUS E-09**). Kõned (`koned`) kuvatakse tekstivoos plokina: kõneleja
  nimi paksus kirjas (link, kui seotud; `?` kui mitmene), kõnetükid taandega, tükkide
  vahele jääv tekst (vahelehüüded) tavalise tekstina; ploki juures väike silt
  "kõne · automaatselt tuvastatud" (HelpTip `ABI.kone`). Tekstivoos on iga lehe
  alguses lehemarker (vt PT-05; *27.10.2026*) — see on osa tekstivaatest ka siis, kui
  pildipaneel on suletud.
  *Aktsepteerimine:* `K174` (1930-09-08) näitab 1 punkti; `K175` 11 punkti ja 40 kõnet;
  `/protokollid/K329/` on "Protokoll nr. 29" (13.11.1940) 2 punkti ja 1 lisaga ning
  `/protokollid/K338/` "Protokoll nr. 28" samal päeval 1 punktiga;
  `1937-09-06` (K-id CSV-st) ühe plokiga; `#p3` avab 3. punkti; klaviatuuriga saab iga
  ploki avada (Enter/Space); JS-ita on tekst HTML-is olemas.

- **PT-04 PEAB — annotatsioonide esiletõstmine.** `olemid` renderdatakse inline
  `<span>`-idena tüübi värvi + allajoonitusega (IN-06), `title`/tooltip "<tüüp eesti
  keeles>: <toorkuju>" (isik / organisatsioon / koht / rahasumma / ametinimetus), seotud
  isikul lisaks kanooniline nimi ja kindlus (SD-02 tabel). Klõps isikul → `/isikud/<id>/`;
  mitmese puhul avaneb väike popover kandidaatide linkidega; klõps organisatsioonil →
  `/protokollid/?q=<olemi tekst>` (= "otsib teised mainimised" PT-02 kaudu; E-10);
  kohal/rahasummal/ametil klõpsu pole. Legend ploki kohal (5 tüüpi + "seotud
  isik" / "mitmene ?" / "sidumata") ja lüliti "Peida märgendus". Teksti kohal püsiv
  märge "Märgendus on automaatne" (HelpTip `ABI.automaatmargendus`). Olemid ja kõned
  võivad pesastuda (olem kõne sees) — renderdaja töötab segmentide loendiga
  (kõik piirid sorteeritult), olem, mis ületab kõnetüki piiri, tükeldatakse.
  URL-parameeter `?isik=<id>` tõstab selle isiku kõik olemid tugevamalt esile ja avab
  neid sisaldavad punktid (PR-12 link). **Kuupäevi ei tõsteta esile** (automaatkihis
  DATE puudub, FAKT; otsustatud välja jätta).
  *Aktsepteerimine:* `1937-09-06` protokollis on "A. Piip" kaks korda lingitud isikule
  128, "J. Lill" lingitud 82-le `?`-märkega, "J. Roo" sidumata PER; `1918-12-04`
  "Koppel" pole lingitud, popover pakub kandidaate 58 ja 266; `1937-03-22` "Karl" (27
  kandidaati) kuvatakse sidumata; märgenduse peitmine jätab teksti muutmata; tooltip
  on klaviatuuriga (fookusega) kättesaadav.

- **PT-08 VÕIKS — kirjakuju-lüliti.** Lüliti "Ajalooline ↔ Moderniseeritud" lehe
  päises, seis localStorage'is (`tlv-kirjakuju`) ja URL-is (`?kuju=mod`). Moderniseeritud
  kuju = `normid` asendused algteksti peal; olemi- ja kõnevahemikud teisendatakse
  nihkega (asenduse pikkusevahe). Puuduva normaliseeringuga sõnad jäävad algkujule;
  lüliti juures HelpTip `ABI.kirjakuju` ja osakaal "<n> sõna <m>-st moderniseeritud".
  Otsing (PT-02) ei sõltu lülitist (indekseeritud on mõlemad). Eksport (PT-09) järgib
  aktiivset kuju ja märgib selle metaandmetesse.
  *Aktsepteerimine:* `1918-12-04` moderniseeritult algab "Tartu linnavolikogu
  erakorraline koosolek"; `1937-03-22` muutub < 1 % sõnadest; olemite allajoonitus jääb
  õigete sõnade peale ka pärast asendusi (test TE-07).

- **PT-05 PEAB — paralleelvaade arhiivi originaaliga** (*uus sõnastus 27.10.2026;
  varem VÕIKS, sest pilte polnud; nüüd on, vt ptk 3.6*). Andmed: `ProtokollAndmed.lehed`
  (ET-09), pildid `public/pildid/1200` ja `/300`.

  *Paigutus.* Töölaual (≥ 1024 px) kaks paneeli kõrvuti: vasakul struktureeritud tekst
  (PT-03/PT-04, kõik senised funktsioonid), paremal pildipaneel. Pildipaneeli saab
  nupuga "Originaal" avada/sulgeda (seis localStorage `tlv-pildipaneel`; vaikimisi
  **avatud** töölaual). Paneelide vahel lohistatav jaotur (**EELDUS E-13**; min laius
  30 %). Mobiilis ja kitsal ekraanil (< 1024 px) on kaks sakki "Tekst" / "Originaal",
  korraga üks nähtav; sakivahetus säilitab aktiivse lehe.

  *Lehemarkerid tekstis.* Iga `lehed`-kirje alguses (`algus`) on tekstivoos marker
  "lk <lk>" (väike, teksti servas, `id="lk-<lk>"`), tekstita lehe marker asub eelmise
  lehe lõpus kujul "lk <lk> (tekstita leht)", jagatud lehtede markerid "lk 134", "lk 134a",
  "lk 134b" eraldi. Marker on klõpsatav → aktiveerib lehe pildipaneelis (ja avab paneeli,
  kui see on suletud). Markerid on ka kokkuklapitud päevakorrapunktide sees (DOM-is
  olemas, nähtamatud, kuni punkt avatakse).

  *Pildipaneel.* Ülal: "lk <lk> / <esimene>–<viimane> · <arhiiviviide>" + link "Ava
  Transkribuses" (ET-05 lehe-URL, uues aknas) + nupp "Kopeeri lehe link"
  (`/protokollid/<id>/?lk=<lk>`) + nupud eelmine/järgmine (ka klaviatuuri ←/→, kui
  fookus on paneelis). Keskel aktiivse lehe 1200-pilt (`alt="Protokolli <kuupäev>
  originaal, lk <lk>"`), tekstita lehel lisasilt "tekstita leht", jagatud lehel silt
  "sama leht kui <teised lk-d>". Pilti saab suurendada (nupud + / − / "mahuta", hiireratas
  Ctrl-iga, puutel kahe näpuga, 1×…4×) ja suurendatuna lohistada (hiir, puude);
  topeltklõps = 2× sinna kohta. Realiseerida CSS `transform`-iga (ei vaja canvas-t ega
  CORS-i); teek lubatud (nt `react-zoom-pan-pinch`), aga eelistada ~150-realist oma
  komponenti, et vältida sõltuvust. All: eelvaadete riba kõigist protokolli lehtedest
  (300-PNG, `loading="lazy"`, aktiivne raamiga, horisontaalselt keritav, keritakse
  aktiivse juurde); klõps eelvaatel aktiveerib lehe.

  *Sünkroonimine.* (a) Tekst → pilt: tekstipaneeli kerimisel on aktiivne leht see, mille
  marker on viimasena ülalpool lugemisala ülemist kolmandikku (puhas funktsioon
  `aktiivneLeht(lehed, nähtavateMarkeriteOffsetid, kerimiskoht)`; arvesse lähevad ainult
  nähtavad markerid, st kokkuklapitud punktides olevaid eiratakse; IntersectionObserver
  või scroll-sündmus `requestAnimationFrame`-iga; pilt vahetub ilma hüppeta — eelmine
  jääb kuni uue laadimiseni). (b) Pilt → tekst: lehe valimisel paneelis (nupp, eelvaade,
  URL `?lk=`) **avatakse päevakorrapunkt(id)**, mille sees lehe tekstivahemik algab
  (ja sissejuhatus/lõpuosa/lisa plokk, kui kinni), seejärel keritakse markerile
  (`scrollIntoView`, `block: "start"`); tekstita lehe puhul keritakse eelmise lehe
  lõppu. Kerimisest tekkiv tagasisünk (a) ei tohi aktiivset lehte kohe ümber kirjutada
  (lukk ~500 ms). Mobiilis sakivahetusega: "Originaal" näitab lehte, mille juures tekst
  oli; "Tekst" kerib lehe markerile.

  *URL.* `?lk=<lk>` laetakse mount'is (nagu `useTabeliSeis` teeb query'ga): aktiveerib
  lehe, avab punkti, kerib. Lehevahetus kirjutab `?lk=` `history.replaceState`-iga.
  Kehtetu `lk` → ignoreeritakse, teade "Lehte <lk> selles protokollis ei ole".

  *Piirangud, mida kuvada.* Pilt on 1200 px laiune mustvalge koopia (mitte
  arhiivikvaliteet) — paneeli jaluses "Originaalid: Rahvusarhiiv, ERA.2966; täislahutuses
  Transkribuses". Rea esiletõstmist pildil ei ole (koordinaate pole, FAKT).

  *Aktsepteerimine:*
  - `K004` (1918-12-04): 6 lehte 112–117; "Ava Transkribuses" lk 112 juures viib
    `…/pages/26`, lk 117 → `…/pages/31` (mitte 112/117).
  - `K143` (1928-02-24): 8 lehte 35–42; lk 38 on tekstita — pildipaneelis on ta
    järjekorras 4., tekstis marker "lk 38 (tekstita leht)" lk 37 teksti lõpus; kõik 8
    eelvaadet ribas.
  - `K225` (1934-04-30): 28 lehte, lehed 134, 134a, 134b näitavad sama pilti ja sama
    Transkribuse URL-i (`…/pages/134`), tekstis on kolm eraldi markerit.
  - `K272` (1937-09-06): 1 leht, eelmine/järgmine nupud passiivsed.
  - `K266` (1937-03-22): 93 lehte (lk 106 tekstita); kerimine 7. punkti lõppu vahetab pildi
    lk 190 lähedale; eelvaadete riba laeb pilte alles nähtavale kerides (võrgupaneel:
    lehe avamisel ≤ 1 1200-pilt + nähtavad eelvaated, mitte 93).
  - `K178` (1930-10-27): `?lk=360` avab lehe 360 ja kokkuklapitud punkti, milles see algab;
    marker on ekraanil; "Kopeeri lehe link" annab sama URL-i.
  - Suurendus 4× ja lohistamine töötavad hiire ja puutega; "mahuta" taastab.
  - Mobiilis (375 px) on sakid "Tekst"/"Originaal"; sakivahetus ei kaota lehte.
  - Pildipaneeli sulgemisel ei laeta ühtegi pilti; tekstivaade jääb muutumatuks
    (markerid alles).
  - `out/` kogumaht < 1 GB; `du -sh out/pildid` ≈ 344 MB.

- **PT-09 PEAB — eksport ja viide.** Nupud päises (`ProfiilTegevused` üldistus):
  - **JSON**: `ProtokollAndmed` (ET-02) + `meta` (EX-04/EX-08: allikas, aeg, URL,
    kirjakuju, "märgendus automaatne"). Toor-EstNLTK-faili ei pakuta (ptk 6, otsus O-05); link GitHubi failile.
  - **TXT**: päis (pealkiri, kuupäev, arhiiviviide, Transkribuse URL, allikas,
    ekspordiaeg, kirjakuju), tühi rida, `tekst` aktiivses kirjakujus, muutmata
    reavahetustega.
  - **Markdown**: `# Protokoll <kuupäev>`, metaandmed loendina, `## Sissejuhatus`,
    `## <nr>. <pealkiri>` iga punkti kohta, `## Lõpuosa`, `## Lisa: <kirjeldus>`;
    kõned kujul `**Nimi:** tekst`; olemeid ei märgita (**EELDUS E-11**).
  - **PDF**: `window.print()` print-stiilileht, mis avab kõik plokid
    (`beforeprint` → `open`), peidab navigatsiooni/nupud/legendi, säilitab olemite
    allajoonituse must-valgena (stiil, mitte värv), lisab jalusesse viite (all).
  - **"Kopeeri viide"**: lõikelauale tekst
    `Tartu Linnavolikogu protokoll, <kuupäev(ad) eesti kujul>[, päevakorrapunkt <nr>]. Rahvusarhiiv, <arhiiviviide>, lk <esimene lk>[–<viimane lk>]. Transkribus: <URL>. Tartu Linnavolikogu andmestik, 2026, <lehe URL>#p<nr> (vaadatud <kuupäev>).`
    Punkt lisatakse, kui mõni punkt on fokuseeritud/avatud ainsana või URL-is on `#p<nr>`;
    igal punktil on ka oma väike "viide"-nupp. Kinnitusteade "Viide kopeeritud".
    *(27.10.2026)* `lk` on arhiivi lk `protokolli_lehed.csv`-st; kui viide tehakse
    pildipaneelist ("Kopeeri lehe link" kõrval nupp "Kopeeri viide"), on `lk` üks leht ja
    Transkribuse URL selle lehe URL (ET-05, `transkribus_lk`), rakenduse URL `?lk=<lk>`.
  - Failinimed EX-07: `tlv-protokoll-K174-1930-09-08-<täna>.json|txt|md`.
  *Aktsepteerimine:* kõik 4 formaati laaditakse alla ja avanevad; markdownis on
  päevakorrapunkte sama palju kui lehel; print-eelvaates on kõik punktid lahti; viide
  sisaldab arhiiviviidet ja lehekülge; JSON-is on `meta.kirjakuju`.

### 3. Täiendused olemasolevatel lehtedel (otsustatud 20.10.2026; ei ole UUS-is)

- **PR-12 VÕIKS — isikuprofiil: "Mainimised protokollides".** Allikas
  `data/protokolli_mainimised.csv` (ET-08). Plokk profiilil pärast osavõtustatistikat:
  "Nimetatud <n> protokollis (<m> korda)" kindlusega kõrge/keskmine, eraldi real
  "lisaks <k> tõenäolist mainimist (<j> protokollis)" registrivälise mitmesuse (`N;None`)
  kohta, HelpTip `ABI.automaatmargendus`. All loetelu protokollidest kronoloogiliselt
  (kuupäev lingina `/protokollid/<id>/?isik=<isik_id>`, koosseisu värviruut, arv).
  Loetelu pikem kui 20 → kokkuklapitav "Näita kõiki". Profiili JSON-eksporti lisandub
  `mainimised_protokollides: { protokolle, kordi, toenaolisi, loetelu[] }`. Isikul, keda
  protokollides ei nimetata, plokki ei kuvata. Silt "automaatne" nagu mujal.
  *Aktsepteerimine:* Ants Piip (128) profiilil on loetelus `1937-09-06` protokoll 2
  korraga; Lui Olesk (116) saab eraldi "tõenäoliste" arvu (`116;None` on sage); 1940–41
  linnavalitsuse liikmetel plokki pole (nad ei ole isikute tabelis).

- **KO-11 VÕIKS — koosoleku detailleht: päevakord.** Allikas `data/paevakorrapunktid.csv`
  (ET-07). Uus sektsioon "Päevakord" (enne OCR-alguse plokki): nummerdatud loend
  pealkirjadest, iga pealkiri link `/protokollid/<id>/#p<nr>`. Kui protokollil punkte
  pole (4 juhtu) → "Päevakorrapunkte ei ole eristatud; vt protokolli täistekst". Kui
  protokolli pole (K336) → sektsiooni ei kuvata. Koosoleku JSON-eksporti lisandub
  `paevakord: [{nr, pealkiri}]`. 1. etapi KO-07 lause "PÄEVAKORDA EI OLE" kaotab
  kehtivuse — uuendada kommentaar koodis ja `README.md`.
  *Aktsepteerimine:* `K175` lehel 11 punkti; `K174` 1 punkt; link avab protokollis õige
  punkti avatuna.

---

## 8. Ekspordi-nõuded (täiendus 1. etapi EX-01…EX-09-le)

- Kehtivad kõik EX-reeglid; uued formaadid txt/md järgivad EX-07 failinime ja EX-08
  metaandmeid (txt/md päises loetavate ridadena).
- JSON-ekspordi `meta` saab lisavõtmed `kirjakuju: "ajalooline" | "moderniseeritud"` ja
  `margendus: "automaatne (est-roberta-hist-ner-for-tccp; est-roberta-hist-quote-extract-for-tccp)"`.
- EX-09 jaluse ZIP: `data/protokollid.csv`, `data/paevakorrapunktid.csv` ja
  `data/protokolli_mainimised.csv` lähevad sisse automaatselt (`zip-data` võtab kõik
  `*.csv`); eeltöödeldud protokolli-JSON-e ZIP-i ei lisata (40 MB).
- Toor-EstNLTK-faile rakendus ei paku (otsustatud); protokolli lehel on link
  "Algne EstNLTK JSON (GitHub)" korpuse faili juurde repos (`korpus/json/<fail>`),
  URL konstandina `lib/protokollid/laadi.ts`-is.

---

## 9. Andmeloogika erireeglid (lisaks 1. etapi reeglitele 1–5)

6. **Protokolli ja koosoleku samasus**: protokolli ID on `koosolek_id`; kõik koosoleku
   metaandmed (vorm, juhataja, kohalolu, koosseis) tulevad CSV-dest, mitte protokolli
   tekstist. Vastuolu (nt K077 aastaarv) kuvatakse protokolli lehel märkusena
   `protokollid.csv.markus`-est.
7. **Automaatsus on alati nähtav**: iga protokollist tuletatud element (olem, isikuseos,
   kõne, moderniseeritud sõna) kannab märget "automaatne" (legend, silt või tooltip),
   sama põhimõte kui 1. etapi "tuletatud". Kindluse sõnavara on sama: kõrge / keskmine /
   mitmene / puudub.
8. **Registriväline mitmesus** (`"N;None"`) lingitakse isikule, aga märgitakse `?`-ga
   (E-01); ≥ 4 kandidaati = sidumata (E-02).
9. **Toorkuju esikohal**: tekstis kuvatakse alati protokolli nimekuju; kanooniline nimi
   ainult tooltipis/ekspordis. Kirjakuju-lüliti muudab teksti, mitte sidumist.
10. **Päevakorrapunkti aadress** on `#p<number>`; kui punkte pole, kasutatakse `#tekst`.
11. **1940–41**: protokollilehel kontekstimärge nagu koosoleku lehel; sidumata nimed
    (Jalak, Taev, Johani, Lange, Mägi jt) on teadlik andmelünk.
12. **Sidumata kõnelejad** (≈ 4 %, nt linnanõunikud Roo, Sinka — polnud volinikud)
    kuvatakse nimena ilma lingita; eraldi "muude isikute" registrit ei looda.
13. **`koosolek_id` ei ole enam rangelt kronoloogiline** (K338 = 13.11.1940); kõik
    järjestused käivad `kuupaev` (+ `koosolek_id` teisese võtmena) järgi.

---

## 10. Muudatused olemasolevates failides ja uued failid

**Muudetakse**
- `data/koosolekud.csv` (AP-01 K026, AP-02 K338), `data/osavott.csv` (AP-01 kuupäev),
  `data/README.md` (AP-01…AP-03, uued failid, 338 koosolekut).
- `package.json`: skriptid `eeltootle`, `eeltootle:kui-vaja`, `prebuild`; devDependency `tsx`.
- `.gitignore`: `public/protokollid/` (genereeritud; otsustatud mitte commitida);
  `public/pildid/` commititakse (O-14), gitignore'i **ei** lähe (*27.10.2026*).
- `next.config.ts`: muutusi ei eeldata; `tsconfig.json` `exclude` += `korpus`, `scripts`
  (kui skript ei peaks lehe-tüübikontrolli alla minema — otsustada; `scripts` pigem jätta sisse).
- `components/Nav.tsx` (IN-01), `app/koosolekud/[id]/page.tsx` (IN-02, KO-11),
  `app/isikud/[id]/page.tsx` (PR-12), `lib/derive.ts` (PR-12 agregaat profiilile),
  `components/KoosolekudVaade.tsx` (IN-03 + üldistus PT-01 jaoks: `lisaveerud`, `reaLink`,
  `naitaDiagrammi`), `components/GlobalSearch.tsx` (IN-04), `lib/abitekstid.ts` (IN-05),
  `lib/colors.ts` (IN-06), `lib/types.ts` (uued tüübid võib ka eraldi faili),
  `lib/data.ts` (laeb `data/protokollid.csv`, `data/paevakorrapunktid.csv`,
  `data/protokolli_mainimised.csv` → `Andmestik.protokollid / paevakord / mainimised`),
  `components/ProfiilTegevused.tsx` (üldistus: nuppude loend propina) või uus komponent,
  `app/globals.css` (print-stiilid plokkide avamiseks, allajoonituse stiilid),
  `README.md`, `data/README.md`, `CLAUDE.md`.

**Uued**
```
scripts/eeltootle-protokollid.ts
scripts/protokollid-vasted.json
data/protokollid.csv                       (genereeritud, commititud)
data/paevakorrapunktid.csv                 (genereeritud, commititud)
data/protokolli_mainimised.csv             (genereeritud, commititud)
public/protokollid/…                       (genereeritud, gitignore)
korpus/json/*.json                         (toorkorpus, commititud, 374 MB)
data/protokolli_lehed.csv                  (sisend, commititud; 27.10.2026)
public/pildid/1200/<aasta>/*.png           (304 MB; commititud, O-14; 27.10.2026)
public/pildid/300/<aasta>/*.png            (40 MB; 27.10.2026)
scripts/teisenda_pildid.py                 (olemas; ei käivitata buildis)
lib/protokollid/lehed.ts                   lehtede sidumine (ET-09), pildi/Transkribuse URL, aktiivneLeht() (27.10.2026)
components/ParalleelVaade.tsx              kahe paneeli paigutus, jaotur, mobiili sakid, sünkroonimine (PT-05)
components/LehePilt.tsx                    pilt + suurendus/lohistamine + eelmine/järgmine
components/LehtedeRiba.tsx                 eelvaadete riba (300-PNG, lazy)
components/LeheMarker.tsx                  "lk <lk>" marker tekstivoos
lib/protokollid/types.ts                   ProtokollAndmed, OtsinguKild, Olem, Kone …
lib/protokollid/sidumine.ts                parsiCouncilMemberId(), kindlus(), seoKoneleja()  (SD-02, SD-03)
lib/protokollid/vasted.ts                  failinimi → koosolek_id (SD-01)
lib/protokollid/segmendid.ts               plokid (sissejuhatus/punktid/lõpuosa/lisad), segmentrenderdaja sisend
lib/protokollid/kirjakuju.ts               normid-asenduste rakendamine + vahemike nihutamine (PT-08)
lib/protokollid/otsing.ts                  päringu normaliseering, tabamused, kontekst (PT-02, PT-10)
lib/protokollid/otsing.worker.ts           Web Worker
lib/protokollid/viide.ts                   viitestring (PT-09)
lib/protokollid/eksport.ts                 txt/md koostamine (PT-09)
lib/protokollid/laadi.ts                   basePath-teadlik fetch public/protokollid/…
app/protokollid/page.tsx                   PT-01, PT-02, PT-06, PT-07, PT-10
app/protokollid/[id]/page.tsx              PT-03, PT-04, PT-05 (paralleelvaade), PT-08, PT-09
components/ProtokollTekst.tsx              plokid + annoteeritud tekst (klient: lüliti, tooltipid, popover)
components/OlemiLegend.tsx
components/TaistekstOtsing.tsx
components/ProtokollTegevused.tsx          eksport + viide
lib/protokollid/*.test.ts                  testid (ptk 11, sh lehed.test.ts)
```

---

## 11. Testinõuded (vitest, `lib/**/*.test.ts`)

Ühiktestid sünteetiliste andmetega (töötavad ilma korpuseta):

- **TE-01 vasted (SD-01)**: `D.json` → ainus rida; `D_2.json` + kaks rida → suurem ID,
  sufiksita → väiksem; `D1_D2.json` → rida, `kuupaev_lopp` erinevus annab hoiatuse, mitte
  vea; ülekirjutus võidab automaatreegli; `null`-ülekirjutus = sidumata; kaks faili
  samale koosolekule → viga; failinimi ilma CSV-kuupäevata → viga.
- **TE-02 council_member_id (SD-02)**: `"None"`+`no_match` → puudub; `"128"`+`exact` →
  kõrge, isik 128; `"128"`+`exact;ocrmistake` → keskmine; `"82;None"` → isik 82,
  mitmene; `"38;39;None"` → isik null, kandidaadid [38,39], mitmene; `"258;290"` →
  [258,290]; 27 ID-d → puudub, kandidaadid []; tundmatu ID → viga.
- **TE-03 kõneleja (SD-03)**: kõneleja vahemik kattub PER-olemiga → sama sidumine;
  kaks kattuvat → pikim kattuvus; kattuvust pole → sidumata, nimi `speaker_name`.
- **TE-04 plokid**: punktid + sissejuhatus + lõpuosa + lisad katavad teksti ilma
  kattumiseta; ilma punktideta protokoll → üks plokk; lisa pärast viimast punkti
  eraldatakse lõpuosast; pealkiri on punkti sees.
- **TE-05 segmentrenderdaja**: olem kõne sees → pesastatud; olem üle kõnetüki piiri →
  kaheks; mitmetükiline kõne → vahelehüüe tavatekstina; segmentide tekst kokku ==
  algtekst (ükski märk ei kao ega kordu).
- **TE-06 base_span teisendus**: `[[a,b],[c,d]]` → `[a,d]`; `[a,b]` → `[a,b]`.
- **TE-07 kirjakuju**: asendused rakenduvad; identne `normalized_form` on välja
  filtreeritud; olemi vahemik nihkub õigesti, kui enne seda muutub pikkus
  ("linnawolikogu"→"linnavolikogu" pikkus sama; "lnw"→"lnv" sama; sünteetiline
  pikkusevahe test).
- **TE-08 otsing**: `normalizeOtsing("Walimine") === normalizeOtsing("valimine")`;
  diakriitika ("hääletamine" vs "haaletamine"); tabamuse lause leidmine
  binaarotsinguga; kontekst ±1 teksti alguses/lõpus; `laused_tyybid` bitmask arvutus;
  min 3 märki.
- **TE-09 viide**: ilma punktita ja punktiga; kahepäevane kuupäev; leheküljevahemik.
- **TE-10 eksport**: markdownis `## <nr>. <pealkiri>` iga punkti kohta; txt päises
  arhiiviviide; JSON `meta.kirjakuju`.
- **TE-13 mainimiste agregaat (ET-08/PR-12)**: sünteetilised olemid → read
  (isik, protokoll, kindlus, arv); `N;None` läheb "mitmene" alla; mitme kandidaadiga
  olem ei loe ühelegi isikule; kõneleja-olem loetakse üks kord.
- **TE-14 päevakorrapunktide pealkiri (ET-07)**: "1. Protokoll." → "Protokoll.";
  "I.\nWolikogu juhataja awasõna" → "Wolikogu juhataja awasõna"; pealkiri ilma
  numbrita jääb samaks.
- **TE-15 liikmelisus pärast AP-01/AP-02** (`lib/derive.test.ts` täiendus): K026 uuel
  kuupäeval kuulub koosseisu 1919-1921 ja `tuletatudKohalolijad` annab tulemuse; K338
  koosseis 1940-1941; koosolekute arv andmestikus 338.
- **TE-16 lehtede sidumine (ET-09; 27.10.2026)**: sünteetiline `textline_info` + CSV read →
  `Leht[]` õiges `jrk` järjekorras; tekstita rida saab `algus = lopp = null` ja jääb
  oma kohale; jagatud lehed (sama `pilt` kolmel real) → `jagatud = true`, eraldi
  vahemikud; `xml_file`, mida CSV-s pole → viga; CSV rida, mille `xml_file` pole korpuses →
  viga; `jrk` lünk → viga; kattuvad vahemikud → viga.
- **TE-17 Transkribuse ja pildi URL (ET-05; 27.10.2026)**:
  `…/document/3016346/pages/26` + `transkribus_lk=31` → `…/pages/31`; arhiivi lk `112`
  **ei** satu URL-i; `134a` → `…/pages/134`; pildi URL = `basePath + /pildid/1200/ +
  pilt` ja eelvaade `/pildid/300/`; esimese lehe `transkribus_lk` ≠ URL-i lõpp → viga.
- **TE-18 aktiivse lehe määramine (PT-05; 27.10.2026)**: `aktiivneLeht()` — kerimiskoht
  enne esimest markerit → 1. leht; markerite vahel → viimane ülalpool; ainult nähtavad
  markerid loevad (kokkuklapitud punkti markerid välja); tekstita leht ei saa kerimisest
  aktiivseks (ainult valides); `?lk=` kehtetu väärtus → `null`; lehe valimisel
  tagastatakse avatavate plokkide loend (punkt, milles leht algab; tekstita lehel
  eelmise lehe punkt).

Integratsioonitestid (käivituvad ainult, kui `korpus/json` on olemas; `describe.skipIf`):

- **TE-11 näidisfailid**: `1937-09-06.json` → 0 punkti, 18 PER, 128 kaks korda;
  `1920-02-29_1920-03-30.json` → K026 (ülekirjutus), 20 punkti;
  `1930-09-08_2.json` → K175; `1925-06-25.json` → K077 (ülekirjutus);
  `1940-11-13.json` → K338 ja `1940-11-13_2.json` → K329, mõlemal 0 kõnet;
  `1930-10-27.json` → 152 kõnet, 11 punkti; `1937-03-22.json` → 7 punkti, 4 lisa, 52 tabelit.
- **TE-12 kogu korpus**: 337 faili → 337 seotud, 0 sidumata; K336 ilma protokollita;
  kõik ID-d ⊂ isikud.csv; iga koosolek ≤ 1 protokoll; `protokollid.csv` 337 rida;
  `paevakorrapunktid.csv` 3 511 rida; väljundi kogumaht (ilma piltideta) < 50 MB.
  *(27.10.2026)* Lehed: 7 121 `Leht`-kirjet, 7 093 tekstiga, 28 tekstita 23 protokollis;
  `K004` lehed 112–117 ↔ Transkribus 26–31; `K143` lk 38 tekstita; `K225` 134/134a/134b
  sama pilt; `K266` 93 lehte; iga `pilt` on olemas mõlemas kaustas (kui pildid on kloonis).

Käsitsi kontroll (dokumenteerida PR-is): `K174` vs `K175` ja 1940. a paarid õiges
järjekorras protokollinumbri järgi; `K077` lehel on märkus aastaarvu vastuolust; `K026`
kuvatakse 29.–30.03.1920; suurima lehe `out/` maht (ptk 6 piir); Lighthouse
ligipääsetavus protokollilehel ≥ 90; *(27.10.2026)* `K004` lk 112 Transkribuse link avab
õige lehe (26) brauseris; `du -sh out/` < 1 GB; võrgupaneelil laetud piltide arv lehe
avamisel ≤ 1 + nähtavad eelvaated.

---

## 12. Kvaliteedinõuded

- Responsiivne: protokollitekst loetav mobiilis (max laius ~70 tähemärki, lüliti ja
  legend kokkuklapitavad); tabelid kerivad horisontaalselt.
- Ligipääsetavus: plokid natiivse `<details>`-ina või `button[aria-expanded]`; olemi
  `<span>`-il `tabindex`-vaba, aga tooltip avaneb ka fookusest linkidel; värv ei ole
  ainus tunnus (IN-06); legendis tekstiline seletus; otsingutulemustel `aria-live`
  kokkuvõte; `lang="et"` jääb.
- Jõudlus: protokollileht renderdab ilma nähtava viivituseta ka 2 348 olemiga (`1937-03-22`);
  otsing ei blokeeri UI-d (Worker); killud laetakse ainult vajaduse järgi.
- Kõik 337 protokollilehte genereeritakse staatiliselt; build ei tohi kasvada
  üle 5 min; `out/` kogumaht dokumenteeritakse README-s.
- *(27.10.2026)* Pildid: igal `<img>`-il sisukas `alt`; eelvaated `loading="lazy"`;
  suurendus/lohistamine töötab ka klaviatuuriga (+/−/nooled fookuses paneelis);
  paneelide jaotur on klaviatuuriga liigutatav või asendatav laiuse valikuga; pilt ei
  blokeeri teksti lugemist (laadimise ajal reserveeritud kõrgus, ei hüppa).
- Keel: kogu kasutajaliides eesti keeles (tüübinimed PER→isik jne tõlgitakse;
  korpuse tehnilised väärtused jäävad ekspordi JSON-i inglise kujul).

---

## 13. Teadlikud piirangud, välja jäetud ja otsused

### Välja jäetud sellest etapist (ÄRA ehita)
- Kaardileht ja geokodeerimine; nimekirjade kanoniseerimine (jätkuvalt eraldi tööfail).
- Kaudkõned (korpuses eemaldatud), `manual_*_arhiivipraktika` kihid, `speech_chunks`.
- Toorkorpuse (EstNLTK JSON) allalaadimine rakendusest — ainult link GitHubi faili juurde.
- *(27.10.2026)* TIF-originaalid (949 MB) repos või väljundis; halltoon- või
  värvipildid; rea/sõna esiletõstmine pildil (koordinaate `textline_info`-s pole);
  piltide teisendus buildi ajal (`teisenda_pildid.py` käivitatakse käsitsi); 219
  protokollidega sidumata pilti (kaaned, tiitellehed); IIIF/sügavsuum-teenus.
- Kuupäevade esiletõstmine ja kuupäeva-kategooria filter (PT-04, PT-07) — automaatkihis
  DATE-tüüpi pole; regulaaravaldis-heuristikat ei ehitata.
- Eraldi nimepõhine kõneleja-sidumine ja "muude isikute" register (linnanõunikud jt).

### Teadlikud piirangud (kuvada kasutajale sobivas kohas)
- Automaatmärgendus on vigadega (NER-mudel, kõnetuvastus, isikute linkimine); 1940–41
  perioodil kõnesid ei tuvastatud ja volinikke pole, seega sidumata nimesid on palju.
- `normalized_form` katab vaid osa vana kirjaviisi sõnu; moderniseeritud kuju on segakuju.
- Kahe sama päeva protokolli vaste tugineb protokollinumbrile `protokolli_algus_txt`-is
  ja on fikseeritud käsitsi tabelis `scripts/protokollid-vasted.json`.
- K026 kuupäev on parandatud korpuse teksti põhjal (29.–30.03.1920); K077 protokolli
  tekstis on vale aastaarv (1925 pro 1923) — mõlemal lehel märkus.
- K338 (protokoll nr 28, 13.11.1940) on lisatud korpuse, mitte algse
  `TLV_koosolekud.xlsx` põhjal.
- *(27.10.2026)* Lehepildid on 1200 px mustvalged koopiad; 28 tekstita lehte kuvatakse
  pildina ilma tekstita; jagatud lehtedel (134/134a/134b, 254/254a/254b) on üks pilt
  mitme tekstilõigu kohta; tekst–pilt sünk on lehe täpsusega, mitte rea täpsusega;
  Transkribuse lehenumber erineb arhiivi lk-st (säilik 57) ja seda ei kuvata kasutajale
  numbrina, ainult lingina.

### Otsused 20.10.2026 (andmestiku omanik kinnitas kõik soovitused)

| Nr | Küsimus | Otsus |
|---|---|---|
| O-01 | K026 kuupäevad (CSV 29.02.1920 / 30.02.1920 vs protokoll "29 ja 30 märtsil") | Parandada CSV-s 1920-03-29 / 1920-03-30 (AP-01); korpuse faili ümber ei nimetata |
| O-02 | Protokoll nr 28 (13.11.1940) ilma koosolekureata; K336 ärakiri | Lisada uus rida K338 (AP-02); K336 jääb märkega "ärakiri" (AP-03) |
| O-03 | 1940. a sama päeva paarid (26.09, 11.10, 05.11) | Arendaja kontrollib protokollinumbri järgi ja fikseerib vasted tabelis |
| O-04 | Korpus (374 MB) repos | Tavaline git `korpus/json/`; `public/protokollid/` genereeritakse buildis, gitignore |
| O-05 | PT-09 "JSON tervikuna" | Rakenduse struktureeritud JSON; toorfailile link GitHubi |
| O-06 | Protokollilehe maht > 2 MB | Eelistada staatilist lehte; kliendipoolne laadimine ainult siis, kui piir ületatakse |
| O-07 | Kuupäevad (PT-04/PT-07) | Jätta välja |
| O-08 | PT-05 originaalipilt | **Asendatud 27.10.2026:** pildid on olemas → PT-05 on PEAB, tekst ja lehepilt kõrvuti (vt PT-05, ET-09, ptk 3.6). Varasem otsus "ainult lingid" ei kehti. |
| O-09 | "Lõik" otsingukontekstis (PT-10) | Asendus "±2 lauset" |
| O-10 | Isikuprofiili "Mainimised protokollides" | Teha, VÕIKS (PR-12) |
| O-11 | Koosoleku lehe päevakord | Teha, VÕIKS (KO-11) |
| O-12 | PT-01 "sõnade maht" | Sõnade arv (kirjavahemärkideta); kB ainult ekspordis |
| O-13 | Sidumata kõnelejad (~4 %) | Nimena ilma lingita; eraldi käsitlust pole |

### Kinnitatud eeldused (E-01…E-11)
E-01 "N;None" lingitakse `?`-ga · E-02 ≥ 4 kandidaati = sidumata · E-03 sõnade arv =
tähte/numbrit sisaldavad `words`-spanid · ~~E-04 `xml_file` → `ERA.2966.2.74`~~ (asendatud 27.10.2026: arhiiviviide tuleb `protokolli_lehed.csv`-st, ET-05) ·
E-05 OCR-alguse plokk jääb koosoleku lehele · E-06 globaalne otsing viitab täistekstotsingule,
ei tee seda ise · E-07 protokollide lehel pole sagedusdiagrammi · E-08 "lõik" = ±2 lauset ·
E-09 OCR-ridade liitmine lõigus, tabelites säilitamine · E-10 organisatsiooni klõps =
täistekstiotsing · E-11 markdownis olemeid ei märgita.

### Eeldused 27.10.2026 (E-12 kinnitatud = O-14; E-13…E-15 kinnitamata)
- **E-12** → **O-14 (otsustatud 27.10.2026):** PNG-d hoitakse rakenduse repos tavalises
  gitis kaustas `public/pildid/` (põhjendus all, endine L-13).
- **E-13** Paneelide vahel on lohistatav jaotur; kui see osutub ligipääsetavuse
  mõttes keerukaks, piisab kolmest laiusvalikust (tekst / pooleks / pilt).
- **E-14** Tekstita leht asetatakse tekstivoos eelmise lehe lõppu ja kerimisel ta
  aktiivseks ei saa (ainult valides) — nii ei "hüppa" pilt tekstita lehele lugemise ajal.
- **E-15** Pildipaneel on töölaual vaikimisi avatud; UUS ("külg-küljel") ei ütle, kas
  vaikimisi või valikuna.

### Otsus O-14 ja lahtised küsimused (27.10.2026)
- **O-14 (otsustatud) Kus hoida PNG-sid (344 MB)?** **Tavaline git, kaust
  `public/pildid/`, samas repos.** Põhjendus: (1) Git LFS ei sobi — tasuta kvoot
  on 1 GB kuus nii hoidlale kui allalaadimisele, ja GitHub Actions laeks 344 MB igal
  deploy'l (`checkout` + `lfs: true`), st kolmas deploy kuus ületab kvoodi; (2) tavaline
  git: PNG-d on juba tihendatud, repo kasvab ≈ 344 MB (koos korpusega ≈ 0,5–0,7 GB
  pakituna), mis on GitHubi soovitusliku 1 GB piiri sees; `actions/checkout` teeb
  vaikimisi `depth: 1`, Actionsi allalaadimine ei ole LFS-i moodi mõõdetud; `out/` ≈
  0,55 GB < 1 GB Pagesi piir; suhtelised URL-id (`basePath`) töötavad ka lokaalses
  arenduses ilma lisaseadistuseta; (3) alternatiiv, kui repo peab jääma kergeks:
  **eraldi GitHub Pagesi repo ainult piltidele** (nt `ut-history-archaeology/tlv-pildid`),
  rakenduses konstant `PILTIDE_BAAS_URL`; pildid deploy'takse ainult muutumisel,
  põhirepo jääb < 400 MB; miinus: kaks repot ja absoluutsed URL-id (CORS-i `<img>`
  ei vaja). Riskid tavalise giti variandiga: piltide uuesti genereerimine (nt teine
  lahutus) kahekordistab ajaloo; sel juhul puhastada ajalugu või minna üle (3)-le.
  Tagajärjed: `.gitignore` ei muutu piltide osas, `deploy.yml` ei muutu,
  `lib/protokollid/laadi.ts` kasutab `basePath + /pildid/…`. Pildid commitida ühe eraldi
  commitiga (lihtsam hiljem asendada).
- **L-14** Kas 219 protokollidega sidumata pilti (kaaned, tiitellehed) tuleks siiski
  väljundisse jätta (nt säiliku vaate jaoks tulevikus)? Eeldus: ei, eemaldada enne
  commiti (ET-09 p 6) — säästab ≈ 10 MB ja väldib "orbpilte".
- **L-15** Kas protokolli_lehed.csv jääb käsitsi hooldatavaks sisendiks või
  genereeritakse see tulevikus skriptiga (Transkribuse metaandmetest)? Eeldus: sisend;
  eeltöötlus ainult valideerib (ET-06).

Kui arenduse käigus ilmneb uus vastuolu (nt mõni `council_member_id` puudub
`isikud.csv`-s või 1940. a paar ei klapi protokollinumbriga), ei lahendata seda
koodis heuristikaga — see kirjutatakse `README.md` jaotisse "Lahtised andmeküsimused"
ja esitatakse andmestiku omanikule.

---

## 14. Soovitatav töö järjekord

0. Andmeparandused AP-01…AP-03 (`koosolekud.csv`, `osavott.csv`, `data/README.md`,
   kõvakodeeritud "337"); `npm test` roheline (TE-15).
1. `korpus/json` + `scripts/eeltootle-protokollid.ts` + `protokollid-vasted.json`
   (sh 1940. a paaride käsitsi kontroll, O-03); ET-06 valideerimine roheline;
   `data/protokollid.csv`, `paevakorrapunktid.csv`, `protokolli_mainimised.csv` commit.
   Testid TE-01…TE-03, TE-06, TE-11…TE-14.
2. `lib/protokollid/*` puhtad funktsioonid (segmendid, kirjakuju, otsing, viide, eksport)
   + testid TE-04, TE-05, TE-07…TE-10.
3. `/protokollid/[id]` (PT-03, PT-04, PT-09) + IN-01, IN-02, IN-05, IN-06; mõõta lehe maht.
3a. *(27.10.2026)* `public/pildid/` paika (O-14); ET-09 eeltöötlusse + TE-16, TE-17;
   `lib/protokollid/lehed.ts`, `LeheMarker` tekstivoos; seejärel `ParalleelVaade`,
   `LehePilt`, `LehtedeRiba`, sünkroonimine + TE-18; `du -sh out/` kontroll.
4. `/protokollid` (PT-01, PT-06, PT-02) + IN-03; Worker ja killud.
5. VÕIKS/VÕIB järjekorras: KO-11, PR-12, PT-08, PT-07, PT-10, IN-04.
6. README/data/README/CLAUDE.md uuendus; käsitsi kontrollid (ptk 11 lõpp).
