/**
 * basePath-teadlikud URL-id ja protokolliandmete laadimine (ptk 6, ptk 8).
 * - serveris (build-ajal): `loeProtokollAndmed(id)` loeb public/protokollid/<id>.json failist;
 * - kliendis: `laeProtokollAndmed(id)` fetch-ib sama faili läbi basePath-i.
 */
import type { ProtokollAndmed } from "./types";

/** next.config.ts basePath; GitHub Pagesil on rakendus alamkaustas. */
export const BASE_PATH = "/tlv-rakendus";

/** Toorkorpuse fail GitHubis (otsus O-05: rakendus toorfaili ei paku, ainult link). */
export const KORPUS_GITHUB_BAAS = "https://github.com/ut-history-archaeology/tlv-rakendus/blob/main/korpus/json/";

export function korpuseFailiUrl(fail: string): string {
  return KORPUS_GITHUB_BAAS + encodeURIComponent(fail);
}

/** `public/…` faili avalik URL koos basePath-iga. */
export function avalikUrl(tee: string): string {
  return `${BASE_PATH}/${tee.replace(/^\//, "")}`;
}

export function protokolliJsonUrl(id: string): string {
  return avalikUrl(`protokollid/${id}.json`);
}

export function otsinguKilluUrl(aasta: number): string {
  return avalikUrl(`protokollid/otsing/${aasta}.json`);
}

/** Kliendipoolne laadimine (eksport, kirjakuju-lüliti). Tulemus puhverdatakse mälus. */
const puhver = new Map<string, Promise<ProtokollAndmed>>();

export function laeProtokollAndmed(id: string): Promise<ProtokollAndmed> {
  let p = puhver.get(id);
  if (!p) {
    p = fetch(protokolliJsonUrl(id)).then((r) => {
      if (!r.ok) throw new Error(`Protokolli ${id} andmeid ei õnnestunud laadida (${r.status})`);
      return r.json() as Promise<ProtokollAndmed>;
    });
    puhver.set(id, p);
  }
  return p;
}
