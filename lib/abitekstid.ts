/** Kontekstuaalse abi tekstid keerukate mõistete juurde. */
export const ABI = {
  koosseis:
    "Koosseis on ühe valimisperioodi volikogu — nt 1921–1923 koosseis valiti 1921. aasta valimistel ja töötas kuni järgmiste valimisteni.",
  nimekiri:
    "Valimisnimekiri, milles isik kandideeris. Näidatakse ühtlustatud (kanoonilist) nime; allikas esinev nimekuju on näha hiirega osutades ja ekspordis.",
  nimekiriKontrollimisel:
    "Selle nimekirjanime vaste ühtlustatud nimekirjaga on ajutine ja ootab kontrolli (nimekirja number ja nimi allikates ei klapi üheselt).",
  erakorraline:
    "Erakorraline koosolek kutsuti kokku väljaspool tavapärast graafikut kiireloomuliste küsimuste arutamiseks.",
  linnavalitsusVolikoguYlesandeis:
    "1940. aasta augustist kuni 1941. aasta jaanuarini, nõukogude okupatsiooni ajal, täitis volikogu ülesandeid linnavalitsus. Tegu ei olnud valitud volikoguga.",
  tuletatudKohalolu:
    "Enamik protokolle loetleb ainult puudujaid. Kohalolijad on tuletatud: koosseisu sel kuupäeval kehtinud liikmed miinus protokollis nimetatud puudujad.",
  sidumiseKindlus:
    "Protokollis olev nimekuju on isikuga seotud automaatselt. Kõrge = klapib koosseisu liikmega; keskmine = klapib üldnimestikuga; mitmene = mitu võimalikku isikut.",
  // 2. etapp (IN-05)
  automaatmargendus:
    "Isikud, organisatsioonid, kohad, rahasummad ja ametinimetused on tuvastatud automaatselt keelemudeliga ja võivad sisaldada vigu; isikute seosed profiilidega on samuti automaatsed.",
  kone:
    "Kõned on tuvastatud automaatselt; kaudkõnesid ei kuvata.",
  kirjakuju:
    "Moderniseeritud kuju asendab vana kirjaviisi sõnad (nt wolikogu → volikogu) seal, kus automaatne normaliseering on olemas; ülejäänud tekst jääb algkujule.",
  paevakorrapunkt:
    "Päevakorrapunktid ja nende pealkirjad on protokolli tekstist eraldatud automaatselt; numeratsioon järgib allikat ja võib olla lünkadega. Püsiaadress on #p<nr>.",
  protokolliLisa:
    "Lisa on protokolli juurde kuuluv eraldi dokument (nt eelarve, nimekiri), mille piirid on tuvastatud automaatselt.",
  lehemarker:
    "Kaadrimarker näitab, kust algab Rahvusarhiivi järgmine digikaader (arhiivisäiliku leht). Klõps markeril avab selle kaadri originaalpildi.",
  // 3. etapp
  valimisteAllikad:
    "Kaardil on kõik selle aasta valimiste read: kandidaatide nimekiri (1917 ka venekeelne) ja valimistulemused. Allika viide on kaardi allservas; sama väärtus mitmest allikast on näidatud üks kord, erinevad väärtused kõik eraldi. VIIDE PUUDU = allika viide on andmetes märkimata.",
  kinnitamine:
    "Koosseisu esimesel koosolekul kinnitati valimistel valitud liikmed. Andmestikus on see iga liikme kohta eraldi liitumisrida; siin on need koondatud üheks sündmuseks.",
  vahetus:
    "Liikme lahkumine ja tema asemele tulnud liikme liitumine on andmestikus kaks rida; siin on need näidatud ühe vahetusena.",
} as const;
