# Rakenduses kasutatud viited — loetelu vormistusreeglite küsimiseks

Seis 28.10.2026, repo commit `96d119f`. Iga rea kohta on vaja andmestiku omanikult
vastust veergu **„Kuidas viidata?“**: kuidas viide kuvada (täiskuju / lühend / seletus),
kas ja kuhu linkida, kuidas see peaks välja nägema tsitaadis („Kopeeri viide“) ja
ekspordis. Loetelu on koostatud `data/*.csv` ja koodi põhjal; arvud on kontrollitud.

Lühendid: F = fond, N = nimistu, S = säilik, L = leht (nt `ERA.5130.4.417:293` =
ERA, F 5130, N 4, S 417, L 293 — **eeldus**, palun kinnitada).

## A. Arhiiviviited

| Nr | Liik | Allikas (fail, veerg) | Kuju ja näide | Arv | Kus kuvatakse praegu | Praegune vormistus | Kuidas viidata? |
|---|---|---|---|---|---|---|---|
| A1 | Isiku arhiiviviited — valimisnimekirjade/kartoteekide säilikud | `isikud.csv`, `arhiiviviited` (komaga eraldatud) | `ERA.5130.4.417:293` (F.N.S:L); fondid: **ERA.5130.4** (211 viidet), **ERA.4414.2** (62), **TLA.1483.1** (24), ERA.5212.3 (3), EAA.5482.3 (2), TLA.1483.2 (2), ERA.5130.11 (1), ERA.5155.4 (1), ERA.5253.4 (1), LVMA.866.3 (1) | 257 isikul, 308 viidet | isiku lehe päis ("Arhiiviviited: …"), isikute tabeli eksport, profiili JSON | toortekst, lingita, fondi nime ei seletata | |
| A1a | — ebatüüpilised kujud | sama | `ERA.5130.4.422:473;ERA.4414.2.1257:7` (semikoolon komaga asemel), `ERA.5130.4.481>817` (`>` kooloni asemel) | 2 | sama | kuvatakse nagu on | kas parandada andmetes? |
| A2 | Koosseisu valimiste säilikud | `koosseisud.csv`, `valimised_allikas` | `ERA.2966.2.197`; `ERA.2966.2.195,ERA.2966.2.196,ERA.2966.2.197`; `ERA.2966.2.202,EAA.2111.1.13617` (F.N.S, ilma leheta) | 8 koosseisu, 12 säilikut | koosseisu lehe päis ("Arhiiviviited: …" koos A3/A4-ga ühes reas), koosseisude JSON | toortekst, lingita | |
| A3 | Valimistulemuste allikas (trükiallikas) | `koosseisud.csv`, `valimistulemuste_allikas` | `Riigi Teataja, nr. 51, 2 august 1919`; `Riigi Teataja Lisa; 4 1930-01-14`; `Postimees 17.10.1939`; `Eestimaa Kubermangu Teataja, nr. 35, 31 august 1917` | 8 | koosseisu lehe päis; 3. etapis ka isiku valimiste kaardi allikarida (UX-03) | toortekst, eri kujud (koma/semikoolon, kuupäeva vorm) | ühtne kuju? link DIGAR-i/dea.digar.ee-le? |
| A4 | Kandidaatide nimekirja allikas (trükiallikas) | `koosseisud.csv`, `kandidaatide_allikas` | samad väljaanded kui A3 (5 koosseisul; 1921, 1927, 1930 tühi) | 5 | sama | sama | |
| A5 | Liikmesmuutuse allikaviide — protokolli säilik ja leht | `muutused.csv`, `allikaviide` | `ERA.2966.2.68:4` (F.N.S:L); säilikud ERA.2966.2.57…94 ja `ERA.2966.9.8`; alati täidetud | 633 rida, 106 erinevat | koosseisu lehe muutuste eksport, isiku JSON; 3. etapis sündmuste tabeli veerg (UX-06) | toortekst, lingita; **saab linkida rakenduse enda protokollilehele** `/protokollid/<id>/?lk=<L>` (säilik+leht → `protokolli_lehed.csv`) | kas linkida sisemiselt ja/või Transkribusesse? |
| A6 | Liikmesmuutuse protokolliviide kuupäevana | `muutused.csv`, `liitus_prot`, `lahkus_prot`, `ryhmavahetus_prot`, `peatatud_prot` | `04.12.1918` (koosoleku kuupäev) | 633 | isiku lehe muutuste tabel ("Protokolliviide"), eksport | toortekst; ei ole link koosolekule, kuigi kuupäev → `koosolek_id` on üheselt leitav (v.a sama päeva 2 protokolli) | linkida koosoleku/protokolli lehele? |
| A7 | Protokolli arhiiviviide (säilik) | `protokollid.csv` / `protokolli_lehed.csv`, `arhiiviviide` + `lehekulg` | `ERA.2966.2.74`, lk `339`; 23 säilikut: ERA.2966.2.57, 59–64a, 66–68, 70, 71, 74, 77, 79, 81, 83, 85, 87, 89, 91, 94 ja ERA.2966.9.8 | 337 protokolli, 7 121 lehte | protokollilehe päis, pildipaneel ("lk 339 / 339–387 · ERA.2966.2.74"), tsitaat, txt/md/JSON eksport, koosolekute tabeli eksport | `Rahvusarhiiv, ERA.2966.2.74, lk 339–387` (tsitaadis) | fondi/säiliku pealkiri juurde? (nt "Tartu Linnavolikogu protokollid 1930") |
| A8 | Transkribuse dokument ja lehekülg | korpus `meta.transcribus_url`; `protokolli_lehed.csv`, `transkribus_lk` | `https://rahvusarhiiv.transkribus.eu/document/3016523/pages/339`; 23 dokumenti (3016172 … 3016803) | 337 protokolli | protokollilehe päis ("Ava Transkribuses ↗"), pildipaneel iga lehe juures, tsitaat ("Transkribus: <URL>"), txt/md/JSON eksport, koosolekute eksport | täis-URL | kas tsitaati jätta? kas nimetada "Rahvusarhiivi Transkribus"? |

## B. Välised identifikaatorid

| Nr | Liik | Allikas | Kuju ja näide | Arv | Kus kuvatakse | Praegune vormistus | Kuidas viidata? |
|---|---|---|---|---|---|---|---|
| B1 | Wikidata | `isikud.csv`, `wikidata` | täis-URL `https://www.wikidata.org/wiki/Q12370898` | 99 isikut | isiku lehe päis, isikute eksport, profiili JSON | link on **vigane** (URL liidetakse kaks korda) — parandus UX-02; kuvatekst "Wikidata: Q…" | kuvada QID või pealkiri "Wikidata"? |
| B2 | AKL ID | `isikud.csv`, `AKL_ID` | `36.0`, `38.0`, `48.0` … (Exceli ujukomajäänus) | 14 isikut | ainult ekspordis/JSON-is; lehel ei kuvata | — | **mis register see on ja kas on link?** (K3-01) |

## C. Andmestiku enda viide ja vastutus

| Nr | Liik | Kus | Praegune tekst | Kuidas viidata? |
|---|---|---|---|---|
| C1 | Andmestiku viide ekspordis ja tsitaadis | `lib/export.ts` `ALLIKAS`, `components/ProfiilTegevused.tsx`, `lib/protokollid/eksport.ts`, `lib/protokollid/viide.ts` | `Tartu Linnavolikogu andmestik, 2026` | täpne nimi, autorid/asutus (Tartu Ülikool, ajaloo ja arheoloogia instituut?), versioon, URL, DOI? |
| C2 | Jalus | `components/Footer.tsx` | `Andmeallikad: Tartu Linnavolikogu andmestik, 2026; Rahvusarhiiv.` | kas lisada Rahvusarhiivi fondi viide, projekti nimi, rahastaja, litsents? |
| C3 | Avaleht | `app/page.tsx` | „… liikmesmuutust Rahvusarhiivi protokollide põhjal.“ | |
| C4 | Protokolli tsitaat („Kopeeri viide“) | `lib/protokollid/viide.ts` | `Tartu Linnavolikogu protokoll, 27. oktoober 1930[, päevakorrapunkt 3]. Rahvusarhiiv, ERA.2966.2.74, lk 339–387. Transkribus: <URL>. Tartu Linnavolikogu andmestik, 2026, <lehe URL>#p3 (vaadatud 28. oktoober 2026).` | soovitud tsitaadi kuju (nt arhiivi ametlik viitamisjuhis: „RA, ERA.2966.2.74, l. 339“?) |
| C5 | Korpuse toorfaili link | `lib/protokollid/laadi.ts` `KORPUS_GITHUB_BAAS` | `https://github.com/ut-history-archaeology/tlv-rakendus/blob/main/korpus/json/<fail>` | kas viidata hoopis Rahvusarhiivi/TÜ korpuse avaldamiskohale? |
| C6 | Automaatmärgenduse mudelid (JSON-ekspordi `meta.margendus`) | `lib/protokollid/eksport.ts` `MARGENDUS` | `automaatne (est-roberta-hist-ner-for-tccp; est-roberta-hist-quote-extract-for-tccp)` | kas lisada mudelite täisviited (HuggingFace URL, autorid), EstNLTK, Transkribus? |
| C7 | Lehepildid | pildipaneeli jalus (`ParalleelVaade`) | „Originaalid: Rahvusarhiiv, ERA.2966; täislahutuses Transkribuses“ | pildi autoriõiguse/kasutusõiguse märge? |

## D. Viited, mida andmetes on, aga rakendus ei kuva

| Nr | Liik | Allikas | Märkus |
|---|---|---|---|
| D1 | `valimised.csv`, `märkused` | 6 real, nt vaba tekst 1939 eemaldamise kohta | ei kuvata; UX-03 hakkab kuvama "Märkused" reana |
| D2 | `muutused.csv`, `täpsustus` | nt „walitud linnawolikogu liikmeteks“ | kuvatakse isiku lehel kärbituna |
| D3 | `koosolekud.csv`, `kuupaev_txt`, `protokolli_algus_txt` | OCR-toortekst | koosoleku leht (kokkuklapitav), eksport |

## Küsimused omanikule kokkuvõtvalt

1. Arhiiviviidete **kuju**: jätta `ERA.2966.2.74:339` või ametlik `RA, ERA.2966.2.74, l. 339`? Kas fondidele lisada nimetus (seletus hover'il)?
2. **Lingid**: kas arhiiviviited (A1, A2, A5, A7) peaksid viima AIS-i / Saaga / Transkribusesse, kui vastav URL on olemas? Milline URL-i muster?
3. Trükiallikad (A3, A4): ühtne kuju ja kas linkida DIGAR-isse?
4. Andmestiku enda viide (C1, C2, C4): täpne tsitaadikuju, versioon, URL, litsents.
5. AKL ID (B2): mis see on?
6. Kas A1a kaks vigast kuju parandada `isikud.csv`-s (andmeparandus, mitte koodis)?
