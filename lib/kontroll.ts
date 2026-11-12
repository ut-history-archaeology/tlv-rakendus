import type { Andmestik, Muutus } from "./types";
import { isikuKoosseisud, koosseisuLiikmedKokku, liikmedKuupaeval } from "./derive";

/**
 * Kontrollleht `/kontroll` (4. etapp, ptk 5a): tabelite omavahelise vastavuse kontrollid.
 * Kõik liikmelisuse arvutused erireegli 1 järgi (`liikmedKuupaeval`), nagu rakenduses.
 * Leiud on andmete omanikule — midagi ei parandata ega tõlgendata.
 */

/** 1940–1941 linnavalitsuse isikud pole tabelis (liikmelisust ei saa tuletada) → kontrollidest väljas. */
export const KONTROLLITA_KOOSSEIS = "1940-1941";

type Memo = (koosseisId: string, kuupaev: string) => Set<number>;

function liikmelisus(andmed: Andmestik): Memo {
  const vahemalu = new Map<string, Set<number>>();
  return (koosseisId, kuupaev) => {
    const voti = `${koosseisId}|${kuupaev}`;
    let s = vahemalu.get(voti);
    if (!s) {
      s = liikmedKuupaeval(andmed.valimised, andmed.muutused, koosseisId, kuupaev);
      vahemalu.set(voti, s);
    }
    return s;
  };
}

/* ───────────── KT-01 liikmete arv ajas ───────────── */

export interface Kt01Rida {
  koosolek_id: string;
  kuupaev: string;
  koosseis_id: string;
  tuletatud: number;
  /** protokollis kirjas olev suurus (`koosolekud.koosseis_arv`) */
  koosseis_arv: number | null;
  /** tuletatud − protokoll; null, kui protokoll suurust ei ütle */
  erinevus: number | null;
}

export function kt01LiikmeteArv(andmed: Andmestik): Kt01Rida[] {
  const liikmed = liikmelisus(andmed);
  return andmed.koosolekud
    .filter((k) => k.koosseis_id !== KONTROLLITA_KOOSSEIS)
    .sort((a, b) => a.kuupaev.localeCompare(b.kuupaev) || a.koosolek_id.localeCompare(b.koosolek_id))
    .map((k) => {
      const tuletatud = liikmed(k.koosseis_id, k.kuupaev).size;
      return {
        koosolek_id: k.koosolek_id,
        kuupaev: k.kuupaev,
        koosseis_id: k.koosseis_id,
        tuletatud,
        koosseis_arv: k.koosseis_arv,
        erinevus: k.koosseis_arv === null ? null : tuletatud - k.koosseis_arv,
      };
    });
}

/* ───────────── KT-02 kohalolu bilanss ───────────── */

export interface Kt02Rida {
  koosolek_id: string;
  kuupaev: string;
  koosseis_id: string;
  /** 1 või 2 (kahepäevase koosoleku teine päev) */
  paev: 1 | 2;
  kohal: number;
  /** protokollis nimetatud puudujad (kõik nimed, ka sidumata) */
  puudujaid: number;
  tuletatud: number;
  /** kohal + puudujad − tuletatud */
  erinevus: number;
}

export function kt02KohaloluBilanss(andmed: Andmestik): Kt02Rida[] {
  const liikmed = liikmelisus(andmed);
  const puudujaid = new Map<string, number>();
  for (const o of andmed.osavott) {
    if (o.staatus === "puudub") puudujaid.set(o.koosolek_id, (puudujaid.get(o.koosolek_id) ?? 0) + 1);
  }
  const read: Kt02Rida[] = [];
  for (const k of andmed.koosolekud) {
    if (k.koosseis_id === KONTROLLITA_KOOSSEIS) continue;
    const paevad: [1 | 2, number | null, string][] = [
      [1, k.kohal_arv, k.kuupaev],
      [2, k.kohal_arv_2paev, k.kuupaev_lopp],
    ];
    for (const [paev, kohal, kuupaev] of paevad) {
      if (kohal === null || !kuupaev) continue;
      const p = puudujaid.get(k.koosolek_id) ?? 0;
      const tuletatud = liikmed(k.koosseis_id, kuupaev).size;
      read.push({
        koosolek_id: k.koosolek_id, kuupaev, koosseis_id: k.koosseis_id, paev,
        kohal, puudujaid: p, tuletatud, erinevus: kohal + p - tuletatud,
      });
    }
  }
  return read.sort((a, b) => a.kuupaev.localeCompare(b.kuupaev) || a.koosolek_id.localeCompare(b.koosolek_id));
}

/* ───────────── KT-03 muutuste loogika ───────────── */

export type Kt03Tyyp = "a" | "b" | "c" | "d" | "e";

export const KT03_NIMI: Record<Kt03Tyyp, string> = {
  a: "lahkumine/peatamine isikult, kes polnud liige",
  b: "liitumine isikule, kes oli juba liige",
  c: "vahetuse paar ei klapi",
  d: "muutus väljaspool koosseisu ajavahemikku",
  e: "muutus ilma isikuta",
};

export interface Kt03Leid {
  tyyp: Kt03Tyyp;
  muutus_id: number;
  kuupaev: string;
  koosseis_id: string;
  isik_id: number | null;
  liik: Muutus["liik"];
  kirjeldus: string;
}

export interface Kt03Tulemus {
  leiud: Kt03Leid[];
  /** esimese koosoleku kinnitusread (UX-06 "kinnitamine") koosseisu kaupa — ei ole vead */
  kinnitusread: Map<string, number>;
}

const jarjesta = (a: Muutus, b: Muutus) =>
  a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : a.muutus_id - b.muutus_id;

export function kt03MuutusteLoogika(andmed: Andmestik): Kt03Tulemus {
  const leiud: Kt03Leid[] = [];
  const kinnitusread = new Map<string, number>();
  const leid = (tyyp: Kt03Tyyp, m: Muutus, kirjeldus: string) =>
    leiud.push({
      tyyp, muutus_id: m.muutus_id, kuupaev: m.kuupaev, koosseis_id: m.koosseis_id,
      isik_id: m.isik_id, liik: m.liik, kirjeldus,
    });

  for (const k of andmed.koosseisud) {
    const valitud = new Set(
      andmed.valimised.filter((v) => v.koosseis_id === k.koosseis_id && v.roll === "valitud").map((v) => v.isik_id)
    );
    const liikmed = new Set(valitud);
    const read = andmed.muutused
      .filter((m) => m.koosseis_id === k.koosseis_id && m.isik_id !== null && m.kuupaev)
      .sort(jarjesta);
    for (const m of read) {
      const id = m.isik_id!;
      if (m.liik === "lahkumine" || m.liik === "peatamine") {
        if (!liikmed.has(id)) leid("a", m, `${m.liik} ${m.kuupaev}, kuid isik polnud sel hetkel liige (valitud ega liitunud)`);
        liikmed.delete(id);
      } else if (m.liik === "liitumine") {
        const kinnitus =
          !!k.esimene_koosolek && m.kuupaev === k.esimene_koosolek && m.asendatav_ID === null && valitud.has(id);
        if (kinnitus) kinnitusread.set(k.koosseis_id, (kinnitusread.get(k.koosseis_id) ?? 0) + 1);
        else if (liikmed.has(id)) leid("b", m, `liitumine ${m.kuupaev}, kuid isik oli juba liige`);
        liikmed.add(id);
      } else if (m.liik === "liitumine&lahkumine") {
        liikmed.delete(id);
      }
    }
  }

  // (c) vahetuse paarid: lahkuja A (asendaja B) ↔ liituja B (asendatav A)
  const lahkujad = (m: Muutus) => m.liik === "lahkumine" || m.liik === "liitumine&lahkumine" || m.liik === "peatamine";
  const liitujad = (m: Muutus) => m.liik === "liitumine" || m.liik === "liitumine&lahkumine";
  for (const m of andmed.muutused) {
    if (m.isik_id === null) continue;
    if (lahkujad(m) && m.asendaja_ID !== null) {
      const vaste = andmed.muutused.filter(
        (x) => x.isik_id === m.asendaja_ID && liitujad(x) && x.asendatav_ID === m.isik_id
      );
      if (vaste.length === 0) leid("c", m, `asendaja ${m.asendaja_ID}: vastavat liitumist (asendatav ${m.isik_id}) pole`);
      else if (!vaste.some((x) => x.koosseis_id === m.koosseis_id))
        leid("c", m, `asendaja ${m.asendaja_ID} liitumine (#${vaste[0].muutus_id}) on teises koosseisus (${vaste[0].koosseis_id})`);
    }
    if (liitujad(m) && m.asendatav_ID !== null) {
      const vaste = andmed.muutused.filter(
        (x) => x.isik_id === m.asendatav_ID && lahkujad(x) && x.asendaja_ID === m.isik_id
      );
      if (vaste.length === 0) leid("c", m, `asendatav ${m.asendatav_ID}: vastavat lahkumist (asendaja ${m.isik_id}) pole`);
      else if (!vaste.some((x) => x.koosseis_id === m.koosseis_id))
        leid("c", m, `asendatava ${m.asendatav_ID} lahkumine (#${vaste[0].muutus_id}) on teises koosseisus (${vaste[0].koosseis_id})`);
    }
  }

  // (d) ajavahemik, (e) isikuta
  for (const m of andmed.muutused) {
    const k = andmed.koosseisud.find((x) => x.koosseis_id === m.koosseis_id);
    const algus = k?.valimised_algus || k?.esimene_koosolek || "";
    const lopp = k?.viimane_koosolek || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.kuupaev)) leid("d", m, `kuupäev "${m.kuupaev}" pole täielik`);
    else if ((algus && m.kuupaev < algus) || (lopp && m.kuupaev > lopp))
      leid("d", m, `${m.kuupaev} ei ole koosseisu ${m.koosseis_id} vahemikus ${algus || "…"}–${lopp || "…"}`);
    if (m.isik_id === null)
      leid("e", m, `isik puudub (allikas: ${[m.eesnimi, m.perenimi].filter(Boolean).join(" ") || "nimeta"})`);
  }

  leiud.sort((a, b) => a.tyyp.localeCompare(b.tyyp) || a.muutus_id - b.muutus_id);
  return { leiud, kinnitusread };
}

/* ───────────── KT-04 osavõtt vs liikmelisus ───────────── */

export interface Kt04Leid {
  tyyp: "mitte_liige" | "nimetamata";
  koosseis_id: string;
  isik_id: number;
  /** mitte_liige: koosolek; nimetamata: tühi */
  koosolek_id: string;
  kuupaev: string;
  staatus: string;
  nimi_toor: string;
  sidumise_kindlus: string;
}

/**
 * (a) protokollis nimetatud kohalolija/puuduja (kindlus kõrge/keskmine), kes koosoleku päeval
 *     (kahepäevasel kummalgi päeval) ei olnud koosseisu liige;
 * (b) liikmed, keda ühelgi koosseisu koosolekul ei nimetata — arvesse lähevad isikud, kes olid
 *     liikmed vähemalt ühel koosolekul, mis loetleb kohalolijad nimeliselt.
 */
export function kt04Osavott(andmed: Andmestik): Kt04Leid[] {
  const liikmed = liikmelisus(andmed);
  const koosolek = new Map(andmed.koosolekud.map((k) => [k.koosolek_id, k]));
  const leiud: Kt04Leid[] = [];
  const nimetatud = new Map<string, Set<number>>();
  const nimelised = new Set<string>();
  for (const o of andmed.osavott) {
    if (o.koosseis_id === KONTROLLITA_KOOSSEIS) continue;
    if (o.staatus === "kohal") nimelised.add(o.koosolek_id);
    if (o.isik_id === null || (o.sidumise_kindlus !== "kõrge" && o.sidumise_kindlus !== "keskmine")) continue;
    const hulk = nimetatud.get(o.koosseis_id) ?? new Set<number>();
    hulk.add(o.isik_id);
    nimetatud.set(o.koosseis_id, hulk);
    const k = koosolek.get(o.koosolek_id);
    const paevad = [k?.kuupaev ?? o.kuupaev, k?.kuupaev_lopp].filter(Boolean) as string[];
    if (!paevad.some((p) => liikmed(o.koosseis_id, p).has(o.isik_id!))) {
      leiud.push({
        tyyp: "mitte_liige", koosseis_id: o.koosseis_id, isik_id: o.isik_id, koosolek_id: o.koosolek_id,
        kuupaev: o.kuupaev, staatus: o.staatus, nimi_toor: o.nimi_toor, sidumise_kindlus: o.sidumise_kindlus,
      });
    }
  }
  for (const k of andmed.koosseisud) {
    if (k.koosseis_id === KONTROLLITA_KOOSSEIS) continue;
    const kontrollitavad = new Set<number>();
    for (const ko of andmed.koosolekud) {
      if (ko.koosseis_id !== k.koosseis_id || !nimelised.has(ko.koosolek_id)) continue;
      for (const id of liikmed(k.koosseis_id, ko.kuupaev)) kontrollitavad.add(id);
    }
    const nim = nimetatud.get(k.koosseis_id) ?? new Set<number>();
    for (const id of [...kontrollitavad].sort((a, b) => a - b)) {
      if (!nim.has(id)) {
        leiud.push({
          tyyp: "nimetamata", koosseis_id: k.koosseis_id, isik_id: id, koosolek_id: "", kuupaev: "",
          staatus: "", nimi_toor: "", sidumise_kindlus: "",
        });
      }
    }
  }
  return leiud;
}

/* ───────────── KT-05 isikud ───────────── */

export interface Kt05Leid {
  tyyp: "kirjeta" | "ainult_isikutes" | "juhataja";
  isik_id: number | null;
  /** kirjeta: esimene koosseis, kus isik tõendites esineb; ainult_isikutes: tühi */
  koosseis_id: string;
  koosolek_id: string;
  kuupaev: string;
  kirjeldus: string;
}

/**
 * (a) PA-06: isikud ilma liikmeks saamise kirjeta (0 koosseisu valitud-ridadest ja liitumistest),
 *     kuigi muutustes või protokollide osavõtus (kõrge/keskmine) on tõendeid liikmelisusest;
 * (b) isikud, kes ei esine üheski teises tabelis (valimised, muutused, osavõtt, juhatajad);
 * (c) juhatajad, kes polnud juhatamise päeval koosseisu liikmed.
 */
export function kt05Isikud(andmed: Andmestik): Kt05Leid[] {
  const leiud: Kt05Leid[] = [];
  const jark = new Map(andmed.koosseisud.map((k, i) => [k.koosseis_id, i]));
  for (const i of andmed.isikud) {
    if (isikuKoosseisud(andmed, i.isik_id).length > 0) continue;
    const muutused = andmed.muutused.filter((m) => m.isik_id === i.isik_id);
    const osavott = andmed.osavott.filter(
      (o) => o.isik_id === i.isik_id && (o.sidumise_kindlus === "kõrge" || o.sidumise_kindlus === "keskmine")
    );
    if (muutused.length === 0 && osavott.length === 0) continue;
    const koosseisud = [...new Set([...muutused.map((m) => m.koosseis_id), ...osavott.map((o) => o.koosseis_id)])]
      .sort((a, b) => (jark.get(a) ?? 99) - (jark.get(b) ?? 99));
    const toendid = [
      ...muutused.map((m) => `${m.liik} ${m.kuupaev} (#${m.muutus_id})`),
      ...(osavott.length ? [`protokollides nimetatud ${osavott.length} korda`] : []),
    ];
    leiud.push({
      tyyp: "kirjeta", isik_id: i.isik_id, koosseis_id: koosseisud[0] ?? "", koosolek_id: "", kuupaev: "",
      kirjeldus: toendid.join("; "),
    });
  }

  const mujal = new Set<number>();
  for (const v of andmed.valimised) mujal.add(v.isik_id);
  for (const m of andmed.muutused) for (const id of [m.isik_id, m.asendaja_ID, m.asendatav_ID]) if (id !== null) mujal.add(id);
  for (const o of andmed.osavott) if (o.isik_id !== null) mujal.add(o.isik_id);
  for (const j of andmed.juhatajad) if (j.isik_id !== null) mujal.add(j.isik_id);
  for (const i of andmed.isikud) {
    if (!mujal.has(i.isik_id)) {
      leiud.push({
        tyyp: "ainult_isikutes", isik_id: i.isik_id, koosseis_id: "", koosolek_id: "", kuupaev: "",
        kirjeldus: "ei esine valimistes, muutustes, osavõtus ega juhatajate seas",
      });
    }
  }

  const liikmed = liikmelisus(andmed);
  const koosolek = new Map(andmed.koosolekud.map((k) => [k.koosolek_id, k]));
  for (const j of andmed.juhatajad) {
    const k = koosolek.get(j.koosolek_id);
    if (!k || j.isik_id === null || k.koosseis_id === KONTROLLITA_KOOSSEIS) continue;
    if (!liikmed(k.koosseis_id, k.kuupaev).has(j.isik_id)) {
      leiud.push({
        tyyp: "juhataja", isik_id: j.isik_id, koosseis_id: k.koosseis_id, koosolek_id: k.koosolek_id,
        kuupaev: k.kuupaev, kirjeldus: `${j.juhataja_nimi} juhatas, kuid polnud sel päeval liige`,
      });
    }
  }
  return leiud;
}

/* ───────────── KT-06 kokkuvõte ───────────── */

export const KONTROLLID = [
  { voti: "kt01", silt: "KT-01", nimi: "liikmete arv ≠ protokoll" },
  { voti: "kt02", silt: "KT-02", nimi: "kohalolu bilanss" },
  { voti: "kt03a", silt: "KT-03a", nimi: KT03_NIMI.a },
  { voti: "kt03b", silt: "KT-03b", nimi: KT03_NIMI.b },
  { voti: "kt03c", silt: "KT-03c", nimi: KT03_NIMI.c },
  { voti: "kt03d", silt: "KT-03d", nimi: KT03_NIMI.d },
  { voti: "kt03e", silt: "KT-03e", nimi: KT03_NIMI.e },
  { voti: "kt04a", silt: "KT-04a", nimi: "nimetatud, kuid polnud liige" },
  { voti: "kt04b", silt: "KT-04b", nimi: "liige, keda ei nimetata" },
  { voti: "kt05a", silt: "KT-05a", nimi: "liikmeks saamise kirje puudub" },
  { voti: "kt05b", silt: "KT-05b", nimi: "ainult isikute tabelis" },
  { voti: "kt05c", silt: "KT-05c", nimi: "juhataja polnud liige" },
] as const;

export type KontrolliVoti = (typeof KONTROLLID)[number]["voti"];

export interface Kontrollid {
  kt01: Kt01Rida[];
  kt02: Kt02Rida[];
  kt03: Kt03Tulemus;
  kt04: Kt04Leid[];
  kt05: Kt05Leid[];
}

export function kontrollid(andmed: Andmestik): Kontrollid {
  return {
    kt01: kt01LiikmeteArv(andmed),
    kt02: kt02KohaloluBilanss(andmed),
    kt03: kt03MuutusteLoogika(andmed),
    kt04: kt04Osavott(andmed),
    kt05: kt05Isikud(andmed),
  };
}

/** Koosseisuta leiud (nt isik, kes ei esine kusagil) kokkuvõtte real "—". */
export const KOOSSEISUTA = "—";

/** KT-06: leidude arv koosseisu × kontrolli kaupa. */
export function kokkuvote(andmed: Andmestik, k: Kontrollid = kontrollid(andmed)): Map<string, Record<KontrolliVoti, number>> {
  const tabel = new Map<string, Record<KontrolliVoti, number>>();
  const tyhi = () => Object.fromEntries(KONTROLLID.map((c) => [c.voti, 0])) as Record<KontrolliVoti, number>;
  for (const ks of andmed.koosseisud) tabel.set(ks.koosseis_id, tyhi());
  const lisa = (koosseis: string, voti: KontrolliVoti) => {
    const id = koosseis || KOOSSEISUTA;
    if (!tabel.has(id)) tabel.set(id, tyhi());
    tabel.get(id)![voti]++;
  };
  for (const r of k.kt01) if (r.erinevus !== null && r.erinevus !== 0) lisa(r.koosseis_id, "kt01");
  for (const r of k.kt02) if (r.erinevus !== 0) lisa(r.koosseis_id, "kt02");
  for (const l of k.kt03.leiud) lisa(l.koosseis_id, `kt03${l.tyyp}` as KontrolliVoti);
  for (const l of k.kt04) lisa(l.koosseis_id, l.tyyp === "mitte_liige" ? "kt04a" : "kt04b");
  for (const l of k.kt05)
    lisa(l.koosseis_id, l.tyyp === "kirjeta" ? "kt05a" : l.tyyp === "ainult_isikutes" ? "kt05b" : "kt05c");
  return tabel;
}
