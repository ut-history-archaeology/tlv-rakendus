/**
 * ET-08 / PR-12: isik × protokoll × kindlus mainimiste agregaat (TE-13).
 */
import type { MainimiseRida, Olem } from "./types";

/**
 * Ainult PER-olemid, millel on isik_id (kõrge, keskmine või registriväline "N;None" = mitmene).
 * Mitme kandidaadiga olemid (isik_id null) ei loe ühelegi isikule. Kõneleja on sama PER-olem,
 * seega loetakse üks kord.
 */
export function mainimisteRead(koosolekId: string, kuupaev: string, olemid: Olem[]): MainimiseRida[] {
  const loend = new Map<string, MainimiseRida>();
  for (const o of olemid) {
    if (o.t !== "PER" || o.isik_id === null) continue;
    if (o.kindlus !== "kõrge" && o.kindlus !== "keskmine" && o.kindlus !== "mitmene") continue;
    const key = `${o.isik_id}|${o.kindlus}`;
    const r = loend.get(key);
    if (r) r.arv++;
    else loend.set(key, { isik_id: o.isik_id, koosolek_id: koosolekId, kuupaev, kindlus: o.kindlus, arv: 1 });
  }
  return [...loend.values()].sort((a, b) => a.isik_id - b.isik_id || a.kindlus.localeCompare(b.kindlus));
}
