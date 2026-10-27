/**
 * Koosseisude läbiv värvipalett (andmeloogika erireegel 4).
 * Sama värv kõikjal: ajatelg, kaardid, karjääririba, diagrammid.
 */
export const KOOSSEISU_VARVID: Record<string, string> = {
  "1917-1919": "#9a3412",
  "1919-1921": "#0e7490",
  "1921-1923": "#16a34a",
  "1924-1926": "#7c3aed",
  "1927-1929": "#db2777",
  "1930-1934": "#2563eb",
  "1934-1939": "#ca8a04",
  "1940": "#dc2626",
  "1940-1941": "#6b7280",
};

export function koosseisuVarv(koosseisId: string): string {
  return KOOSSEISU_VARVID[koosseisId] ?? "#94a3b8";
}

/** Koosolekuvormide värvid (KO-01 sagedusdiagramm). */
export const VORMI_VARVID: Record<string, string> = {
  korraline: "#2563eb",
  erakorraline: "#dc2626",
  "linnavalitsus linnavolikogu ülesandeis": "#6b7280",
  pidulik: "#ca8a04",
  määramata: "#cbd5e1",
};

/**
 * Nimeüksuste tüüpide värvid (IN-06). Eristatavad koosseisude paletist; värv ei ole
 * ainus tunnus — igal tüübil on oma allajoonituse stiil (`OLEMI_STIILID`).
 */
export type OlemiTyyp = "PER" | "ORG" | "LOC" | "MONEY" | "POSITION";

export const OLEMI_VARVID: Record<OlemiTyyp, string> = {
  PER: "#1d4ed8",      // sinine
  ORG: "#b45309",      // pruunoranž
  LOC: "#15803d",      // roheline
  MONEY: "#7e22ce",    // lilla
  POSITION: "#be123c", // punakas
};

export const OLEMI_STIILID: Record<OlemiTyyp, "solid" | "dotted" | "dashed" | "double" | "wavy"> = {
  PER: "solid",
  ORG: "dashed",
  LOC: "dotted",
  MONEY: "double",
  POSITION: "wavy",
};

export const OLEMI_NIMED: Record<OlemiTyyp, string> = {
  PER: "isik",
  ORG: "organisatsioon",
  LOC: "koht",
  MONEY: "rahasumma",
  POSITION: "ametinimetus",
};
