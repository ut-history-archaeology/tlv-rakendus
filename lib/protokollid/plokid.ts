/**
 * Protokolli jaotus plokkideks: sissejuhatus / päevakorrapunktid / lõpuosa / lisad (TE-04).
 */
import type { Lisa, Paevakorrapunkt, Vahemik } from "./types";

export type Plokk =
  | { liik: "sissejuhatus"; algus: number; lopp: number }
  | { liik: "punkt"; algus: number; lopp: number; nr: number; jrk: number; pealkiri: Vahemik }
  | { liik: "lopuosa"; algus: number; lopp: number }
  | { liik: "lisa"; algus: number; lopp: number; kirjeldus: string }
  | { liik: "tekst"; algus: number; lopp: number };

/**
 * Plokid katavad teksti [0, pikkus) ilma kattumiseta. Lisad eraldatakse lõpuosast;
 * lisade vahele jääv tekst (nt tühik) liidetakse eelnevasse plokki. Ilma punktideta
 * protokoll → üks plokk "tekst" (+ lisad, kui on).
 */
export function plokid(pikkus: number, paevakord: Paevakorrapunkt[], lisad: Lisa[]): Plokk[] {
  const tul: Plokk[] = [];
  const punktid = [...paevakord].sort((a, b) => a.algus - b.algus);
  const lisadS = [...lisad].sort((a, b) => a.algus - b.algus);
  const esimeneLisa = lisadS.length ? lisadS[0].algus : pikkus;

  if (punktid.length === 0) {
    tul.push({ liik: "tekst", algus: 0, lopp: Math.min(esimeneLisa, pikkus) });
  } else {
    tul.push({ liik: "sissejuhatus", algus: 0, lopp: punktid[0].algus });
    for (const p of punktid) {
      tul.push({ liik: "punkt", algus: p.algus, lopp: p.lopp, nr: p.nr, jrk: p.jrk, pealkiri: p.pealkiri });
    }
    const viimaneLopp = punktid[punktid.length - 1].lopp;
    const lopuosaLopp = Math.max(viimaneLopp, Math.min(esimeneLisa, pikkus));
    if (lopuosaLopp > viimaneLopp) tul.push({ liik: "lopuosa", algus: viimaneLopp, lopp: lopuosaLopp });
  }
  let kursor = tul[tul.length - 1].lopp;
  for (const l of lisadS) {
    if (l.algus < kursor) {
      // lisa algab eelmise ploki sees — lõikame eelmise ploki lühemaks (ei tohiks korpuses ette tulla)
      tul[tul.length - 1].lopp = l.algus;
    } else if (l.algus > kursor) {
      tul[tul.length - 1].lopp = l.algus; // vahele jääv tekst eelmisesse plokki
    }
    tul.push({ liik: "lisa", algus: l.algus, lopp: l.lopp, kirjeldus: l.kirjeldus });
    kursor = l.lopp;
  }
  if (kursor < pikkus) tul[tul.length - 1].lopp = pikkus;
  return tul.filter((p) => p.lopp > p.algus || p.liik === "punkt");
}

/** Sissejuhatuse ja lõpuosa vahemikud ET-02 kujul. */
export function sissejuhatusJaLopuosa(
  pikkus: number,
  paevakord: Paevakorrapunkt[],
  lisad: Lisa[]
): { sissejuhatus: Vahemik; lopuosa: Vahemik | null } {
  const p = plokid(pikkus, paevakord, lisad);
  const sj = p.find((x) => x.liik === "sissejuhatus" || x.liik === "tekst");
  const lo = p.find((x) => x.liik === "lopuosa");
  return {
    sissejuhatus: sj ? [sj.algus, sj.lopp] : [0, 0],
    lopuosa: lo ? [lo.algus, lo.lopp] : null,
  };
}
