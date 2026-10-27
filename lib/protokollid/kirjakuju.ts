/**
 * PT-08 / ET-04: normid-asenduste (moderniseeritud kirjakuju) rakendamine ja
 * märgikohtade nihutamine (TE-07).
 */
import type { ProtokollAndmed, Vahemik } from "./types";

export type Norm = [number, number, string];

export interface KirjakujuTulemus {
  tekst: string;
  /** algse teksti märgikoht → uue teksti märgikoht */
  teisenda: (pos: number) => number;
  teisendaVahemik: (v: Vahemik) => Vahemik;
  /** mitu sõna asendati */
  asendusi: number;
}

/**
 * Filtreerib välja normid, mille kuju on algtekstiga identne (ET-02: salvestatakse ainult erinevad).
 */
export function erinevadNormid(tekst: string, normid: Norm[]): Norm[] {
  return normid.filter(([a, l, kuju]) => kuju !== null && kuju !== undefined && tekst.slice(a, l) !== kuju);
}

/**
 * Rakendab asendused (mittekattuvad, järjestatakse alguse järgi). Positsioon asendatud sõna sees
 * kaardistatakse sõna algusele + min(nihe, uue kuju pikkus); sõna lõpp → uue kuju lõpp.
 */
export function rakendaNormid(tekst: string, normid: Norm[]): KirjakujuTulemus {
  const sorted = [...normid].sort((x, y) => x[0] - y[0]);
  const osad: string[] = [];
  // iga asenduse kohta: algne algus, algne lõpp, uus algus, uus lõpp
  const kaart: [number, number, number, number][] = [];
  let kursor = 0;
  let delta = 0;
  for (const [a, l, kuju] of sorted) {
    if (a < kursor) continue; // kattuv asendus — jäetakse vahele
    osad.push(tekst.slice(kursor, a));
    osad.push(kuju);
    kaart.push([a, l, a + delta, a + delta + kuju.length]);
    delta += kuju.length - (l - a);
    kursor = l;
  }
  osad.push(tekst.slice(kursor));
  const uus = osad.join("");

  const teisenda = (pos: number): number => {
    // binaarotsing: viimane asendus, mille algus <= pos
    let lo = 0;
    let hi = kaart.length - 1;
    let i = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (kaart[mid][0] <= pos) {
        i = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (i < 0) return pos;
    const [a, l, ua, ul] = kaart[i];
    if (pos >= l) return pos + (ul - ua) - (l - a) + (ua - a); // = pos + kogunenud delta
    return Math.min(ua + (pos - a), ul);
  };
  return {
    tekst: uus,
    teisenda,
    teisendaVahemik: (v) => [teisenda(v[0]), teisenda(v[1])],
    asendusi: kaart.length,
  };
}

/**
 * PT-08: kogu ProtokollAndmed moderniseeritud kirjakujus — tekst asendatud, kõik vahemikud
 * (plokid, laused, tabelid, olemid, kõned, lehed) nihutatud; `normid` tühi. Statistika jääb.
 */
export function moderniseeri(p: ProtokollAndmed): ProtokollAndmed & { asendusi: number } {
  const m = rakendaNormid(p.tekst, p.normid);
  const v = m.teisendaVahemik;
  return {
    ...p,
    tekst: m.tekst,
    sissejuhatus: v(p.sissejuhatus),
    paevakord: p.paevakord.map((pk) => {
      const [a, l] = v([pk.algus, pk.lopp]);
      return { ...pk, algus: a, lopp: l, pealkiri: v(pk.pealkiri) };
    }),
    lopuosa: p.lopuosa ? v(p.lopuosa) : null,
    lisad: p.lisad.map((x) => {
      const [a, l] = v([x.algus, x.lopp]);
      return { ...x, algus: a, lopp: l };
    }),
    tabelid: p.tabelid.map(v),
    laused: p.laused.map(v),
    olemid: p.olemid.map((o) => {
      const [a, l] = v([o.a, o.l]);
      return { ...o, a, l };
    }),
    koned: p.koned.map((k) => ({ ...k, koneleja: v(k.koneleja), tykid: k.tykid.map(v) })),
    lehed: p.lehed.map((x) =>
      x.algus !== null && x.lopp !== null ? { ...x, algus: m.teisenda(x.algus), lopp: m.teisenda(x.lopp) } : x
    ),
    normid: [],
    asendusi: m.asendusi,
  };
}
