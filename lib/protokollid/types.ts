/**
 * Protokollikorpuse eeltöödeldud andmete tüübid (2. etapp, ET-02).
 * Kõik vahemikud on märgikohad `ProtokollAndmed.tekst`-is ([algus, lõpp), lõpp välja arvatud).
 */
import type { SidumiseKindlus } from "../types";

export type Vahemik = [number, number];

export type OlemiTyyp = "PER" | "ORG" | "LOC" | "MONEY" | "POSITION";

export const OLEMI_TYYBID: OlemiTyyp[] = ["PER", "ORG", "LOC", "MONEY", "POSITION"];

/** Nimeüksuse / kõneleja seos isikuga (SD-02, SD-03). */
export interface Sidumine {
  isik_id: number | null;
  kandidaadid: number[];
  /** null, kui olem ei ole isik (t !== PER). */
  kindlus: SidumiseKindlus | null;
}

/** named_entities kihi olem. */
export interface Olem extends Sidumine {
  a: number;
  l: number;
  t: OlemiTyyp;
}

/** speeches relatsioonikihi kõne. */
export interface Kone extends Sidumine {
  koneleja: Vahemik;
  /** speaker_name toorkujul */
  nimi: string;
  /** speech võib koosneda mitmest tükist (vahelehüüded tükkide vahel). */
  tykid: Vahemik[];
}

export interface Paevakorrapunkt {
  /** agenda_points.number (allika numeratsioon; võib olla lünkadega, ühes failis ka korduv). */
  nr: number;
  /** Positsioon protokollis 1…n (alati unikaalne). */
  jrk: number;
  algus: number;
  lopp: number;
  /** agenda_point_titles vahemik (punkti sees, alguses). */
  pealkiri: Vahemik;
}

export interface Lisa {
  algus: number;
  lopp: number;
  kirjeldus: string;
}

/** Üks protokolli leht (ET-09). Järjekord = protokolli_lehed.csv jrk. */
export interface Leht {
  jrk: number;
  /** Arhiivi leheküljenumber, nt "112", "134a". */
  lk: string;
  arhiiviviide: string;
  /** Tekstivahemik `tekst`-is (textline_info.xml_file kaudu); null, kui tekstita. */
  algus: number | null;
  lopp: number | null;
  /** "1918/0057_112.png" — sama nimi kaustades pildid/1200 ja pildid/300. */
  pilt: string;
  /** Transkribuse lehe järjekorranumber (URL-i jaoks; ≠ arhiivi lk). */
  transkribus_lk: number;
  tekstita: boolean;
  /** Sama pilt jagatud mitme rea vahel (134/134a/134b). */
  jagatud: boolean;
  /** textline_info.page_class "LIST OR TABULAR": reavahetused säilitatakse kuvas (E-09). */
  loend: boolean;
}

export interface ProtokolliStatistika {
  sonu: number;
  lauseid: number;
  paevakorrapunkte: number;
  olemeid: number;
  olemeid_PER: number;
  seotud_isikuid: number;
  konesid: number;
  lehekylgi: number;
  lehekylgi_tekstita: number;
  lisasid: number;
  tabeleid: number;
  /** Teksti maht kB-des (UTF-8 baidid / 1024, 1 koht pärast koma). */
  tekst_kb: number;
}

/** Ühe protokolli eeltöödeldud andmed: public/protokollid/<K-id>.json */
export interface ProtokollAndmed {
  id: string;
  fail: string;
  kuupaevad: string[];
  transkribus_url: string;
  arhiiviviide: string;
  tekst: string;
  sissejuhatus: Vahemik;
  paevakord: Paevakorrapunkt[];
  lopuosa: Vahemik | null;
  lisad: Lisa[];
  tabelid: Vahemik[];
  laused: Vahemik[];
  olemid: Olem[];
  koned: Kone[];
  /** words.normalized_form, AINULT kui erineb algkujust: [algus, lõpp, uus kuju]. */
  normid: [number, number, string][];
  lehed: Leht[];
  statistika: ProtokolliStatistika;
}

/** Täistekstiotsingu kild ühe protokolli kohta (ET-04). */
export interface OtsinguProtokoll {
  id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  /** normid-asendused + normaliseeriTekst(); pikkus ≠ tekst. */
  tekst_norm: string;
  /** lausepiirid tekst_norm-is */
  laused: Vahemik[];
  /** bitmask lause kohta: PER=1, ORG=2, LOC=4, MONEY=8, POSITION=16 */
  laused_tyybid: number[];
  /** [nr, algus, lopp] tekst_norm-is */
  paevakord: [number, number, number][];
  /** iga lause algus ALGSES tekstis (sama pikkusega kui laused) */
  algkuju_kaardistus: number[];
}

export interface OtsinguKild {
  aasta: number;
  protokollid: OtsinguProtokoll[];
}

/** data/protokollid.csv rida (ET-03 + ET-09 p 7). */
export interface ProtokolliRida {
  koosolek_id: string;
  fail: string;
  kuupaev_1: string;
  kuupaev_2: string;
  transkribus_url: string;
  arhiiviviide: string;
  lehekylgi: number | null;
  lehekylgi_tekstita: number | null;
  esimene_lk: string;
  viimane_lk: string;
  sonu: number | null;
  lauseid: number | null;
  paevakorrapunkte: number | null;
  olemeid: number | null;
  olemeid_PER: number | null;
  seotud_isikuid: number | null;
  konesid: number | null;
  tekst_kb: number | null;
  lisasid: number | null;
  tabeleid: number | null;
  markus: string;
}

/** data/paevakorrapunktid.csv rida (ET-07). */
export interface PaevakorraRida {
  koosolek_id: string;
  jrk: number;
  nr: number;
  pealkiri: string;
  algus: number;
  lopp: number;
  sonu: number;
}

/** data/protokolli_mainimised.csv rida (ET-08). */
export interface MainimiseRida {
  isik_id: number;
  koosolek_id: string;
  kuupaev: string;
  kindlus: "kõrge" | "keskmine" | "mitmene";
  arv: number;
}

/** public/protokollid/_meta.json */
export interface ProtokollideMeta {
  versioon: number;
  genereeritud: string;
  korpuse_faile: number;
  protokolle: number;
  killud: number[];
  failid: string[];
  hoiatusi: number;
}
