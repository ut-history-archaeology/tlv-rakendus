import type { MainimiseRida, PaevakorraRida, ProtokolliRida } from "./protokollid/types";

export interface Isik {
  isik_id: number;
  perenimi: string;
  alt_perenimi: string;
  eesnimi: string;
  alt_eesnimi: string;
  sugu: string;
  isanimi: string;
  synd_kuupaev: string;
  synd_tuletatud: string;
  surm_kuupaev: string;
  wikidata: string;
  arhiiviviited: string;
  AKL_ID: string;
}

export interface Koosseis {
  koosseis_id: string;
  aasta_valimised: string;
  valimised_algus: string;
  valimised_lopp: string;
  esimene_koosolek: string;
  viimane_koosolek: string;
  valimised_allikas: string;
  valimistulemuste_allikas: string;
  kandidaatide_allikas: string;
}

export interface Koosolek {
  koosolek_id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  nadalapaev: string;
  vorm: string;
  koosseis_id: string;
  juhataja: string;
  koosseis_arv: number | null;
  kohal_arv: number | null;
  kohal_arv_2paev: number | null;
  kuupaev_txt: string;
  protokolli_algus_txt: string;
}

export interface KoosolekJuhataja {
  koosolek_id: string;
  juhataja_nimi: string;
  isik_id: number | null;
}

export type MuutusLiik =
  | "liitumine"
  | "lahkumine"
  | "liitumine&lahkumine"
  | "rühmavahetus"
  | "peatamine";

export interface Muutus {
  muutus_id: number;
  isik_id: number | null;
  perenimi: string;
  eesnimi: string;
  nimekiri: string;
  kuupaev: string;
  koosseis_id: string;
  liik: MuutusLiik;
  liitus_prot: string;
  lahkus_prot: string;
  ryhmavahetus_prot: string;
  peatatud_prot: string;
  allikaviide: string;
  tapsustus: string;
  asendaja_ID: number | null;
  asendatav_ID: number | null;
  asendaja_puudub: string;
  asendatav_puudub: string;
}

export interface Valimine {
  aasta: number;
  koosseis_id: string;
  roll: "valitud" | "valitav";
  isik_id: number;
  nimekiri_nr: string;
  nimekiri_nimi: string;
  ringkond_nr: string;
  perenimi: string;
  alt_perenimi: string;
  eesnimi: string;
  alt_eesnimi: string;
  isanimi: string;
  vanus: string;
  synniaeg: string;
  synniaeg_tuletatud: string;
  elukoht_tanav: string;
  elukoht_majanr: string;
  elukoht_korterinr: string;
  elukoht_muu: string;
  amet: string;
  markused: string;
  jrk_uld: string;
  jrk_nimekiri: string;
  jrk_ringkond: string;
  haaled_1_jsk: string;
  haaled_2_jsk: string;
  haaled_kokku: number | null;
}

export type SidumiseKindlus = "kõrge" | "keskmine" | "mitmene" | "puudub";

export interface Osavott {
  koosolek_id: string;
  kuupaev: string;
  koosseis_id: string;
  staatus: "kohal" | "puudub";
  nimi_toor: string;
  isik_id: number | null;
  sidumise_kindlus: SidumiseKindlus | "";
}

/** Kõik andmestiku tabelid koos. */
export interface Andmestik {
  isikud: Isik[];
  koosseisud: Koosseis[];
  koosolekud: Koosolek[];
  juhatajad: KoosolekJuhataja[];
  muutused: Muutus[];
  valimised: Valimine[];
  osavott: Osavott[];
  /** 2. etapp: data/protokollid.csv (337 rida; K336-l protokolli ei ole) */
  protokollid: ProtokolliRida[];
  /** data/paevakorrapunktid.csv */
  paevakord: PaevakorraRida[];
  /** data/protokolli_mainimised.csv */
  mainimised: MainimiseRida[];
}

/** Isikute tabeli tuletatud rida (/isikud vaade). */
export interface IsikuRida {
  isik_id: number;
  perenimi: string;
  eesnimi: string;
  alt_perenimi: string;
  alt_eesnimi: string;
  sugu: string;
  isanimi: string;
  synd_kuupaev: string;
  synd_tuletatud: string;
  surm_kuupaev: string;
  wikidata: string;
  arhiiviviited: string;
  AKL_ID: string;
  koosseisud: string[]; // koosseis_id-d, milles isik on olnud liige
  koosseise: number;
  esimene_koosseis: string;
  viimane_koosseis: string;
  peamine_nimekiri: string;
  oli_juhataja: boolean;
  aadressid: string[]; // "aadress (aasta, aasta)" tekstina (UX-04)
}

/** Koosolekute tabeli tuletatud rida (/koosolekud vaade). */
export interface KoosolekuRida {
  koosolek_id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  nadalapaev: string;
  vorm: string;
  koosseis_id: string;
  juhatajad: { nimi: string; isik_id: number | null }[];
  koosseis_arv: number | null;
  kohal_arv: number | null;
  kohal_arv_2paev: number | null;
}
