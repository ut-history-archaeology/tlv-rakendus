/**
 * EstNLTK-JSON korpuse kuju ja väikesed puhtad abifunktsioonid (ptk 3.2).
 */
import type { Vahemik } from "./types";

/** `[a,b]` või (enveloping: words) `[[a,b],[c,d],…]`. */
export type BaseSpan = [number, number] | [number, number][];

export interface KorpuseSpan<A = Record<string, unknown>> {
  base_span: BaseSpan;
  annotations: A[];
}

export interface KorpuseKiht<A = Record<string, unknown>> {
  name: string;
  attributes: string[];
  enveloping: string | null;
  spans: KorpuseSpan<A>[];
}

export interface KorpuseRelatsioon {
  named_spans: { speaker: [number, number][]; speech: [number, number][] };
  annotations: { speech_type: string; speaker_name: string }[];
}

export interface KorpuseRelKiht {
  name: string;
  relations: KorpuseRelatsioon[];
}

export interface KorpuseFail {
  text: string;
  meta: { meeting_dates: string[]; transcribus_url: string };
  layers: KorpuseKiht[];
  relation_layers?: KorpuseRelKiht[];
}

/** TE-06: base_span → tekstivahemik. `[[a,b],[c,d]]` → `[a,d]`; `[a,b]` → `[a,b]`. */
export function vahemik(bs: BaseSpan): Vahemik {
  if (bs.length === 0) throw new Error("tühi base_span");
  const esimene = bs[0];
  if (typeof esimene === "number") {
    return [esimene, bs[1] as number];
  }
  const viimane = bs[bs.length - 1] as [number, number];
  return [esimene[0], viimane[1]];
}

export function kiht<A = Record<string, unknown>>(fail: KorpuseFail, nimi: string): KorpuseKiht<A> {
  const k = fail.layers.find((l) => l.name === nimi);
  if (!k) throw new Error(`kiht "${nimi}" puudub`);
  return k as unknown as KorpuseKiht<A>;
}

export function relKiht(fail: KorpuseFail, nimi: string): KorpuseRelKiht | null {
  return fail.relation_layers?.find((l) => l.name === nimi) ?? null;
}

/** EELDUS E-03: sõna = words-span, mis sisaldab vähemalt ühte tähte või numbrit. */
export function onSona(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

/**
 * TE-14: päevakorrapunkti pealkiri ilma algusnumbrita ("1." / "I." / "3 ja 4." / "II. ja III.")
 * ja reavahetused tühikuteks.
 */
export function puhastaPealkiri(toor: string): string {
  const yhelReal = toor.replace(/\s+/g, " ").trim();
  // araabia või rooma number (või mitu: "3 ja 4.", "II. ja III.", "4. ja 5.") punktiga lõpus
  const number = "(?:\\d+|[IVXLCDM]+)\\.?";
  const re = new RegExp(`^${number}(?:\\s*(?:ja|,|–|-)\\s*${number})*\\.\\s*`);
  const puhas = yhelReal.replace(re, "");
  return puhas === "" ? yhelReal : puhas;
}

/** Transkribuse URL-i lõpunumber (`…/pages/<n>`); null, kui ei leia. */
export function transkribusLehenumber(url: string): number | null {
  const m = /\/pages\/(\d+)\/?$/.exec(url);
  return m ? Number(m[1]) : null;
}
