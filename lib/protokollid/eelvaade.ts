import type { Paevakorrapunkt, Vahemik } from "./types";

/**
 * UX-11: päevakorrapunkti esimene lause pärast pealkirja (≤ max märki, tühikud ühtlustatud).
 * Tühi, kui punktis pealkirja järel teksti ei ole.
 */
export function punktiEelvaade(
  tekst: string,
  laused: Vahemik[],
  punkt: Pick<Paevakorrapunkt, "algus" | "lopp" | "pealkiri">,
  max = 160
): string {
  const algus = Math.max(punkt.pealkiri[1], punkt.algus);
  const lause = laused.find(([a, l]) => l > algus && a < punkt.lopp && l - Math.max(a, algus) > 1);
  if (!lause) return "";
  const lopp = Math.min(lause[1], punkt.lopp);
  const t = tekst.slice(Math.max(lause[0], algus), lopp).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const lyhike = t.slice(0, max - 1);
  const tyhik = lyhike.lastIndexOf(" ");
  return (tyhik > max * 0.6 ? lyhike.slice(0, tyhik) : lyhike) + "…";
}
