/**
 * Isikute nimekirja (/isikud/, IS5-02…IS5-04) ja koosseisu liikmete tabeli ühine loogika:
 * filter, sortimine, URL-parameetrite aliased ja ekspordi veerud. Puhtad funktsioonid (TE5-05).
 */
import type { IsikuRida } from "./types";
import type { EkspordiVeerg } from "./export";
import { normalizeOtsing } from "./format";

/* ───────────── URL-parameetrid ───────────── */

export interface SortVeerg {
  key: string;
  desc: boolean;
}

/**
 * Omaniku otsus 20.11.2026 (variant A): URL-i kirjutatakse senised `koosseisud` (eraldaja `,`) ja
 * `nimekirjad` (eraldaja `|`); lisaks loetakse lähteülesande kujud `koosseis` ja `nimekiri`.
 */
export const ISIKUTE_ALIASED: Record<string, { voti: string; eraldaja: string }> = {
  koosseis: { voti: "koosseisud", eraldaja: "," },
  nimekiri: { voti: "nimekirjad", eraldaja: "|" },
};

/**
 * Aliased kanoonilisteks võtmeteks. Kanooniline võti võidab, kui mõlemad on olemas; korduvad
 * aliase väärtused (`?koosseis=a&koosseis=b`) liidetakse eraldajaga.
 */
export function normaliseeriParameetrid(
  p: URLSearchParams,
  aliased: Record<string, { voti: string; eraldaja: string }> = {}
): URLSearchParams {
  const uus = new URLSearchParams(p);
  for (const [alias, { voti, eraldaja }] of Object.entries(aliased)) {
    const vaartused = uus.getAll(alias).filter(Boolean);
    uus.delete(alias);
    if (vaartused.length > 0 && !uus.has(voti)) uus.set(voti, vaartused.join(eraldaja));
  }
  return uus;
}

/** `sort` parameeter: "võti:desc,võti2:asc" (senine) või "võti-desc" (lähteülesande kuju); max 3. */
export function loeSort(s: string | null): SortVeerg[] {
  if (!s) return [];
  return s
    .split(",")
    .flatMap((osa): SortVeerg[] => {
      const t = osa.trim();
      if (!t) return [];
      if (t.includes(":")) {
        const [key, suund] = t.split(":");
        return key ? [{ key, desc: suund === "desc" }] : [];
      }
      const m = t.match(/^(.+)-(asc|desc)$/);
      if (m) return [{ key: m[1], desc: m[2] === "desc" }];
      return [{ key: t, desc: false }];
    })
    .slice(0, 3);
}

/* ───────────── Filter ja sortimine ───────────── */

export interface IsikuFiltrid {
  q: string;
  koosseisud: string[];
  nimekirjad: string[];
  juhataja: boolean;
}

/** URL-i / seisu stringid → filtrid. */
export function isikuFiltrid(f: Record<string, string>): IsikuFiltrid {
  return {
    q: f.q ?? "",
    koosseisud: f.koosseisud ? f.koosseisud.split(",").filter(Boolean) : [],
    nimekirjad: f.nimekirjad ? f.nimekirjad.split("|").filter(Boolean) : [],
    juhataja: f.juhataja === "1",
  };
}

/** IS-02 otsing (perenimi, eesnimi, alternatiivkujud, osaline vaste) + koosseis/nimekiri/juhataja. */
export function filtreeriIsikud(read: IsikuRida[], f: IsikuFiltrid): IsikuRida[] {
  const q = normalizeOtsing(f.q.trim());
  return read.filter((r) => {
    if (q) {
      const nimi = normalizeOtsing(`${r.perenimi} ${r.eesnimi} ${r.alt_perenimi} ${r.alt_eesnimi}`);
      if (!nimi.includes(q)) return false;
    }
    if (f.koosseisud.length > 0 && !r.koosseisud.some((k) => f.koosseisud.includes(k))) return false;
    if (f.nimekirjad.length > 0 && !f.nimekirjad.includes(String(r.peamine_nimekiri_id))) return false;
    if (f.juhataja && !r.oli_juhataja) return false;
    return true;
  });
}

/** Sortimisvõtme väärtus; tundmatu võti → null (ei viska viga). */
export function isikuSortVaartus(r: IsikuRida, key: string): string | number | null {
  switch (key) {
    case "perenimi": return r.perenimi;
    case "eesnimi": return r.eesnimi;
    // PA-06: "?" sorditakse 0 järele
    case "koosseise": return r.liikmekirje_puudub ? 0.5 : r.koosseise;
    case "esimene_koosseis": return r.esimene_koosseis || null;
    case "viimane_koosseis": return r.viimane_koosseis || null;
    case "peamine_nimekiri": return r.peamine_nimekiri || null;
    default: return null;
  }
}

/** IS5-03 vaikejärjestus: perenimi A–Z (eesti tähestik), siis eesnimi. */
export const VAIKE_SORT: SortVeerg[] = [
  { key: "perenimi", desc: false },
  { key: "eesnimi", desc: false },
];

/* ───────────── Eksport (IS-09, EX-07, EX-08) ───────────── */

export const ISIKUTE_EKSPORDI_VEERUD: EkspordiVeerg[] = [
  { key: "isik_id", pealkiri: "isik_id" },
  { key: "perenimi", pealkiri: "Perenimi" },
  { key: "eesnimi", pealkiri: "Eesnimi" },
  { key: "alt_perenimi", pealkiri: "Alt. perenimi" },
  { key: "alt_eesnimi", pealkiri: "Alt. eesnimi" },
  { key: "isanimi", pealkiri: "Isanimi" },
  { key: "sugu", pealkiri: "Sugu" },
  { key: "synd_kuupaev", pealkiri: "Sünniaeg" },
  { key: "synd_tuletatud", pealkiri: "Sünniaeg tuletatud" },
  { key: "surm_kuupaev", pealkiri: "Surmaaeg" },
  { key: "koosseise", pealkiri: "Koosseisude arv" },
  { key: "liikmekirje_puudub", pealkiri: "Liikmeks saamise kirje puudub (tõendid)" },
  { key: "koosseisud", pealkiri: "Koosseisud" },
  { key: "esimene_koosseis", pealkiri: "Esimene koosseis" },
  { key: "viimane_koosseis", pealkiri: "Viimane koosseis" },
  { key: "peamine_nimekiri", pealkiri: "Peamine nimekiri" },
  { key: "peamine_nimekiri_id", pealkiri: "nimekiri_id" },
  { key: "peamine_nimekiri_toor", pealkiri: "Peamine nimekiri (toorkuju)" },
  { key: "peamine_nimekiri_kontrollida", pealkiri: "Nimekirja vaste kontrollimisel" },
  { key: "oli_juhataja", pealkiri: "Oli juhataja" },
  { key: "aadressid", pealkiri: "Teadaolevad aadressid" },
  { key: "wikidata", pealkiri: "Wikidata" },
  { key: "AKL_ID", pealkiri: "AKL ID" },
  { key: "arhiiviviited", pealkiri: "Arhiiviviited" },
];

export function isikuEkspordiRida(r: IsikuRida) {
  return {
    isik_id: r.isik_id,
    perenimi: r.perenimi,
    eesnimi: r.eesnimi,
    alt_perenimi: r.alt_perenimi,
    alt_eesnimi: r.alt_eesnimi,
    isanimi: r.isanimi,
    sugu: r.sugu,
    synd_kuupaev: r.synd_kuupaev,
    synd_tuletatud: r.synd_tuletatud,
    surm_kuupaev: r.surm_kuupaev,
    koosseise: r.koosseise,
    liikmekirje_puudub: r.liikmekirje_puudub,
    koosseisud: r.koosseisud.join(", "),
    esimene_koosseis: r.esimene_koosseis,
    viimane_koosseis: r.viimane_koosseis,
    peamine_nimekiri: r.peamine_nimekiri,
    peamine_nimekiri_id: r.peamine_nimekiri_id,
    peamine_nimekiri_toor: r.peamine_nimekiri_toor,
    peamine_nimekiri_kontrollida: r.peamine_nimekiri_kontrollida ? "jah" : "",
    oli_juhataja: r.oli_juhataja ? "jah" : "ei",
    aadressid: r.aadressid.join(" | "),
    wikidata: r.wikidata,
    AKL_ID: r.AKL_ID,
    arhiiviviited: r.arhiiviviited,
  };
}

/** "6 koosseisu" / "1 koosseis". */
export function koosseiseTekst(n: number): string {
  return `${n} ${n === 1 ? "koosseis" : "koosseisu"}`;
}
