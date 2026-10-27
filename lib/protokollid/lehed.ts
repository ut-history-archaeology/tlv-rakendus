/**
 * ET-09 lehtede ja piltide sidumine, ET-05 Transkribuse/pildi URL-id (TE-16, TE-17).
 */
import type { Leht, Vahemik } from "./types";

/** data/protokolli_lehed.csv rida (tüübistatud). */
export interface LeheRida {
  protokoll: string;
  jrk: number;
  arhiiviviide: string;
  lehekulg: string;
  xml_file: string;
  pilt: string;
  transkribus_lk: number;
  tekstita: boolean;
}

export interface LehtedeTulemus {
  lehed: Leht[];
  hoiatused: string[];
}

/**
 * Seob ühe protokolli CSV read korpuse `textline_info` lehevahemikega (xml_file → [algus, lõpp]).
 * Vead: jrk pole pidev 1…n; CSV xml_file puudub korpuses; korpuse xml_file puudub CSV-s;
 * tekstiga lehtede vahemikud ei kasva või kattuvad.
 */
export function seoLehed(
  read: LeheRida[],
  xmlVahemikud: Map<string, Vahemik>,
  /** xml_file-d, mille page_class on "LIST OR TABULAR" (E-09) */
  loendXml: Set<string> = new Set()
): LehtedeTulemus {
  const hoiatused: string[] = [];
  const sorted = [...read].sort((a, b) => a.jrk - b.jrk);
  const protokoll = sorted[0]?.protokoll ?? "?";
  sorted.forEach((r, i) => {
    if (r.jrk !== i + 1) throw new Error(`${protokoll}: lehtede jrk ei ole pidev (oodatud ${i + 1}, saadud ${r.jrk})`);
  });
  const csvXml = new Set(sorted.filter((r) => r.xml_file).map((r) => r.xml_file));
  for (const x of xmlVahemikud.keys()) {
    if (!csvXml.has(x)) throw new Error(`${protokoll}: korpuse xml_file ${x} puudub protokolli_lehed.csv-s`);
  }
  const pildiLoend = new Map<string, number>();
  for (const r of sorted) pildiLoend.set(r.pilt, (pildiLoend.get(r.pilt) ?? 0) + 1);

  const lehed: Leht[] = [];
  let eelmineLopp = -1;
  for (const r of sorted) {
    let algus: number | null = null;
    let lopp: number | null = null;
    if (!r.tekstita) {
      if (!r.xml_file) throw new Error(`${protokoll} jrk ${r.jrk}: tekstiga leht ilma xml_file-ta`);
      const v = xmlVahemikud.get(r.xml_file);
      if (!v) throw new Error(`${protokoll} jrk ${r.jrk}: xml_file ${r.xml_file} puudub korpuses`);
      [algus, lopp] = v;
      if (algus < eelmineLopp) {
        throw new Error(`${protokoll} jrk ${r.jrk}: lehe vahemik [${algus},${lopp}) kattub eelmisega või ei ole kasvav`);
      }
      eelmineLopp = lopp;
    } else {
      if (r.xml_file && xmlVahemikud.has(r.xml_file)) {
        hoiatused.push(`${protokoll} jrk ${r.jrk}: tekstita=1, aga xml_file on korpuses olemas`);
      }
      hoiatused.push(`${protokoll}: tekstita leht lk ${r.lehekulg} (jrk ${r.jrk})`);
    }
    const jagatud = (pildiLoend.get(r.pilt) ?? 0) > 1;
    if (jagatud && r.lehekulg === r.lehekulg.replace(/[a-z]$/, "")) {
      hoiatused.push(`${protokoll}: jagatud leht lk ${r.lehekulg} (${pildiLoend.get(r.pilt)} rida samal pildil)`);
    }
    lehed.push({
      jrk: r.jrk,
      lk: r.lehekulg,
      arhiiviviide: r.arhiiviviide,
      algus,
      lopp,
      pilt: r.pilt,
      transkribus_lk: r.transkribus_lk,
      tekstita: r.tekstita,
      jagatud,
      loend: !r.tekstita && loendXml.has(r.xml_file),
    });
  }
  return { lehed, hoiatused };
}

/** `textline_info` spanid → xml_file-d, millel vähemalt üks rida on klassiga "LIST OR TABULAR". */
export function loendLehed(read: { xml_file: string; page_class?: string }[]): Set<string> {
  const s = new Set<string>();
  for (const r of read) if (r.page_class === "LIST OR TABULAR") s.add(r.xml_file);
  return s;
}

/** `textline_info` spanid (xml_file, vahemik) → xml_file → [esimese rea algus, viimase rea lõpp]. */
export function xmlVahemikud(read: { xml_file: string; vahemik: Vahemik }[]): Map<string, Vahemik> {
  const m = new Map<string, Vahemik>();
  for (const r of read) {
    const v = m.get(r.xml_file);
    if (!v) m.set(r.xml_file, [r.vahemik[0], r.vahemik[1]]);
    else {
      v[0] = Math.min(v[0], r.vahemik[0]);
      v[1] = Math.max(v[1], r.vahemik[1]);
    }
  }
  return m;
}

/** ET-05: protokolli Transkribuse URL + CSV `transkribus_lk` → lehe URL. Arhiivi lk EI satu URL-i. */
export function transkribusLeheUrl(dokumendiUrl: string, transkribusLk: number): string {
  if (!/\/pages\/\d+\/?$/.test(dokumendiUrl)) {
    throw new Error(`Transkribuse URL ei lõpe /pages/<n>: ${dokumendiUrl}`);
  }
  return dokumendiUrl.replace(/\/pages\/\d+\/?$/, `/pages/${transkribusLk}`);
}

/** Pildi URL: basePath + /pildid/<1200|300>/ + pilt. */
export function pildiUrl(basePath: string, suurus: 1200 | 300, pilt: string): string {
  const bp = basePath.replace(/\/$/, "");
  return `${bp}/pildid/${suurus}/${pilt}`;
}

/**
 * `era2966_002_0000074_00243_t.xml` → "ERA.2966.2.74"; `…_0000064a_…` → "ERA.2966.2.64a";
 * `era2966_009_0000008_…` → "ERA.2966.9.8". Tundmatu kuju → null.
 */
export function sailikXmlist(xmlFile: string): string | null {
  const m = /^([a-z]+)(\d+)_(\d+)_(\d+)([a-z]?)_/i.exec(xmlFile);
  if (!m) return null;
  const [, arhiiv, fond, nimistu, sailik, taht] = m;
  return `${arhiiv.toUpperCase()}.${Number(fond)}.${Number(nimistu)}.${Number(sailik)}${taht}`;
}

// ---------------------------------------------------------------------------
// PT-05 sünkroonimine (TE-18)
// ---------------------------------------------------------------------------

/** Nähtava lehemarkeri asukoht: `offset` = markeri ülaserv lugemisala suhtes (px). */
export interface MarkeriKoht {
  lk: string;
  offset: number;
}

/**
 * Tekst → pilt: aktiivne leht on see, mille NÄHTAV marker on viimasena ülalpool kerimiskohta
 * (lugemisala ülemine kolmandik). Kokkuklapitud punktide markereid ei anta ette (nähtamatud).
 * Tekstita leht ei saa kerimisest aktiivseks (E-14). Enne esimest markerit → esimene tekstiga leht.
 */
export function aktiivneLeht(lehed: Leht[], markerid: MarkeriKoht[], kerimiskoht: number): string | null {
  if (lehed.length === 0) return null;
  const tekstiga = new Set(lehed.filter((l) => !l.tekstita).map((l) => l.lk));
  let parim: MarkeriKoht | null = null;
  for (const m of markerid) {
    if (!tekstiga.has(m.lk)) continue;
    if (m.offset <= kerimiskoht && (!parim || m.offset > parim.offset)) parim = m;
  }
  if (parim) return parim.lk;
  const esimene = lehed.find((l) => !l.tekstita) ?? lehed[0];
  return esimene.lk;
}

/** `?lk=` väärtus → leht või null (kehtetu). */
export function leiaLeht(lehed: Leht[], lk: string | null | undefined): Leht | null {
  if (!lk) return null;
  return lehed.find((l) => l.lk === lk) ?? null;
}

/** Eelmine (-1) / järgmine (+1) leht järjekorras; servas null. */
export function naaberLeht(lehed: Leht[], lk: string, suund: -1 | 1): Leht | null {
  const i = lehed.findIndex((l) => l.lk === lk);
  if (i < 0) return null;
  return lehed[i + suund] ?? null;
}

/** Jagatud lehe "sama leht kui …" silt: teised sama pildiga lehed. */
export function samaPildiLehed(lehed: Leht[], leht: Leht): string[] {
  return lehed.filter((l) => l.pilt === leht.pilt && l.lk !== leht.lk).map((l) => l.lk);
}
