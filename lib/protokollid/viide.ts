/**
 * PT-09 "Kopeeri viide" (TE-09).
 */
import { kuupaevEesti } from "../format";

export interface ViiteAndmed {
  /** 1 või 2 ISO-kuupäeva */
  kuupaevad: string[];
  arhiiviviide: string;
  /** arhiivi lk-d (esimene ja viimane; ühe lehe viitel samad) */
  esimeneLk: string;
  viimaneLk?: string;
  transkribusUrl: string;
  /** rakenduse lehe URL (ilma #-ta) */
  leheUrl: string;
  punktNr?: number | null;
  /** vaatamise kuupäev ISO; vaikimisi täna */
  vaadatud?: string;
}

/** "8. september 1930" / "29.–30. märts 1920" / "23. veebruar 1920 – 1. märts 1920". */
export function kuupaevadEesti(kuupaevad: string[]): string {
  const [a, b] = kuupaevad;
  if (!a) return "";
  if (!b || b === a) return kuupaevEesti(a);
  if (a.slice(0, 7) === b.slice(0, 7)) {
    return `${Number(a.slice(8, 10))}.–${kuupaevEesti(b)}`;
  }
  return `${kuupaevEesti(a)} – ${kuupaevEesti(b)}`;
}

export function koostaViide(v: ViiteAndmed): string {
  const punkt = v.punktNr !== undefined && v.punktNr !== null ? `, päevakorrapunkt ${v.punktNr}` : "";
  const lk =
    v.viimaneLk && v.viimaneLk !== v.esimeneLk ? `lk ${v.esimeneLk}–${v.viimaneLk}` : `lk ${v.esimeneLk}`;
  const ankur = v.punktNr !== undefined && v.punktNr !== null ? `#p${v.punktNr}` : "";
  const vaadatud = kuupaevEesti(v.vaadatud ?? new Date().toISOString().slice(0, 10));
  return (
    `Tartu Linnavolikogu protokoll, ${kuupaevadEesti(v.kuupaevad)}${punkt}. ` +
    `Rahvusarhiiv, ${v.arhiiviviide}, ${lk}. Transkribus: ${v.transkribusUrl}. ` +
    `Tartu Linnavolikogu andmestik, 2026, ${v.leheUrl}${ankur} (vaadatud ${vaadatud}).`
  );
}
