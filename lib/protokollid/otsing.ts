/**
 * Täistekstiotsingu tuum (ET-04, PT-02, TE-08): normaliseering, lausete tüübimask,
 * otsingukirje ehitamine. Tabamuste leidmine ja kontekst lisatakse 2. sammus.
 */
import { normalizeOtsing } from "../format";
import { rakendaNormid } from "./kirjakuju";
import type { Olem, OlemiTyyp, OtsinguProtokoll, ProtokollAndmed, Vahemik } from "./types";

export const OLEMI_BITID: Record<OlemiTyyp, number> = { PER: 1, ORG: 2, LOC: 4, MONEY: 8, POSITION: 16 };

export const OTSINGU_MIN_PIKKUS = 3;

/**
 * Pikkust säilitav normaliseering: iga märk eraldi läbi `normalizeOtsing` (tõst, diakriitika, w→v).
 * Nii jäävad märgikohad tekstiga 1:1 — vajalik, et tabamus avada õiges kohas.
 * Päring normaliseeritakse SAMA funktsiooniga.
 */
export function normaliseeriTekst(s: string): string {
  let out = "";
  for (const ch of s) {
    const n = normalizeOtsing(ch);
    if (n.length === 1) out += n;
    else if (n.length === 0) out += ch.toLowerCase();
    else out += n[0]; // haruldane: üks märk laguneb mitmeks → hoiame pikkust
  }
  return out;
}

/** Bitmask iga lause kohta: millised olemitüübid lausega kattuvad. */
export function lauseteTyybid(laused: Vahemik[], olemid: Olem[]): number[] {
  const mask = new Array<number>(laused.length).fill(0);
  if (laused.length === 0) return mask;
  const sorted = [...olemid].sort((x, y) => x.a - y.a);
  let j = 0;
  for (let i = 0; i < laused.length; i++) {
    const [la, ll] = laused[i];
    // liigu olemiteni, mis võivad lausega kattuda
    while (j < sorted.length && sorted[j].l <= la) j++;
    for (let k = j; k < sorted.length && sorted[k].a < ll; k++) {
      if (sorted[k].l > la) mask[i] |= OLEMI_BITID[sorted[k].t];
    }
  }
  return mask;
}

/** ET-04: ühe protokolli otsingukirje. Vahemikud tekst_norm koordinaatides. */
export function ehitaOtsinguKirje(
  p: ProtokollAndmed,
  koosolek: { kuupaev: string; kuupaev_lopp: string }
): OtsinguProtokoll {
  const mod = rakendaNormid(p.tekst, p.normid);
  const tekst_norm = normaliseeriTekst(mod.tekst);
  if (tekst_norm.length !== mod.tekst.length) {
    throw new Error(`${p.id}: normaliseeritud teksti pikkus erineb (${tekst_norm.length} vs ${mod.tekst.length})`);
  }
  return {
    id: p.id,
    kuupaev: koosolek.kuupaev,
    kuupaev_lopp: koosolek.kuupaev_lopp,
    tekst_norm,
    laused: p.laused.map((l) => mod.teisendaVahemik(l)),
    laused_tyybid: lauseteTyybid(p.laused, p.olemid),
    paevakord: p.paevakord.map((pk) => [pk.nr, mod.teisenda(pk.algus), mod.teisenda(pk.lopp)]),
    algkuju_kaardistus: p.laused.map((l) => l[0]),
  };
}

/** Päringu normaliseering (sama kui tekstil). */
export function normaliseeriParing(q: string): string {
  return normaliseeriTekst(q.trim());
}

// ---------------------------------------------------------------------------
// Tabamused ja kontekst (PT-02, PT-07, PT-10)
// ---------------------------------------------------------------------------

export function onKehtivParing(q: string): boolean {
  return normaliseeriParing(q).length >= OTSINGU_MIN_PIKKUS;
}

/** Binaarotsing: lause indeks, mille sisse `pos` jääb; -1, kui ühegi lause sees pole. */
export function lauseIndeks(laused: Vahemik[], pos: number): number {
  let lo = 0;
  let hi = laused.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, l] = laused[mid];
    if (pos < a) hi = mid - 1;
    else if (pos >= l) lo = mid + 1;
    else return mid;
  }
  // lausete vahele jääv tühik: võta eelmine lause, kui on
  return hi >= 0 && hi < laused.length ? hi : -1;
}

/** Päevakorrapunkti nr, mille sisse `pos` jääb; null = sissejuhatus/lõpuosa/lisa. */
export function paevakorraNr(paevakord: [number, number, number][], pos: number): number | null {
  for (const [nr, a, l] of paevakord) if (pos >= a && pos < l) return nr;
  return null;
}

/** Kõik päringu (normaliseeritud) alamsõne esinemiskohad tekst_norm-is. */
export function leiaKohad(tekstNorm: string, paringNorm: string): number[] {
  const kohad: number[] = [];
  if (paringNorm.length === 0) return kohad;
  let i = tekstNorm.indexOf(paringNorm);
  while (i !== -1) {
    kohad.push(i);
    i = tekstNorm.indexOf(paringNorm, i + 1);
  }
  return kohad;
}

export interface Tabamus {
  id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  /** tabamuse algus tekst_norm-is */
  koht: number;
  pikkus: number;
  /** lause indeks protokollis */
  lause: number;
  /** lause algus ALGSES tekstis (protokolli avamiseks õiges kohas) */
  algkuju_koht: number;
  punkt: number | null;
  /** lause bitmask (PT-07) */
  tyybid: number;
}

/**
 * Tabamused ühes protokollis. `tyybiMask` (PT-07): kui > 0, jäetakse ainult laused, kus esineb
 * vähemalt üks valitud tüüp; kui päring on tühi ja mask > 0, on tulemus = iga sobiv lause (üks "tabamus" lause kohta).
 */
export function tabamusedProtokollis(p: OtsinguProtokoll, paringNorm: string, tyybiMask = 0): Tabamus[] {
  const tul: Tabamus[] = [];
  const tee = (koht: number, pikkus: number, lause: number): Tabamus => ({
    id: p.id,
    kuupaev: p.kuupaev,
    kuupaev_lopp: p.kuupaev_lopp,
    koht,
    pikkus,
    lause,
    algkuju_koht: lause >= 0 ? p.algkuju_kaardistus[lause] : 0,
    punkt: paevakorraNr(p.paevakord, koht),
    tyybid: lause >= 0 ? p.laused_tyybid[lause] : 0,
  });
  if (paringNorm.length === 0) {
    if (tyybiMask === 0) return tul;
    p.laused.forEach((l, i) => {
      if ((p.laused_tyybid[i] & tyybiMask) !== 0) tul.push(tee(l[0], l[1] - l[0], i));
    });
    return tul;
  }
  for (const koht of leiaKohad(p.tekst_norm, paringNorm)) {
    const lause = lauseIndeks(p.laused, koht);
    if (tyybiMask !== 0 && (lause < 0 || (p.laused_tyybid[lause] & tyybiMask) === 0)) continue;
    tul.push(tee(koht, paringNorm.length, lause));
  }
  return tul;
}

/** Konteksti lausevahemik ±n lauset, teksti alguses/lõpus lõigatud. */
export function kontekstiVahemik(laused: Vahemik[], lause: number, n: number): Vahemik {
  if (laused.length === 0) return [0, 0];
  const i = Math.max(0, Math.min(lause, laused.length - 1));
  const a = Math.max(0, i - n);
  const l = Math.min(laused.length - 1, i + n);
  return [laused[a][0], laused[l][1]];
}

/** Tabamuste kokkuvõte "<n> tabamust <m> protokollis". */
export function kokkuvote(tabamused: Tabamus[]): { tabamusi: number; protokolle: number } {
  return { tabamusi: tabamused.length, protokolle: new Set(tabamused.map((t) => t.id)).size };
}

/** Millised aastakillud tuleb laadida vahemiku [algus, lopp] jaoks (PT-06). */
export function vajalikudAastad(killud: number[], algus?: string, lopp?: string): number[] {
  const a = algus ? Number(algus.slice(0, 4)) : -Infinity;
  const l = lopp ? Number(lopp.slice(0, 4)) : Infinity;
  return killud.filter((y) => y >= a && y <= l);
}
