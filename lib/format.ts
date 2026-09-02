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
