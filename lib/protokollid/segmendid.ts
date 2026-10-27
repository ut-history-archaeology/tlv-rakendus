/**
 * Segmentrenderdaja sisend (PT-03/PT-04, TE-05): ploki tekst jaotatakse järjestikusteks
 * segmentideks kõigi piiride (olemid, kõnelejad, kõnetükid, lisapiirid) järgi. Segmentide
 * tekst kokku == ploki tekst (ükski märk ei kao ega kordu).
 */
import type { Kone, Olem, Vahemik } from "./types";

export type KoneRoll = "koneleja" | "kone" | "vahe";

export interface Segment {
  algus: number;
  lopp: number;
  tekst: string;
  /** Segmenti kattev olem (kui mitu, lühim) või null. */
  olem: Olem | null;
  /** Kõne, mille sees segment on: indeks `koned`-massiivis ja roll. */
  kone: { indeks: number; roll: KoneRoll } | null;
}

function koneVahemik(k: Kone): Vahemik {
  const algused = [k.koneleja[0], ...k.tykid.map((t) => t[0])];
  const lopud = [k.koneleja[1], ...k.tykid.map((t) => t[1])];
  return [Math.min(...algused), Math.max(...lopud)];
}

/**
 * @param tekst   kogu protokolli tekst
 * @param plokk   ploki vahemik, mida renderdatakse
 * @param olemid  kõik olemid (filtreeritakse plokiga kattuvad)
 * @param koned   kõik kõned (indeksid jäävad algse massiivi järgi)
 * @param lisaPiirid täiendavad lõikekohad (nt lehemarkerid), et markerit saaks segmentide vahele panna
 */
export function segmendid(
  tekst: string,
  plokk: Vahemik,
  olemid: Olem[],
  koned: Kone[],
  lisaPiirid: number[] = []
): Segment[] {
  const [pa, pl] = plokk;
  if (pl <= pa) return [];
  const piirid = new Set<number>([pa, pl]);
  const lisa = (x: number) => {
    if (x > pa && x < pl) piirid.add(x);
  };
  const omadOlemid = olemid.filter((o) => o.a < pl && o.l > pa);
  for (const o of omadOlemid) {
    lisa(o.a);
    lisa(o.l);
  }
  const omadKoned: { indeks: number; kone: Kone; v: Vahemik }[] = [];
  koned.forEach((k, indeks) => {
    const v = koneVahemik(k);
    if (v[0] < pl && v[1] > pa) {
      omadKoned.push({ indeks, kone: k, v });
      lisa(k.koneleja[0]);
      lisa(k.koneleja[1]);
      for (const t of k.tykid) {
        lisa(t[0]);
        lisa(t[1]);
      }
    }
  });
  for (const x of lisaPiirid) lisa(x);

  const sorted = [...piirid].sort((x, y) => x - y);
  const tul: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const l = sorted[i + 1];
    // olem: lühim, mis katab [a,l)
    let olem: Olem | null = null;
    for (const o of omadOlemid) {
      if (o.a <= a && o.l >= l && (!olem || o.l - o.a < olem.l - olem.a)) olem = o;
    }
    let kone: Segment["kone"] = null;
    for (const k of omadKoned) {
      if (k.v[0] <= a && k.v[1] >= l) {
        if (k.kone.koneleja[0] <= a && k.kone.koneleja[1] >= l) kone = { indeks: k.indeks, roll: "koneleja" };
        else if (k.kone.tykid.some((t) => t[0] <= a && t[1] >= l)) kone = { indeks: k.indeks, roll: "kone" };
        else kone = { indeks: k.indeks, roll: "vahe" };
        break;
      }
    }
    tul.push({ algus: a, lopp: l, tekst: tekst.slice(a, l), olem, kone });
  }
  return tul;
}

/** Abiline testidele ja kontrollile: segmentide tekst kokku. */
export function segmentideTekst(s: Segment[]): string {
  return s.map((x) => x.tekst).join("");
}
