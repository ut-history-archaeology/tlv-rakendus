Ehitame Next.js rakendust Tartu Linnavolikogu 1917–1941 andmestikule.  
Lähteülesanne: CLAUDE_CODE_ULESANNE.md (1. etapp, loe esimesena), CLAUDE_CODE_ULESANNE_2.md (2. etapp: protokollide leht, loe enne protokollidega töötamist), CLAUDE_CODE_ULESANNE_3.md (3. etapp: UI parandused; protokollide nimekiri on nüüd `/koosolekud`, isanime ja AKL ID-d ei kuvata, kuid need jäävad CSV-sse), CLAUDE_CODE_ULESANNE_4.md (4. etapp: andmeuuendus 12.11.2026, kanoonilised nimekirjad, valimiste kaart allikaviidetega, parandused, kontrollleht `/kontroll`) ja CLAUDE_CODE_ULESANNE_5.md (5. etapp: minimalistlik avaleht, isikute nimekiri ja isiku leht route group'is `app/(lihtne)/` ilma Nav-ita; teised lehed `app/(tavaline)/`; kaardinõuded tühistatud).  
Avalehe kirjeldus on failis `content/avaleht.md` (omanik muudab ainult seda faili; `lib/sisu.ts`).  
Andmeuuenduse faktid ja otsused: ANDMEUUENDUS_2026-11_RAPORT.md. Andmevoog ja tuletusreeglid: ANDMETOOTLUSE_ULEVAADE.md.  
Viitekujud: VIITED.md. Arhiiviviide on link `https://www.ra.ee/dgs/_purl.php?shc=<viide>`; number pärast `:` on digikaader (mitte lehekülg), mitme kaadri puhul link esimesele.  
Andmesõnastik: data/README.md (loe enne andmetega töötamist).  
Algandmed: andmed_excel/_.xlsx → `npm run andmed` (scripts/excel-csv.py) → data/_.csv (commititakse). Parandused scripts/andmeparandused.json, isikute ID-aliased scripts/isik-aliased.json, nimekirjade vasted scripts/nimekirjad-vasted.csv, protokollide vasted scripts/protokollid-vasted.json. data/\*.csv-d ei muudeta käsitsi.  
Protokollikorpus: korpus/json/ (toor-EstNLTK, ei lähe väljundisse ega muudeta); eeltöötlus `npm run eeltootle` → public/protokollid/ (gitignore); lehepildid public/pildid/ (gitis).  
Kasutajaliidese keel on eesti keel.  
Andmevastuolusid ei lahendata koodis heuristikaga — need kirjutatakse README.md jaotisse "Lahtised andmeküsimused" ja on nähtavad kontrolllehel `/kontroll` (ei ole menüüs).
