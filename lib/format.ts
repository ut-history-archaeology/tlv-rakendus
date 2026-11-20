/** Kuupäevade ja tekstide vormindus. Osalisi kuupäevi EI teisendata (erireegel 3). */

const KUUD = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember",
];

/** ISO-kuupäev (võib olla osaline: YYYY või YYYY-MM) → eestikeelne kuvakuju. */
export function kuupaevEesti(iso: string | null | undefined): string {
  if (!iso) return "";
  const osad = iso.split("-");
  if (osad.length === 1) return osad[0]; // ainult aasta
  if (osad.length === 2) return `${KUUD[Number(osad[1]) - 1]} ${osad[0]}`;
  const [a, k, p] = osad;
  return `${Number(p)}. ${KUUD[Number(k) - 1]} ${a}`;
}

const KUUD_ELATIIV = [
  "jaanuarist", "veebruarist", "märtsist", "aprillist", "maist", "juunist",
  "juulist", "augustist", "septembrist", "oktoobrist", "novembrist", "detsembrist",
];

/** "1934-04-09" → "9. aprillist 1934" ("alates …" jaoks). */
export function kuupaevEestiAlates(iso: string): string {
  const [a, k, p] = iso.split("-");
  if (!k) return a;
  return `${p ? `${Number(p)}. ` : ""}${KUUD_ELATIIV[Number(k) - 1]} ${a}`;
}

/** Lühivorm PP.KK.AAAA (tabelites); osaline kuupäev jääb nagu on. */
export function kuupaevLyhike(iso: string | null | undefined): string {
  if (!iso) return "";
  const osad = iso.split("-");
  if (osad.length < 3) return iso;
  return `${osad[2]}.${osad[1]}.${osad[0]}`;
}

/** Eluaastad kujul "1871–?" / "1871–1943" / "?–1943". */
export function eluaastad(synd: string, surm: string): string {
  const s = synd ? synd.slice(0, 4) : "";
  const m = surm ? surm.slice(0, 4) : "";
  if (!s && !m) return "";
  return `${s || "?"}–${m || "?"}`;
}

/** Diakriitika- ja tõstutundetu normaliseering otsinguks (sh w→v). */
export function normalizeOtsing(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/w/g, "v");
}

export function taisnimi(p: { eesnimi: string; perenimi: string }): string {
  return [p.eesnimi, p.perenimi].filter(Boolean).join(" ");
}

/** Tänase kuupäeva ISO-kuju failinimedesse (EX-07). */
export function tanaISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Wikidata QID mis tahes sisendkujust (UX-02): "Q123", "https://www.wikidata.org/wiki/Q123",
 * "http://www.wikidata.org/entity/Q123" → "Q123". Muu → "".
 */
export function wikidataQid(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  const m = /^(?:https?:\/\/(?:www\.)?wikidata\.org\/(?:wiki|entity)\/)?(Q\d+)\/?$/i.exec(s);
  return m ? m[1].toUpperCase() : "";
}

/**
 * PR5-03: kuupäevade lühikuju ajaloo veerus. ["1926-12-18","1926-12-19"] → "18.–19.12.1926";
 * kuu vahetusel "30.11.–01.12.1926"; aasta vahetusel "31.12.1926–01.01.1927"; üks → "07.02.1927".
 * Osaline kuupäev jääb nagu on.
 */
export function kuupaevadLyhike(kuupaevad: string[]): string {
  const eri = [...new Set(kuupaevad.filter(Boolean))].sort();
  if (eri.length === 0) return "";
  const a = eri[0];
  const b = eri[eri.length - 1];
  if (a === b) return kuupaevLyhike(a);
  if (a.length < 10 || b.length < 10) return `${kuupaevLyhike(a)}–${kuupaevLyhike(b)}`;
  const [aa, ak, ap] = a.split("-");
  const [ba, bk, bp] = b.split("-");
  if (aa === ba && ak === bk) return `${ap}.–${bp}.${bk}.${ba}`;
  if (aa === ba) return `${ap}.${ak}.–${bp}.${bk}.${ba}`;
  return `${kuupaevLyhike(a)}–${kuupaevLyhike(b)}`;
}
