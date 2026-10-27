/// <reference lib="webworker" />
/**
 * PT-02 täistekstiotsingu Web Worker: laeb aastakillud (public/protokollid/otsing/<aasta>.json)
 * esimesel vajadusel, puhverdab mälus ja leiab tabamused koos kontekstiga. UI-d ei blokeeri.
 */
import { otsinguKilluUrl } from "./laadi";
import { kontekstiVahemik, normaliseeriParing, tabamusedProtokollis, type Tabamus } from "./otsing";
import type { OtsinguKild } from "./types";

export interface OtsinguParing {
  tyyp: "otsi";
  id: number;
  q: string;
  aastad: number[];
  /** PT-07 tüübimask (0 = ei filtreeri) */
  mask: number;
  algus: string;
  lopp: string;
  /** kontekst ±n lauset (PT-10); -1 = kogu päevakorrapunkt */
  kontekst: number;
}

export interface TabamusKuva extends Tabamus {
  /** konteksti tekst (normaliseeritud kujul) */
  kontekst_tekst: string;
  /** tabamuse algus konteksti sees */
  vaste_algus: number;
  vaste_pikkus: number;
  /** lause tekst */
  lause_tekst: string;
  /** protokollilehe ankur: p<nr> / sissejuhatus / lopuosa / tekst (erireegel 10) */
  ankur: string;
}

function ankur(paevakord: [number, number, number][], punkt: number | null, koht: number): string {
  if (punkt !== null) return `p${punkt}`;
  if (paevakord.length === 0) return "tekst";
  return koht < paevakord[0][1] ? "sissejuhatus" : "lopuosa";
}

export type OtsinguVastus =
  | { tyyp: "laen"; id: number; aasta: number; laetud: number; kokku: number }
  | { tyyp: "tulemus"; id: number; tabamused: TabamusKuva[]; aastaid: number }
  | { tyyp: "viga"; id: number; sonum: string };

const puhver = new Map<number, Promise<OtsinguKild>>();

function laeKild(aasta: number): Promise<OtsinguKild> {
  let p = puhver.get(aasta);
  if (!p) {
    p = fetch(otsinguKilluUrl(aasta)).then((r) => {
      if (!r.ok) throw new Error(`Otsingukildu ${aasta} ei õnnestunud laadida (${r.status})`);
      return r.json() as Promise<OtsinguKild>;
    });
    p.catch(() => puhver.delete(aasta));
    puhver.set(aasta, p);
  }
  return p;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<OtsinguParing>) => {
  const p = e.data;
  if (p.tyyp !== "otsi") return;
  try {
    const killud: OtsinguKild[] = [];
    let laetud = 0;
    for (const aasta of p.aastad) {
      if (!puhver.has(aasta)) ctx.postMessage({ tyyp: "laen", id: p.id, aasta, laetud, kokku: p.aastad.length } satisfies OtsinguVastus);
      killud.push(await laeKild(aasta));
      laetud++;
    }
    const qn = normaliseeriParing(p.q);
    const tul: TabamusKuva[] = [];
    for (const k of killud) {
      for (const pr of k.protokollid) {
        if (p.algus && pr.kuupaev < p.algus) continue;
        if (p.lopp && pr.kuupaev > p.lopp) continue;
        for (const t of tabamusedProtokollis(pr, qn, p.mask)) {
          let v: [number, number];
          if (p.kontekst < 0) {
            const pk = pr.paevakord.find(([, a, l]) => t.koht >= a && t.koht < l);
            v = pk ? [pk[1], pk[2]] : kontekstiVahemik(pr.laused, t.lause, 1);
          } else {
            v = kontekstiVahemik(pr.laused, t.lause, p.kontekst);
          }
          const lause = t.lause >= 0 ? pr.laused[t.lause] : v;
          tul.push({
            ...t,
            kontekst_tekst: pr.tekst_norm.slice(v[0], v[1]),
            vaste_algus: t.koht - v[0],
            vaste_pikkus: t.pikkus,
            lause_tekst: pr.tekst_norm.slice(lause[0], lause[1]),
            ankur: ankur(pr.paevakord, t.punkt, t.koht),
          });
        }
      }
    }
    tul.sort((a, b) => a.kuupaev.localeCompare(b.kuupaev) || a.id.localeCompare(b.id) || a.koht - b.koht);
    ctx.postMessage({ tyyp: "tulemus", id: p.id, tabamused: tul, aastaid: killud.length } satisfies OtsinguVastus);
  } catch (err) {
    ctx.postMessage({ tyyp: "viga", id: p.id, sonum: err instanceof Error ? err.message : String(err) } satisfies OtsinguVastus);
  }
};
