/**
 * SD-02 nimeüksus ↔ isik ja SD-03 kõneleja ↔ isik (puhtad funktsioonid, TE-02/TE-03).
 */
import type { Olem, Sidumine, Vahemik } from "./types";

/** council_member_id string → täisarvulised ID-d (ilma "None"-ta). Tundmatu kuju → viga. */
export function parsiIdd(cm: string | null | undefined): { idd: number[]; none: boolean } {
  if (cm === null || cm === undefined || cm === "" || cm === "None") return { idd: [], none: true };
  const osad = String(cm).split(";").map((s) => s.trim()).filter((s) => s !== "");
  const idd: number[] = [];
  let none = false;
  for (const o of osad) {
    if (o === "None") none = true;
    else if (/^\d+$/.test(o)) idd.push(Number(o));
    else throw new Error(`tundmatu council_member_id kuju: "${cm}"`);
  }
  return { idd, none };
}

export const SIDUMATA: Sidumine = { isik_id: null, kandidaadid: [], kindlus: "puudub" };
export const MITTE_ISIK: Sidumine = { isik_id: null, kandidaadid: [], kindlus: null };

/**
 * SD-02 tabel. `tuntud` (isikud.csv ID-d) antakse eeltöötluses; ID väljaspool seda → viga (ET-06).
 * - "None" + not_per → kindlus null (ORG/LOC/MONEY/POSITION)
 * - "None" + PER → puudub
 * - "N" → kõrge; kui match_status sisaldab levenshtein_fuzzy/ocrmistake → keskmine
 * - "N;None" → isik N, mitmene (registriväline, E-01)
 * - 2–3 ID-d → isik null, kandidaadid, mitmene
 * - ≥ 4 ID-d → puudub, kandidaadid [] (E-02)
 */
export function parsiCouncilMemberId(
  cm: string | null | undefined,
  tag: string,
  matchStatus: string | null | undefined,
  tuntud?: Set<number>
): Sidumine {
  if (tag !== "PER") return MITTE_ISIK;
  const { idd, none } = parsiIdd(cm);
  if (tuntud) {
    for (const id of idd) {
      if (!tuntud.has(id)) throw new Error(`council_member_id ${id} puudub isikud.csv-s (kuju "${cm}")`);
    }
  }
  if (idd.length === 0) return SIDUMATA;
  if (idd.length === 1) {
    const id = idd[0];
    if (none) return { isik_id: id, kandidaadid: [id], kindlus: "mitmene" };
    const s = matchStatus ?? "";
    const ebakindel = s.includes("levenshtein_fuzzy") || s.includes("ocrmistake");
    return { isik_id: id, kandidaadid: [id], kindlus: ebakindel ? "keskmine" : "kõrge" };
  }
  if (idd.length <= 3) return { isik_id: null, kandidaadid: [...idd], kindlus: "mitmene" };
  return { isik_id: null, kandidaadid: [], kindlus: "puudub" };
}

function kattuvus(a: Vahemik, b: Vahemik): number {
  return Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
}

/**
 * SD-03: kõneleja vahemik → PER-olem, millega on ühine lõik ≥ 1 märk; mitme puhul pikima kattuvusega.
 * Kattuvust pole → sidumata (nimi jääb speaker_name toorkujul).
 */
export function seoKoneleja(koneleja: Vahemik, olemid: Olem[]): Sidumine {
  let parim: Olem | null = null;
  let parimKattuvus = 0;
  for (const o of olemid) {
    if (o.t !== "PER") continue;
    const k = kattuvus(koneleja, [o.a, o.l]);
    if (k >= 1 && k > parimKattuvus) {
      parim = o;
      parimKattuvus = k;
    }
  }
  if (!parim) return SIDUMATA;
  return { isik_id: parim.isik_id, kandidaadid: [...parim.kandidaadid], kindlus: parim.kindlus };
}
