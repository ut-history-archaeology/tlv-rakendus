/**
 * Protokolli tekstivaate mudel (PT-03/PT-04/PT-05): plokk → järjestikused kuvaüksused
 * (lehemarkerid, tavasegmendid, kõneplokid). Puhas funktsioon, renderdajast sõltumatu.
 *
 * Tekstikuju (E-09): OCR-read liidetakse lõigu sees tühikuga; `tabelid` vahemikes ja
 * "LIST OR TABULAR" lehtedel (`Leht.loend`) säilitatakse reavahetused.
 */
import { plokid, type Plokk } from "./plokid";
import { segmendid, type KoneRoll, type Segment } from "./segmendid";
import type { Kone, Leht, ProtokollAndmed, Vahemik } from "./types";

export interface MarkerYksus {
  liik: "marker";
  leht: Leht;
  /** märgikoht tekstis, kuhu marker asetub */
  koht: number;
}

export interface SegmentYksus {
  liik: "segment";
  segment: Segment;
  /** true → reavahetused säilitatakse (pre-wrap, monospace) */
  sailita: boolean;
}

export interface KoneOsa {
  roll: KoneRoll;
  /** segmendid, markerid ja pesastatud kõned (vahelehüüe teise kõne sees) */
  yksused: KuvaYksus[];
}

export interface KoneYksus {
  liik: "kone";
  indeks: number;
  osad: KoneOsa[];
}

export type KuvaYksus = MarkerYksus | SegmentYksus | KoneYksus;

/**
 * Lehemarkerite kohad tekstis (PT-05): tekstiga leht → `algus`; tekstita leht → eelmise
 * tekstiga lehe lõpp (E-14), esimese lehe puhul 0.
 */
export function markeriteKohad(lehed: Leht[]): { leht: Leht; koht: number }[] {
  const tul: { leht: Leht; koht: number }[] = [];
  let eelmineLopp = 0;
  for (const l of lehed) {
    if (l.algus !== null && l.lopp !== null) {
      tul.push({ leht: l, koht: l.algus });
      eelmineLopp = l.lopp;
    } else {
      tul.push({ leht: l, koht: eelmineLopp });
    }
  }
  return tul;
}

/** Vahemikud, kus reavahetused säilitatakse: tabelid + loendilehed. */
export function sailitatavadVahemikud(p: ProtokollAndmed): Vahemik[] {
  const v: Vahemik[] = [...p.tabelid];
  for (const l of p.lehed) if (l.loend && l.algus !== null && l.lopp !== null) v.push([l.algus, l.lopp]);
  return v.sort((a, b) => a[0] - b[0]);
}

function kaetud(vahemikud: Vahemik[], a: number, l: number): boolean {
  return vahemikud.some((v) => v[0] <= a && l <= v[1]);
}

/** Segmendi tekst kuvakujul: säilitamata segmendis reavahetus → tühik. */
export function kuvaTekst(tekst: string, sailita: boolean): string {
  return sailita ? tekst : tekst.replace(/\s*\n\s*/g, " ");
}

/**
 * Ploki kuvaüksused. Markerid, mille koht on ploki sees ([algus, lõpp), tekstita lehe
 * marker ka = lõpp, kui see on viimane plokk või koht > algus), lisatakse õigesse kohta.
 */
export function plokiYksused(p: ProtokollAndmed, plokk: Plokk, viimane: boolean): KuvaYksus[] {
  const [pa, pl] = [plokk.algus, plokk.lopp];
  const sailita = sailitatavadVahemikud(p);
  const markerid = markeriteKohad(p.lehed).filter(({ leht, koht }) => {
    if (koht >= pa && koht < pl) return true;
    // tekstita leht ploki lõpus (eelmise lehe tekst lõppeb täpselt ploki lõpus)
    return leht.tekstita && koht === pl && (viimane || koht > pa);
  });
  const lisaPiirid = [
    ...markerid.map((m) => m.koht),
    ...sailita.flatMap((v) => [v[0], v[1]]),
    ...(plokk.liik === "punkt" ? [plokk.pealkiri[1]] : []),
  ];
  const segs = segmendid(p.tekst, [pa, pl], p.olemid, p.koned, lisaPiirid);

  // marker-üksused ja segmendid ühte järjekorda
  const toor: (SegmentYksus | MarkerYksus)[] = [];
  let mi = 0;
  const markeridS = [...markerid].sort((a, b) => a.koht - b.koht || a.leht.jrk - b.leht.jrk);
  for (const s of segs) {
    while (mi < markeridS.length && markeridS[mi].koht <= s.algus) {
      toor.push({ liik: "marker", leht: markeridS[mi].leht, koht: markeridS[mi].koht });
      mi++;
    }
    toor.push({ liik: "segment", segment: s, sailita: kaetud(sailita, s.algus, s.lopp) });
  }
  while (mi < markeridS.length) {
    toor.push({ liik: "marker", leht: markeridS[mi].leht, koht: markeridS[mi].koht });
    mi++;
  }

  // kõned grupeeritakse: järjestikused üksused sama kõne indeksiga → üks KoneYksus;
  // kõne teise kõne sees (vahelehüüe tükkide vahel) pesastatakse välimise "vahe" ossa
  const stack = new Map<Segment, number[]>();
  for (const s of segs) stack.set(s, katvadKoned(p.koned, s.algus, s.lopp));
  return grupeeriKoned(toor, p.koned, (s) => stack.get(s) ?? [], 0);
}

function koneVahemik(k: Kone): Vahemik {
  const algused = [k.koneleja[0], ...k.tykid.map((t) => t[0])];
  const lopud = [k.koneleja[1], ...k.tykid.map((t) => t[1])];
  return [Math.min(...algused), Math.max(...lopud)];
}

/** Kõnede indeksid, mis katavad [a, l); välimine (pikim) enne. */
function katvadKoned(koned: Kone[], a: number, l: number): number[] {
  const tul: { i: number; pikkus: number }[] = [];
  koned.forEach((k, i) => {
    const v = koneVahemik(k);
    if (v[0] <= a && v[1] >= l) tul.push({ i, pikkus: v[1] - v[0] });
  });
  return tul.sort((x, y) => y.pikkus - x.pikkus).map((x) => x.i);
}

function koneRoll(k: Kone, a: number, l: number): KoneRoll {
  if (k.koneleja[0] <= a && k.koneleja[1] >= l) return "koneleja";
  if (k.tykid.some((t) => t[0] <= a && t[1] >= l)) return "kone";
  return "vahe";
}

function grupeeriKoned(
  toor: KuvaYksus[],
  koned: Kone[],
  stackOf: (s: Segment) => number[],
  tase: number
): KuvaYksus[] {
  const tul: KuvaYksus[] = [];
  let kone: KoneYksus | null = null;
  const indeksTasemel = (y: KuvaYksus): number | null =>
    y.liik === "segment" ? stackOf(y.segment)[tase] ?? null : null;
  for (let i = 0; i < toor.length; i++) {
    const y = toor[i];
    let idx = indeksTasemel(y);
    // marker kõne sees: kuulub kõnesse, kui järgmine segment on samas kõnes
    if (y.liik === "marker" && kone) {
      const jargmine = toor.slice(i + 1).find((x) => x.liik === "segment");
      if (jargmine && indeksTasemel(jargmine) === kone.indeks) idx = kone.indeks;
    }
    if (idx === null) {
      kone = null;
      tul.push(y);
      continue;
    }
    if (!kone || kone.indeks !== idx) {
      kone = { liik: "kone", indeks: idx, osad: [] };
      tul.push(kone);
    }
    const roll: KoneRoll =
      y.liik === "segment" ? koneRoll(koned[idx], y.segment.algus, y.segment.lopp) : kone.osad[kone.osad.length - 1]?.roll ?? "vahe";
    const viimaneOsa = kone.osad[kone.osad.length - 1];
    if (viimaneOsa && viimaneOsa.roll === roll) viimaneOsa.yksused.push(y);
    else kone.osad.push({ roll, yksused: [y] });
  }
  // pesastatud kõned sügavamal tasemel
  for (const y of tul) {
    if (y.liik !== "kone") continue;
    for (const o of y.osad) {
      if (o.yksused.some((x) => x.liik === "segment" && stackOf(x.segment).length > tase + 1)) {
        o.yksused = grupeeriKoned(o.yksused, koned, stackOf, tase + 1);
      }
    }
  }
  return tul;
}

/** Ploki pealkiri (punktil pealkirja tekst; muudel fikseeritud silt). */
export function plokiPealkiri(p: ProtokollAndmed, plokk: Plokk, puhasta: (s: string) => string): string {
  switch (plokk.liik) {
    case "sissejuhatus":
      return "Sissejuhatus";
    case "punkt":
      return `${plokk.nr}. ${puhasta(p.tekst.slice(plokk.pealkiri[0], plokk.pealkiri[1]))}`;
    case "lopuosa":
      return "Lõpuosa";
    case "lisa":
      return `Lisa: ${plokk.kirjeldus || "(kirjelduseta)"}`;
    default:
      return "Protokolli tekst";
  }
}

/** Ploki DOM-id: punkt → `p<nr>` (korduva nr korral `p<nr>-<jrk>`), muud fikseeritud. */
export function plokiId(plokk: Plokk, korduvadNrd: Set<number>): string {
  switch (plokk.liik) {
    case "sissejuhatus":
      return "sissejuhatus";
    case "punkt":
      return korduvadNrd.has(plokk.nr) ? `p${plokk.nr}-${plokk.jrk}` : `p${plokk.nr}`;
    case "lopuosa":
      return "lopuosa";
    case "lisa":
      return `lisa-${plokk.algus}`;
    default:
      return "tekst";
  }
}

export function korduvadNumbrid(p: ProtokollAndmed): Set<number> {
  const loend = new Map<number, number>();
  for (const pk of p.paevakord) loend.set(pk.nr, (loend.get(pk.nr) ?? 0) + 1);
  return new Set([...loend].filter(([, n]) => n > 1).map(([nr]) => nr));
}

/** Kõik protokolli plokid koos id-de ja üksustega. */
export function protokolliPlokid(p: ProtokollAndmed) {
  const pl = plokid(p.tekst.length, p.paevakord, p.lisad);
  const korduvad = korduvadNumbrid(p);
  return pl.map((plokk, i) => ({
    plokk,
    id: plokiId(plokk, korduvad),
    yksused: plokiYksused(p, plokk, i === pl.length - 1),
  }));
}

/** Lehe (lk) → plokkide id-d, milles lehe tekst algab (PT-05 (b); tekstita lehel eelmise lehe plokk). */
export function leheplokid(p: ProtokollAndmed): Map<string, string> {
  const pl = plokid(p.tekst.length, p.paevakord, p.lisad);
  const korduvad = korduvadNumbrid(p);
  const m = new Map<string, string>();
  for (const { leht, koht } of markeriteKohad(p.lehed)) {
    const k = leht.tekstita ? Math.max(0, koht - 1) : koht;
    const plokk = pl.find((b) => b.algus <= k && k < b.lopp) ?? pl[pl.length - 1];
    if (plokk) m.set(leht.lk, plokiId(plokk, korduvad));
  }
  return m;
}
