import type { Andmestik } from "./types";
import { eluaastad } from "./format";

/** Globaalse otsingu kerge indeks (serialiseeritakse layoutist kliendile). */
export interface OtsinguIsik {
  id: number;
  nimi: string; // "Eesnimi Perenimi"
  alt: string; // alternatiivkujud otsinguks
  aastad: string;
}

export interface OtsinguKoosolek {
  id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  vorm: string;
  koosseis_id: string;
}

export interface OtsinguIndeks {
  isikud: OtsinguIsik[];
  koosolekud: OtsinguKoosolek[];
}

export function ehitaOtsinguIndeks(andmed: Andmestik): OtsinguIndeks {
  return {
    isikud: andmed.isikud.map((i) => ({
      id: i.isik_id,
      nimi: [i.eesnimi, i.perenimi].filter(Boolean).join(" "),
      alt: [i.alt_eesnimi, i.alt_perenimi].filter(Boolean).join(" "),
      aastad: eluaastad(i.synd_kuupaev, i.surm_kuupaev),
    })),
    koosolekud: andmed.koosolekud.map((k) => ({
      id: k.koosolek_id,
      kuupaev: k.kuupaev,
      kuupaev_lopp: k.kuupaev_lopp,
      vorm: k.vorm,
      koosseis_id: k.koosseis_id,
    })),
  };
}
