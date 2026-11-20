import type {
  Andmestik, IsikuRida, Koosolek, KoosolekuRida, Koosseis, Muutus, Valimine,
} from "./types";

/**
 * Andmeloogika erireegel 1: koosseisu liikmelisus kuupäeval D.
 * Alus: valimised(roll=valitud, koosseis) hulk; muutused rakendatakse
 * kronoloogiliselt kuni D (kaasa arvatud):
 *  - liitumine lisab, lahkumine eemaldab
 *  - liitumine&lahkumine = mõlemad samal päeval (liige AINULT sel päeval)
 *  - peatamine eemaldab (ajutiselt; ennistamiskirjeid andmestikus pole)
 *  - rühmavahetus liikmelisust ei muuda
 */
export function liikmedKuupaeval(
  valimised: Valimine[],
  muutused: Muutus[],
  koosseisId: string,
  kuupaev: string
): Set<number> {
  const liikmed = new Set<number>(
    valimised
      .filter((v) => v.koosseis_id === koosseisId && v.roll === "valitud")
      .map((v) => v.isik_id)
  );
  const rakendatavad = muutused
    .filter(
      (m) =>
        m.koosseis_id === koosseisId &&
        m.isik_id !== null &&
        m.kuupaev !== "" &&
        m.kuupaev <= kuupaev
    )
    .sort((a, b) =>
      a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : a.muutus_id - b.muutus_id
    );
  for (const m of rakendatavad) {
    const id = m.isik_id!;
    switch (m.liik) {
      case "liitumine":
        liikmed.add(id);
        break;
      case "lahkumine":
      case "peatamine":
        liikmed.delete(id);
        break;
      case "liitumine&lahkumine":
        if (m.kuupaev === kuupaev) liikmed.add(id);
        else liikmed.delete(id);
        break;
      // rühmavahetus: ei muuda liikmelisust
    }
  }
  return liikmed;
}

/** Kõik isikud, kes on koosseisu KUNAGI kuulunud (valitud + hiljem liitunud). */
export function koosseisuLiikmedKokku(
  valimised: Valimine[],
  muutused: Muutus[],
  koosseisId: string
): Set<number> {
  const liikmed = new Set<number>(
    valimised
      .filter((v) => v.koosseis_id === koosseisId && v.roll === "valitud")
      .map((v) => v.isik_id)
  );
  for (const m of muutused) {
    if (
      m.koosseis_id === koosseisId &&
      m.isik_id !== null &&
      (m.liik === "liitumine" || m.liik === "liitumine&lahkumine")
    ) {
      liikmed.add(m.isik_id);
    }
  }
  return liikmed;
}

/**
 * Tuletatud kohalolijad (KO-07, README "kohaloleku tuletamise reegel"):
 * koosseisu sel kuupäeval kehtivad liikmed MIINUS protokollis puudujaks
 * märgitud isikud.
 */
export function tuletatudKohalolijad(
  andmed: Andmestik,
  koosolek: Koosolek
): number[] {
  const liikmed = liikmedKuupaeval(
    andmed.valimised,
    andmed.muutused,
    koosolek.koosseis_id,
    koosolek.kuupaev
  );
  for (const o of andmed.osavott) {
    if (
      o.koosolek_id === koosolek.koosolek_id &&
      o.staatus === "puudub" &&
      o.isik_id !== null
    ) {
      liikmed.delete(o.isik_id);
    }
  }
  return [...liikmed].sort((a, b) => a - b);
}

/** Koosseisude kronoloogiline järjekord (indeks koosseisud.csv järgi). */
function koosseisuJark(andmed: Andmestik): Map<string, number> {
  return new Map(andmed.koosseisud.map((k, i) => [k.koosseis_id, i]));
}

/** Millistesse koosseisudesse isik kuulus (valitud või liitunud), kronol. järjekorras. */
export function isikuKoosseisud(
  andmed: Andmestik,
  isikId: number
): string[] {
  const jark = koosseisuJark(andmed);
  const hulk = new Set<string>();
  for (const v of andmed.valimised) {
    if (v.isik_id === isikId && v.roll === "valitud") hulk.add(v.koosseis_id);
  }
  for (const m of andmed.muutused) {
    if (
      m.isik_id === isikId &&
      (m.liik === "liitumine" || m.liik === "liitumine&lahkumine")
    ) {
      hulk.add(m.koosseis_id);
    }
  }
  return [...hulk].sort((a, b) => (jark.get(a) ?? 99) - (jark.get(b) ?? 99));
}

/** NK-03: isiku peamine nimekiri kanoonilise nimekirja järgi. */
export interface PeamineNimekiri {
  id: number;
  nimi: string;
  /** isiku valimisridade toorkujud selle nimekirja kohta (allika järjekorras, kordumatud) */
  toor: string[];
  /** vähemalt üks vaste on ajutine (NK-02) */
  kontrollida: boolean;
}

/** Kanooniliste nimekirjade nimed ID järgi. */
export function nimekirjaNimed(andmed: Andmestik): Map<number, string> {
  return new Map(andmed.nimekirjad.map((n) => [n.nimekiri_id, n.nimi]));
}

/**
 * Isiku peamine nimekiri (NK-03): sagedasim kanooniline nimekiri valimiste kirjetes; eelistab
 * valitud-ridu. Ilma kanoonilise vasteta read (1919 valitud, 1939) ei loe.
 */
export function peamineNimekiri(
  andmed: Andmestik, isikId: number, nimed: Map<number, string> = nimekirjaNimed(andmed)
): PeamineNimekiri | null {
  const loenda = (read: Valimine[]): number | null => {
    const loend = new Map<number, number>();
    for (const r of read) {
      if (r.nimekiri_id !== null) loend.set(r.nimekiri_id, (loend.get(r.nimekiri_id) ?? 0) + 1);
    }
    let parim: number | null = null;
    let max = 0;
    for (const [id, arv] of loend) {
      if (arv > max) {
        max = arv;
        parim = id;
      }
    }
    return parim;
  };
  const oma = andmed.valimised.filter((v) => v.isik_id === isikId);
  const id = loenda(oma.filter((v) => v.roll === "valitud")) ?? loenda(oma);
  if (id === null) return null;
  const read = oma.filter((v) => v.nimekiri_id === id);
  return {
    id,
    nimi: nimed.get(id) ?? "",
    toor: [...new Set(read.map((r) => r.nimekiri_nimi.trim()).filter(Boolean))],
    kontrollida: read.some((r) => r.nimekiri_kontrollida),
  };
}

/** NK-03: koosseisu jaotusdiagrammi segment kanoonilise nimekirja järgi. */
export interface NimekirjaSegment {
  /** kanooniline nimi */
  nimi: string;
  nimekiri_id: number | null;
  arv: number;
  isikud: number[];
  /** ametlike (alam)nimekirjade häälte summa sel aastal; null = hääli pole teada */
  haaled: number | null;
  kontrollida: boolean;
  wikidata: string;
  mitu_osapoolt: boolean;
}

/** KS-03 + NK-03: valitute jaotus kanoonilise nimekirja järgi. Tühi, kui valitutel nimekirju pole. */
export function koosseisuNimekirjaJaotus(andmed: Andmestik, koosseisId: string): NimekirjaSegment[] {
  const valitud = andmed.valimised.filter((v) => v.koosseis_id === koosseisId && v.roll === "valitud");
  if (!valitud.some((v) => v.nimekiri_id !== null)) return [];
  const nimekirjad = new Map(andmed.nimekirjad.map((n) => [n.nimekiri_id, n]));
  const grupid = new Map<number | null, Valimine[]>();
  for (const v of valitud) grupid.set(v.nimekiri_id, [...(grupid.get(v.nimekiri_id) ?? []), v]);
  return [...grupid.entries()]
    .map(([id, read]) => {
      const n = id !== null ? nimekirjad.get(id) : undefined;
      const ametlikud = id === null ? [] : andmed.valimisnimekirjad.filter(
        (a) => a.aasta === read[0].aasta && a.nimekiri_id === id && a.haaled !== null
      );
      return {
        nimi: n?.nimi ?? "(nimekiri teadmata)",
        nimekiri_id: id,
        arv: read.length,
        isikud: read.map((r) => r.isik_id),
        haaled: ametlikud.length ? ametlikud.reduce((s, a) => s + (a.haaled ?? 0), 0) : null,
        kontrollida: read.some((r) => r.nimekiri_kontrollida),
        wikidata: n?.wikidata ?? "",
        mitu_osapoolt: n?.mitu_osapoolt ?? false,
      };
    })
    .sort((a, b) => b.arv - a.arv);
}

/** NK-03: koosseisu nimekirjade tabeli rida (ametlik nimekiri, Sheet1). */
export interface KoosseisuNimekiriRida {
  nr: string;
  nimi: string;
  haaled: number | null;
  wikidata: string[];
  nimekiri_id: number | null;
  kanooniline: string;
  /** valituid kanoonilise nimekirja kohta; null = valimistulemustes nimekirju pole */
  valituid: number | null;
  /** mitu järjestikust rida jagavad sama kanoonilist nimekirja (valituid ühine); 0 = jätkurida */
  ryhm: number;
  kontrollida: boolean;
}

/**
 * Koosseisu valimiste ametlikud nimekirjad. Valituid loetakse kanoonilise nimekirja kaupa —
 * valimistulemused ei ütle, millisest 1929. a alamnimekirjast isik valiti.
 */
export function koosseisuNimekirjad(andmed: Andmestik, koosseisId: string): KoosseisuNimekiriRida[] {
  const k = andmed.koosseisud.find((x) => x.koosseis_id === koosseisId);
  if (!k) return [];
  const aasta = Number(k.aasta_valimised);
  const ametlikud = andmed.valimisnimekirjad.filter((a) => a.aasta === aasta);
  if (ametlikud.length === 0) return [];
  const nimed = nimekirjaNimed(andmed);
  const valitud = andmed.valimised.filter((v) => v.koosseis_id === koosseisId && v.roll === "valitud");
  const onTulemused = valitud.some((v) => v.nimekiri_id !== null);
  const jrk = ametlikud.every((a) => a.nr)
    ? [...ametlikud].sort((a, b) => Number(a.nr) - Number(b.nr))
    : [...ametlikud].sort((a, b) => (b.haaled ?? -1) - (a.haaled ?? -1));
  // sama kanoonilise nimekirja alamnimekirjad kõrvuti (järjestus esimese järgi)
  const esimene = new Map<number | null, number>();
  jrk.forEach((a, i) => { if (a.nimekiri_id !== null && !esimene.has(a.nimekiri_id)) esimene.set(a.nimekiri_id, i); });
  const jarjestatud = jrk
    .map((a, i) => ({ a, i, g: a.nimekiri_id !== null ? esimene.get(a.nimekiri_id)! : i }))
    .sort((x, y) => x.g - y.g || x.i - y.i)
    .map((x) => x.a);
  const samaRyhm = (i: number) =>
    i > 0 && jarjestatud[i].nimekiri_id !== null && jarjestatud[i - 1].nimekiri_id === jarjestatud[i].nimekiri_id;
  return jarjestatud.map((a, i) => {
    let ryhm = 0;
    if (!samaRyhm(i)) {
      ryhm = 1;
      while (i + ryhm < jarjestatud.length && samaRyhm(i + ryhm)) ryhm++;
    }
    const omad = a.nimekiri_id === null ? [] : valitud.filter((v) => v.nimekiri_id === a.nimekiri_id);
    return {
      nr: a.nr,
      nimi: a.nimi,
      haaled: a.haaled,
      wikidata: a.wikidata,
      nimekiri_id: a.nimekiri_id,
      kanooniline: a.nimekiri_id !== null ? nimed.get(a.nimekiri_id) ?? "" : "",
      valituid: onTulemused ? omad.length : null,
      ryhm,
      kontrollida: omad.some((v) => v.nimekiri_kontrollida),
    };
  });
}

/** Valimiste rea allikas (UX-03): valitav → kandidaatide_allikas, valitud → valimistulemuste_allikas. */
/** VK-02: väärtuse allikas — rea kaupa (valimised.csv `allikas`). viide/url null = viide puudub. */
export interface Allikas {
  allikas: Valimine["allikas"];
  viide: string | null;
  url: string | null;
}

export const ALLIKA_NIMI: Record<Valimine["allikas"], string> = {
  tulemused: "valimistulemused",
  kandidaadid: "kandidaatide nimekiri",
  kandidaadid_vene: "venekeelne kandidaatide nimekiri",
};

export interface Vaartus {
  vaartus: string;
  allikad: Allikas[];
}

/** VK-01: ühe isiku ühe valimisaasta kõik read ühel kaardil. */
export interface ValimineKoos {
  aasta: number;
  koosseis_id: string;
  tulemus: "valitud" | "kandidaat";
  /**
   * NK-03: kanoonilise nimekirja kaupa (nimi = kanooniline, toor = allika nimekujud); ilma
   * kanoonilise vasteta read toorkuju kaupa. Eri kanoonilised nimekirjad jäävad eraldi.
   */
  nimekiri: {
    nr: string; nimi: string; toor: string[]; nimekiri_id: number | null; kontrollida: boolean;
    allikad: Allikas[];
  }[];
  /** VK-04: nimekuju allikas (originaalkujul, ka kirillitsas) */
  nimekuju: Vaartus[];
  /** "6 (üldjärjestuses 46)" */
  koht: Vaartus[];
  /** "2, koht ringkonnas 5" */
  ringkond: Vaartus[];
  /** "812 (1. jsk 400, 2. jsk 412)" */
  haaled: Vaartus[];
  amet: Vaartus[];
  /** kandidaadirealt; mitu väärtust = allikad erinevad */
  vanus: Vaartus[];
  synniaeg: Vaartus[];
  aadress: Vaartus[];
  markused: Vaartus[];
  /** kõik read, millest kirje koosneb (kandidaadid enne tulemusi) */
  allikad: Allikas[];
}

const ALLIKA_JARK: Record<Valimine["allikas"], number> = { kandidaadid: 0, kandidaadid_vene: 1, tulemused: 2 };

/** VK-02: rea allikas + viide koosseisu tabelist (kandidaadid_vene: viide puudub, LAHTINE). */
export function valimiseAllikas(andmed: Andmestik, v: Valimine): Allikas {
  const k = andmed.koosseisud.find((x) => x.koosseis_id === v.koosseis_id);
  if (!k || v.allikas === "kandidaadid_vene") return { allikas: v.allikas, viide: null, url: null };
  const [viide, url] = v.allikas === "tulemused"
    ? [k.valimistulemuste_allikas, k.valimistulemuste_allikas_url]
    : [k.kandidaatide_allikas, k.kandidaatide_allikas_url];
  return { allikas: v.allikas, viide: viide || null, url: url || null };
}

function samaAllikas(a: Allikas, b: Allikas): boolean {
  return a.allikas === b.allikas && a.viide === b.viide;
}

/** Rea aadressid: tänav+maja(+korter) ja `elukoht_muu` eraldi (UX-04). */
function reaAadressid(v: Valimine): string[] {
  const tulem: string[] = [];
  if (v.elukoht_tanav || v.elukoht_majanr) {
    let maja = v.elukoht_majanr;
    if (maja && v.elukoht_korterinr) maja += "-" + v.elukoht_korterinr;
    tulem.push([v.elukoht_tanav, maja].filter(Boolean).join(" "));
  }
  if (v.elukoht_muu) tulem.push(v.elukoht_muu);
  return tulem;
}

/** Aadressi võrdlusvõti: ainult tõst ja tühikud ühtlustatud. */
export function aadressiVoti(tekst: string): string {
  return tekst.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Sama väärtus mitmel real → üks kirje mitme allikaga; erinevad väärtused jäävad eraldi. */
function kogu(read: { tekst: string; allikas: Allikas }[], voti: (s: string) => string = (s) => s.trim()): Vaartus[] {
  const tulem: (Vaartus & { k: string })[] = [];
  for (const { tekst, allikas } of read) {
    if (!tekst.trim()) continue;
    const k = voti(tekst);
    const olemas = tulem.find((t) => t.k === k);
    if (olemas) {
      if (!olemas.allikad.some((a) => samaAllikas(a, allikas))) olemas.allikad.push(allikas);
    } else tulem.push({ k, vaartus: tekst.trim(), allikad: [allikas] });
  }
  return tulem.map(({ vaartus, allikad }) => ({ vaartus, allikad }));
}

/** Ühe väärtusega väli; kui ridadel siiski erineb, jäävad kõik kujud nähtavaks (" / "). */
function yks(vaartused: string[]): string | undefined {
  const eri = [...new Set(vaartused.map((v) => v.trim()).filter(Boolean))];
  return eri.length ? eri.join(" / ") : undefined;
}

/**
 * UX-03: isiku valimised ühe kirjena aasta kohta. Valitava (kandidaadi) ja valitu
 * read ühendatakse; erinevaid väärtusi ei ühtlustata (CLAUDE.md: andmevastuolud jäävad nähtavaks).
 */
export function isikuValimisedKoos(andmed: Andmestik, isikId: number): ValimineKoos[] {
  const aastati = new Map<number, Valimine[]>();
  for (const v of andmed.valimised) {
    if (v.isik_id !== isikId) continue;
    const list = aastati.get(v.aasta) ?? [];
    list.push(v);
    aastati.set(v.aasta, list);
  }
  return [...aastati.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([aasta, read]) => {
      read = [...read].sort((a, b) => ALLIKA_JARK[a.allikas] - ALLIKA_JARK[b.allikas]);
      const allikad = read.map((r) => valimiseAllikas(andmed, r));
      const paar = read.map((r, i) => ({ r, allikas: allikad[i] }));

      const nimed = nimekirjaNimed(andmed);
      const nimekiri: ValimineKoos["nimekiri"] = [];
      for (const { r, allikas } of paar) {
        const toor = r.nimekiri_nimi.trim();
        const nr = r.nimekiri_nr.trim();
        if (!toor && !nr) continue;
        const id = r.nimekiri_id;
        const nimi = id !== null ? nimed.get(id) ?? toor : toor;
        const olemas = nimekiri.find((n) =>
          (id !== null ? n.nimekiri_id === id : n.nimekiri_id === null && n.nimi === nimi) &&
          (n.nr === nr || !n.nr || !nr)
        );
        if (olemas) {
          olemas.nr ||= nr;
          if (toor && !olemas.toor.includes(toor)) olemas.toor.push(toor);
          olemas.kontrollida ||= r.nimekiri_kontrollida;
          if (!olemas.allikad.some((a) => samaAllikas(a, allikas))) olemas.allikad.push(allikas);
        } else {
          nimekiri.push({
            nr, nimi, toor: toor ? [toor] : [], nimekiri_id: id, kontrollida: r.nimekiri_kontrollida,
            allikad: [allikas],
          });
        }
      }

      const koht = kogu(paar.map(({ r, allikas }) => ({
        tekst: r.jrk_nimekiri || r.jrk_uld
          ? `${r.jrk_nimekiri || "—"}${r.jrk_uld ? ` (üldjärjestuses ${r.jrk_uld})` : ""}`
          : "",
        allikas,
      })));
      const ringkond = kogu(paar.map(({ r, allikas }) => ({
        tekst: r.ringkond_nr ? `${r.ringkond_nr}${r.jrk_ringkond ? `, koht ringkonnas ${r.jrk_ringkond}` : ""}` : "",
        allikas,
      })));
      const haaled = kogu(paar.map(({ r, allikas }) => ({
        tekst: r.haaled_kokku !== null || r.haaled_1_jsk || r.haaled_2_jsk
          ? `${r.haaled_kokku ?? "—"}${r.haaled_1_jsk || r.haaled_2_jsk
            ? ` (1. jsk ${r.haaled_1_jsk || "—"}, 2. jsk ${r.haaled_2_jsk || "—"})` : ""}`
          : "",
        allikas,
      })));

      return {
        aasta,
        koosseis_id: read[0].koosseis_id,
        tulemus: read.some((r) => r.roll === "valitud") ? "valitud" : "kandidaat",
        nimekiri,
        nimekuju: kogu(paar.map(({ r, allikas }) => ({ tekst: [r.eesnimi, r.perenimi].filter(Boolean).join(" "), allikas }))),
        koht,
        ringkond,
        haaled,
        amet: kogu(paar.map(({ r, allikas }) => ({ tekst: r.amet, allikas }))),
        vanus: kogu(paar.map(({ r, allikas }) => ({ tekst: r.vanus, allikas }))),
        synniaeg: kogu(paar.map(({ r, allikas }) => ({ tekst: r.synniaeg, allikas }))),
        aadress: kogu(
          paar.flatMap(({ r, allikas }) => reaAadressid(r).map((tekst) => ({ tekst, allikas }))),
          aadressiVoti
        ),
        markused: kogu(paar.map(({ r, allikas }) => ({ tekst: r.markused, allikas }))),
        allikad: allikad.filter((a, i) => allikad.findIndex((b) => samaAllikas(a, b)) === i),
      };
    });
}

/** UX-04: isiku aadressid koondatuna — sama aadress eri aastatel üks kord. */
export function isikuAadressidKoos(
  andmed: Andmestik,
  isikId: number
): { tekst: string; aastad: number[]; allikad: Allikas[] }[] {
  const read = andmed.valimised
    .filter((v) => v.isik_id === isikId)
    .sort((a, b) => a.aasta - b.aasta || (a.roll === b.roll ? 0 : a.roll === "valitav" ? -1 : 1));
  const tulem = new Map<string, { tekst: string; aastad: number[]; allikad: Allikas[] }>();
  for (const v of read) {
    const allikas = valimiseAllikas(andmed, v);
    for (const tekst of reaAadressid(v)) {
      const k = aadressiVoti(tekst);
      const kirje = tulem.get(k) ?? { tekst, aastad: [], allikad: [] };
      if (!kirje.aastad.includes(v.aasta)) kirje.aastad.push(v.aasta);
      if (!kirje.allikad.some((a) => samaAllikas(a, allikas))) {
        kirje.allikad.push(allikas);
      }
      tulem.set(k, kirje);
    }
  }
  return [...tulem.values()];
}

/** PA-06: isik, kellel puudub liikmeks saamise kirje, kuid on tõendeid liikmelisusest. */
export interface LiikmekirjeTõendid {
  /** muutuste read (lahkumine jt) */
  muutused: Muutus[];
  /** mitu korda protokollide osavõtus nimetatud (kindlus kõrge/keskmine) */
  osavotuKordi: number;
  /** koosseisud, kus tõendid esinevad (kronoloogiliselt) */
  koosseisud: string[];
  /** inimloetav loetelu: "lahkumine 1925-03-26 (#242)", "protokollides nimetatud 10 korda" */
  tekst: string[];
}

export const LIIKMEKIRJE_PUUDUB =
  "Liikmeks saamise kirje puudub andmetes (valimistulemus või liitumine)";

/**
 * PA-06 / KT-05a: 0 koosseisu (valitud-ridadest ja liitumistest), kuid muutustes või osavõtus
 * (kõrge/keskmine) on tõendeid. Liikmelisust juurde ei tuletata; tagastab ainult tõendid.
 */
export function liikmekirjePuudub(
  andmed: Andmestik, isikId: number, koosseisud: string[] = isikuKoosseisud(andmed, isikId)
): LiikmekirjeTõendid | null {
  if (koosseisud.length > 0) return null;
  const muutused = andmed.muutused.filter((m) => m.isik_id === isikId);
  const osavott = andmed.osavott.filter(
    (o) => o.isik_id === isikId && (o.sidumise_kindlus === "kõrge" || o.sidumise_kindlus === "keskmine")
  );
  if (muutused.length === 0 && osavott.length === 0) return null;
  const jark = new Map(andmed.koosseisud.map((k, i) => [k.koosseis_id, i]));
  return {
    muutused,
    osavotuKordi: osavott.length,
    koosseisud: [...new Set([...muutused.map((m) => m.koosseis_id), ...osavott.map((o) => o.koosseis_id)])]
      .sort((a, b) => (jark.get(a) ?? 99) - (jark.get(b) ?? 99)),
    tekst: [
      ...muutused.map((m) => `${m.liik} ${m.kuupaev} (#${m.muutus_id})`),
      ...(osavott.length ? [`protokollides nimetatud ${osavott.length} korda`] : []),
    ],
  };
}

/** IsikuRida nimekirjaväljad (NK-03). */
export function peamiseNimekirjaValjad(p: PeamineNimekiri | null): Pick<
  IsikuRida, "peamine_nimekiri" | "peamine_nimekiri_id" | "peamine_nimekiri_toor" | "peamine_nimekiri_kontrollida"
> {
  return {
    peamine_nimekiri: p?.nimi ?? "",
    peamine_nimekiri_id: p?.id ?? null,
    peamine_nimekiri_toor: p?.toor.join("; ") ?? "",
    peamine_nimekiri_kontrollida: p?.kontrollida ?? false,
  };
}

/** Isikute tabeli read (/isikud, IS-01). */
export function isikuRead(andmed: Andmestik): IsikuRida[] {
  const nimed = nimekirjaNimed(andmed);
  const juhatajaIdd = new Set(
    andmed.juhatajad.filter((j) => j.isik_id !== null).map((j) => j.isik_id!)
  );
  return andmed.isikud.map((i) => {
    const koosseisud = isikuKoosseisud(andmed, i.isik_id);
    return {
      isik_id: i.isik_id,
      perenimi: i.perenimi,
      eesnimi: i.eesnimi,
      alt_perenimi: i.alt_perenimi,
      alt_eesnimi: i.alt_eesnimi,
      sugu: i.sugu,
      synd_kuupaev: i.synd_kuupaev,
      synd_tuletatud: i.synd_tuletatud,
      surm_kuupaev: i.surm_kuupaev,
      wikidata: i.wikidata,
      arhiiviviited: i.arhiiviviited,
      koosseisud,
      koosseise: koosseisud.length,
      esimene_koosseis: koosseisud[0] ?? "",
      viimane_koosseis: koosseisud[koosseisud.length - 1] ?? "",
      ...peamiseNimekirjaValjad(peamineNimekiri(andmed, i.isik_id, nimed)),
      liikmekirje_puudub: liikmekirjePuudub(andmed, i.isik_id, koosseisud)?.tekst.join("; ") ?? "",
      oli_juhataja: juhatajaIdd.has(i.isik_id),
      aadressid: isikuAadressidKoos(andmed, i.isik_id).map((a) => `${a.tekst} (${a.aastad.join(", ")})`),
      aastad: isikuAastad(karjaariSegmendid(andmed, i.isik_id)),
      isanimi: i.isanimi,
      AKL_ID: i.AKL_ID,
    };
  });
}

/** Koosolekute tabeli read (/koosolekud, KO-02). */
export function koosolekuRead(andmed: Andmestik): KoosolekuRida[] {
  const juhatajadKoosolekuti = new Map<string, { nimi: string; isik_id: number | null }[]>();
  for (const j of andmed.juhatajad) {
    const list = juhatajadKoosolekuti.get(j.koosolek_id) ?? [];
    list.push({ nimi: j.juhataja_nimi, isik_id: j.isik_id });
    juhatajadKoosolekuti.set(j.koosolek_id, list);
  }
  return andmed.koosolekud.map((k) => ({
    koosolek_id: k.koosolek_id,
    kuupaev: k.kuupaev,
    kuupaev_lopp: k.kuupaev_lopp,
    nadalapaev: k.nadalapaev,
    vorm: k.vorm,
    koosseis_id: k.koosseis_id,
    juhatajad: juhatajadKoosolekuti.get(k.koosolek_id) ?? [],
    koosseis_arv: k.koosseis_arv,
    kohal_arv: k.kohal_arv,
    kohal_arv_2paev: k.kohal_arv_2paev,
  }));
}

/** Isiku osavõtustatistika (PR-06): ainult kindlus kõrge/keskmine. */
export function osavotuStatistika(andmed: Andmestik, isikId: number) {
  let kohal = 0;
  let puudub = 0;
  const puudumised = new Set<string>();
  const nimetatud = new Set<string>();
  for (const o of andmed.osavott) {
    if (o.isik_id !== isikId) continue;
    if (o.sidumise_kindlus !== "kõrge" && o.sidumise_kindlus !== "keskmine") continue;
    nimetatud.add(o.koosolek_id);
    if (o.staatus === "kohal") kohal++;
    else {
      puudub++;
      puudumised.add(o.koosolek_id);
    }
  }
  // Tuletatud kohalolu: koosolekud, kus isik oli liige ega olnud puudujate seas
  let tuletatudKohal = 0;
  for (const k of andmed.koosolekud) {
    const liikmed = liikmedKuupaevalMemo(andmed, k.koosseis_id, k.kuupaev);
    if (liikmed.has(isikId) && !puudumised.has(k.koosolek_id) && !nimetatud.has(k.koosolek_id)) {
      tuletatudKohal++;
    }
  }
  return { kohal, puudub, tuletatudKohal };
}

/** PR-02: isiku liikmelisuse ajavahemikud karjääririba jaoks. */
export function karjaariSegmendid(
  andmed: Andmestik,
  isikId: number
): { koosseis_id: string; algus: string; lopp: string }[] {
  const segmendid: { koosseis_id: string; algus: string; lopp: string }[] = [];
  for (const kid of isikuKoosseisud(andmed, isikId)) {
    const k = andmed.koosseisud.find((x) => x.koosseis_id === kid);
    if (!k) continue;
    const koosseisuAlgus = k.valimised_algus || k.esimene_koosolek;
    const koosseisuLopp = k.viimane_koosolek || k.valimised_lopp || koosseisuAlgus;
    const valitud = andmed.valimised.some(
      (v) => v.isik_id === isikId && v.koosseis_id === kid && v.roll === "valitud"
    );
    const muutused = andmed.muutused
      .filter((m) => m.isik_id === isikId && m.koosseis_id === kid && m.kuupaev)
      .sort((a, b) =>
        a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : a.muutus_id - b.muutus_id
      );
    let avatud: string | null = valitud ? koosseisuAlgus : null;
    for (const m of muutused) {
      if (m.liik === "liitumine" && !avatud) {
        avatud = m.kuupaev;
      } else if ((m.liik === "lahkumine" || m.liik === "peatamine") && avatud) {
        segmendid.push({ koosseis_id: kid, algus: avatud, lopp: m.kuupaev });
        avatud = null;
      } else if (m.liik === "liitumine&lahkumine") {
        // PA-09: avatud lõik suletakse sel päeval (nagu `liikmedKuupaeval`: liige ainult kuni selle päevani);
        // avamata korral 1-päevane lõik
        segmendid.push({ koosseis_id: kid, algus: avatud ?? m.kuupaev, lopp: m.kuupaev });
        avatud = null;
      }
    }
    if (avatud) {
      segmendid.push({ koosseis_id: kid, algus: avatud, lopp: koosseisuLopp });
    }
  }
  return segmendid;
}

/**
 * IS5-03 / PR5-02: volikogus oldud aastad karjäärisegmentidest — esimese lõigu algusaasta kuni
 * viimase lõigu lõpuaasta ("1917–1934"); üks aasta → "1921"; segmente pole (PA-06) → null.
 */
export function isikuAastad(segmendid: { algus: string; lopp: string }[]): string | null {
  const algused = segmendid.map((s) => s.algus.slice(0, 4)).filter(Boolean).sort();
  const lopud = segmendid.map((s) => s.lopp.slice(0, 4)).filter(Boolean).sort();
  if (algused.length === 0) return null;
  const a = algused[0];
  const l = lopud[lopud.length - 1] ?? a;
  return a === l ? a : `${a}–${l}`;
}

/** PR-08: isiku juhatamise statistika. */
export function juhatamiseStatistika(andmed: Andmestik, isikId: number) {
  const omad = andmed.juhatajad.filter((j) => j.isik_id === isikId);
  if (omad.length === 0) return null;
  const koosolekud = andmed.koosolekud.filter((k) =>
    omad.some((j) => j.koosolek_id === k.koosolek_id)
  );
  const kuupaevad = koosolekud.map((k) => k.kuupaev).sort();
  const vormid = new Map<string, number>();
  for (const k of koosolekud) {
    vormid.set(k.vorm, (vormid.get(k.vorm) ?? 0) + 1);
  }
  return {
    arv: koosolekud.length,
    esimene: kuupaevad[0] ?? "",
    viimane: kuupaevad[kuupaevad.length - 1] ?? "",
    vormid: [...vormid.entries()].sort((a, b) => b[1] - a[1]),
  };
}

const liikmelisusCache = new Map<string, Set<number>>();

/** Memoiseeritud liikmelisus (sama koosseis+kuupäev arvutatakse üks kord). */
export function liikmedKuupaevalMemo(
  andmed: Andmestik,
  koosseisId: string,
  kuupaev: string
): Set<number> {
  const key = `${koosseisId}|${kuupaev}`;
  let tulemus = liikmelisusCache.get(key);
  if (!tulemus) {
    tulemus = liikmedKuupaeval(andmed.valimised, andmed.muutused, koosseisId, kuupaev);
    liikmelisusCache.set(key, tulemus);
  }
  return tulemus;
}

/** PR-12: isiku mainimised protokollides (`data/protokolli_mainimised.csv`, ET-08). */
export interface MainimisteProfiil {
  /** kindlus kõrge/keskmine */
  protokolle: number;
  kordi: number;
  /** registriväline mitmesus ("N;None") */
  toenaolisi: number;
  toenaolisiProtokolle: number;
  loetelu: {
    koosolek_id: string;
    kuupaev: string;
    koosseis_id: string;
    kindlaid: number;
    toenaolisi: number;
  }[];
}

export function mainimisedProfiilile(andmed: Andmestik, isikId: number): MainimisteProfiil | null {
  const read = andmed.mainimised.filter((m) => m.isik_id === isikId);
  if (read.length === 0) return null;
  const koosseis = new Map(andmed.koosolekud.map((k) => [k.koosolek_id, k.koosseis_id]));
  const prot = new Map<string, MainimisteProfiil["loetelu"][number]>();
  let kordi = 0;
  let toenaolisi = 0;
  for (const m of read) {
    const r = prot.get(m.koosolek_id) ?? {
      koosolek_id: m.koosolek_id, kuupaev: m.kuupaev, koosseis_id: koosseis.get(m.koosolek_id) ?? "", kindlaid: 0, toenaolisi: 0,
    };
    if (m.kindlus === "mitmene") {
      r.toenaolisi += m.arv;
      toenaolisi += m.arv;
    } else {
      r.kindlaid += m.arv;
      kordi += m.arv;
    }
    prot.set(m.koosolek_id, r);
  }
  const loetelu = [...prot.values()].sort((a, b) => a.kuupaev.localeCompare(b.kuupaev) || a.koosolek_id.localeCompare(b.koosolek_id));
  return {
    protokolle: loetelu.filter((l) => l.kindlaid > 0).length,
    kordi,
    toenaolisi,
    toenaolisiProtokolle: loetelu.filter((l) => l.toenaolisi > 0).length,
    loetelu,
  };
}

/* ───────────── PA-07: allikaviide → koosolek ───────────── */

export interface KoosolekuViide {
  koosolek_id: string;
  kuupaev: string;
  /** RA digikaader */
  kaader: string;
}

const kaadriIndeksid = new WeakMap<Andmestik, Map<string, Set<string>>>();

/** "säilik:kaader" → koosolek_id-d (protokolli_lehed.csv → protokollid.csv `fail`). */
function kaadriIndeks(andmed: Andmestik): Map<string, Set<string>> {
  let idx = kaadriIndeksid.get(andmed);
  if (idx) return idx;
  const failist = new Map(andmed.protokollid.filter((p) => p.fail).map((p) => [p.fail, p.koosolek_id]));
  idx = new Map();
  for (const l of andmed.protokolliLehed) {
    const kid = failist.get(l.protokoll);
    if (!kid) continue;
    const voti = `${l.arhiiviviide}:${l.lehekulg}`;
    idx.set(voti, (idx.get(voti) ?? new Set()).add(kid));
  }
  kaadriIndeksid.set(andmed, idx);
  return idx;
}

/**
 * PA-07: muutuse allikaviide (säilik:kaader) → koosolek, mille protokolli see kaader kuulub.
 * Kui kaader kuulub mitmele protokollile, valitakse see, mille kuupäev on `kuupaevad` hulgas
 * (muutuse protokolliviide); muidu null — ei arvata.
 */
export function allikaviiteKoosolek(
  andmed: Andmestik, viide: string, kuupaevad: string[] = []
): KoosolekuViide | null {
  const m = viide.trim().match(/^(.+?):(\d+[a-z]?)$/);
  if (!m) return null;
  const kandidaadid = [...(kaadriIndeks(andmed).get(`${m[1]}:${m[2]}`) ?? [])];
  const koosolekud = kandidaadid
    .map((id) => andmed.koosolekud.find((k) => k.koosolek_id === id))
    .filter((k): k is Koosolek => !!k);
  const valik = koosolekud.length === 1
    ? koosolekud
    : koosolekud.filter((k) => kuupaevad.includes(k.kuupaev));
  if (valik.length !== 1) return null;
  return { koosolek_id: valik[0].koosolek_id, kuupaev: valik[0].kuupaev, kaader: m[2] };
}

/** "04.12.1918" → "1918-12-04" (muutuste protokolliviited). */
function protKuupaevIso(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s.trim();
}

/* ───────────── UX-06: liikmesmuutused sündmustena ───────────── */

interface SyndmuseAlus {
  /** püsiv võti: "<liik>-<väikseim muutus_id>" */
  id: string;
  kuupaev: string;
  koosseis_id: string;
  /** kõik algsed muutus_id-d (eksport, test) */
  muutus_idd: number[];
  allikaviited: string[];
  /** PA-07: allikaviidete koosolekud (sama järjekord; null = koosolekut ei leitud üheselt) */
  koosolekuViited?: (KoosolekuViide | null)[];
  /** protokolliviited (kuupäevad) */
  protokollid: string[];
  /** liitumine esimesel koosolekul, kuid isik puudub valimistulemustes */
  eiValitud?: boolean;
}

export interface UksikSyndmus extends SyndmuseAlus {
  liik: "lahkumine" | "liitumine" | "liitumine&lahkumine" | "rühmavahetus" | "peatamine";
  isik: number | null;
  /** toorkuju, kui isik_id puudub */
  toorNimi: string;
  nimekiri: string;
  tapsustus: string;
  asendaja: number | null;
  asendatav: number | null;
  /** lahkumine: allikas ütleb, et asendajat ei nimetata */
  asendajaPuudub: boolean;
}

export type Syndmus =
  | (SyndmuseAlus & { liik: "kinnitamine"; isikud: number[] })
  | (SyndmuseAlus & {
      liik: "vahetus";
      lahkuja: number;
      asendaja: number;
      lahkumiseKuupaev: string;
      liitumiseKuupaev: string;
      nimekiri: string;
      tapsustus: string;
    })
  | UksikSyndmus;

export type SyndmuseLiik = Syndmus["liik"];

function muutuseProtokoll(m: Muutus): string[] {
  switch (m.liik) {
    case "liitumine": return [m.liitus_prot];
    case "lahkumine": return [m.lahkus_prot];
    case "liitumine&lahkumine": return [m.liitus_prot, m.lahkus_prot];
    case "rühmavahetus": return [m.ryhmavahetus_prot];
    case "peatamine": return [m.peatatud_prot];
  }
}

const unikaalsed = (v: string[]) => [...new Set(v.filter(Boolean))];

/**
 * UX-06: koosseisu muutuste read sündmusteks.
 * Reegel 1 — kinnitamine: `liitumine` esimese koosoleku kuupäeval, ilma asendatavata,
 *   isik on valimistulemustes valitud → üks sündmus.
 * Reegel 2 — vahetus: `lahkumine` A (asendaja B) + `liitumine` B (asendatav A) samas koosseisus.
 *   Ainult täpne paar; ahelad läbi `liitumine&lahkumine` jäävad eraldi (andmeid ei tõlgendata).
 * Reegel 3 — ülejäänud read 1:1.
 */
export function koosseisuSyndmused(andmed: Andmestik, koosseisId: string): Syndmus[] {
  const koosseis = andmed.koosseisud.find((k) => k.koosseis_id === koosseisId);
  const esimene = koosseis?.esimene_koosolek ?? "";
  const valitud = new Set(
    andmed.valimised
      .filter((v) => v.koosseis_id === koosseisId && v.roll === "valitud")
      .map((v) => v.isik_id)
  );
  const read = andmed.muutused
    .filter((m) => m.koosseis_id === koosseisId)
    .sort((a, b) => a.muutus_id - b.muutus_id);
  const kasutatud = new Set<number>();
  const syndmused: Syndmus[] = [];
  const eiValitud = (m: Muutus) =>
    m.liik === "liitumine" && !!esimene && m.kuupaev === esimene &&
    m.isik_id !== null && !valitud.has(m.isik_id);

  // Reegel 1
  const kinnitus = read.filter(
    (m) => m.liik === "liitumine" && esimene && m.kuupaev === esimene &&
      m.asendatav_ID === null && m.isik_id !== null && valitud.has(m.isik_id)
  );
  if (kinnitus.length > 0) {
    kinnitus.forEach((m) => kasutatud.add(m.muutus_id));
    syndmused.push({
      id: `kinnitamine-${kinnitus[0].muutus_id}`,
      liik: "kinnitamine",
      kuupaev: esimene,
      koosseis_id: koosseisId,
      isikud: kinnitus.map((m) => m.isik_id!),
      muutus_idd: kinnitus.map((m) => m.muutus_id),
      allikaviited: unikaalsed(kinnitus.map((m) => m.allikaviide)),
      protokollid: unikaalsed(kinnitus.map((m) => m.liitus_prot)),
    });
  }

  // Reegel 2
  for (const a of read) {
    if (a.liik !== "lahkumine" || a.asendaja_ID === null || a.isik_id === null) continue;
    const b = read.find(
      (m) => !kasutatud.has(m.muutus_id) && m.liik === "liitumine" &&
        m.isik_id === a.asendaja_ID && m.asendatav_ID === a.isik_id
    );
    if (!b) continue;
    kasutatud.add(a.muutus_id);
    kasutatud.add(b.muutus_id);
    syndmused.push({
      id: `vahetus-${Math.min(a.muutus_id, b.muutus_id)}`,
      liik: "vahetus",
      kuupaev: a.kuupaev,
      koosseis_id: koosseisId,
      lahkuja: a.isik_id,
      asendaja: b.isik_id!,
      lahkumiseKuupaev: a.kuupaev,
      liitumiseKuupaev: b.kuupaev,
      nimekiri: unikaalsed([a.nimekiri, b.nimekiri]).join(" / "),
      tapsustus: unikaalsed([a.tapsustus, b.tapsustus]).join(" / "),
      muutus_idd: [a.muutus_id, b.muutus_id],
      allikaviited: unikaalsed([a.allikaviide, b.allikaviide]),
      protokollid: unikaalsed([a.lahkus_prot, b.liitus_prot]),
      ...(eiValitud(b) && { eiValitud: true }),
    });
  }

  // Reegel 3
  for (const m of read) {
    if (kasutatud.has(m.muutus_id)) continue;
    syndmused.push({
      id: `${m.liik}-${m.muutus_id}`,
      liik: m.liik,
      kuupaev: m.kuupaev,
      koosseis_id: koosseisId,
      isik: m.isik_id,
      toorNimi: [m.eesnimi, m.perenimi].filter(Boolean).join(" "),
      nimekiri: m.nimekiri,
      tapsustus: m.tapsustus,
      asendaja: m.asendaja_ID,
      asendatav: m.asendatav_ID,
      asendajaPuudub: m.liik === "lahkumine" && m.asendaja_ID === null,
      muutus_idd: [m.muutus_id],
      allikaviited: unikaalsed([m.allikaviide]),
      protokollid: unikaalsed(muutuseProtokoll(m)),
      ...(eiValitud(m) && { eiValitud: true }),
    });
  }

  // PA-07: allikaviidete koosolekud
  for (const s of syndmused) {
    const kpv = [s.kuupaev, ...s.protokollid.map(protKuupaevIso)];
    s.koosolekuViited = s.allikaviited.map((v) => allikaviiteKoosolek(andmed, v, kpv));
  }

  return syndmused.sort(
    (a, b) =>
      (a.kuupaev || "9999").localeCompare(b.kuupaev || "9999") ||
      Math.min(...a.muutus_idd) - Math.min(...b.muutus_idd)
  );
}

/** Sündmuses osalevad isikud (isiku lehe filter, eksport). */
export function syndmuseIsikud(s: Syndmus): number[] {
  switch (s.liik) {
    case "kinnitamine": return s.isikud;
    case "vahetus": return [s.lahkuja, s.asendaja];
    default: return s.isik !== null ? [s.isik] : [];
  }
}

/** PR-03 / UX-06: isiku sündmused kõigist koosseisudest (vahetus näidatakse mõlemal osapoolel). */
export function isikuSyndmused(andmed: Andmestik, isikId: number): Syndmus[] {
  const koosseisud = new Set(
    andmed.muutused
      .filter((m) => m.isik_id === isikId)
      .map((m) => m.koosseis_id)
  );
  return [...koosseisud]
    .flatMap((k) => koosseisuSyndmused(andmed, k))
    .filter((s) => syndmuseIsikud(s).includes(isikId))
    .sort((a, b) => a.kuupaev.localeCompare(b.kuupaev));
}

/**
 * UX-07: liikmete arv ajas — väärtus koosseisu algusel, igal sündmuse kuupäeval ja lõpus
 * (erireegel 1, `liikmedKuupaeval`). Kinnitamine arvu ei muuda: valitud on juba algushulgas.
 */
export function liikmeteArvuSeeria(
  andmed: Andmestik,
  koosseisId: string,
  algus: string,
  lopp: string
): { kuupaev: string; arv: number }[] {
  const kuupaevad = new Set<string>([algus]);
  for (const m of andmed.muutused) {
    if (m.koosseis_id === koosseisId && m.kuupaev && m.kuupaev >= algus && m.kuupaev <= lopp) {
      kuupaevad.add(m.kuupaev);
      // liitumine&lahkumine: liige ainult sel päeval → järgmisel päeval arv taastub
      if (m.liik === "liitumine&lahkumine" && m.kuupaev.length === 10) {
        const jargmine = new Date(m.kuupaev + "T00:00:00Z");
        jargmine.setUTCDate(jargmine.getUTCDate() + 1);
        const iso = jargmine.toISOString().slice(0, 10);
        if (iso <= lopp) kuupaevad.add(iso);
      }
    }
  }
  kuupaevad.add(lopp);
  return [...kuupaevad].sort().map((kuupaev) => ({
    kuupaev,
    arv: liikmedKuupaeval(andmed.valimised, andmed.muutused, koosseisId, kuupaev).size,
  }));
}

/** UX-10: eelmine/järgmine koosolek kronoloogiliselt (kuupaev, siis koosolek_id); `sobib` piirab valikut. */
export function naaberKoosolekud(
  andmed: Andmestik,
  id: string,
  sobib: (koosolekId: string) => boolean = () => true
): { eelmine: Koosolek | null; jargmine: Koosolek | null } {
  const jada = andmed.koosolekud
    .filter((k) => k.koosolek_id === id || sobib(k.koosolek_id))
    .sort((a, b) => a.kuupaev.localeCompare(b.kuupaev) || a.koosolek_id.localeCompare(b.koosolek_id));
  const i = jada.findIndex((k) => k.koosolek_id === id);
  if (i < 0) return { eelmine: null, jargmine: null };
  return { eelmine: jada[i - 1] ?? null, jargmine: jada[i + 1] ?? null };
}

/** AN-04: volikogu suurus astmetena (algne valimistest, hilisem muutuse kuupäevast). */
export function volikoguSuurus(k: Koosseis): { kuupaev: string; arv: number }[] {
  if (k.volikogu_suurus_algne === null) return [];
  const algus = k.valimised_algus || k.esimene_koosolek;
  const astmed = [{ kuupaev: algus, arv: k.volikogu_suurus_algne }];
  if (k.volikogu_suurus_hiljem !== null && k.volikogu_suurus_muutus) {
    astmed.push({ kuupaev: k.volikogu_suurus_muutus, arv: k.volikogu_suurus_hiljem });
  }
  return astmed;
}

/* ───────────── 5. etapp: isiku leht (PR5-02, PR5-03, PR5-04) ───────────── */

const PAEV = 86_400_000;
function paevNr(iso: string): number {
  const [a, k = "01", p = "01"] = iso.split("-");
  return Date.UTC(Number(a), Number(k) - 1, Number(p)) / PAEV;
}

export interface RibaLoik {
  koosseis_id: string;
  /** "1924–1926" */
  nimi: string;
  /** koosseisu periood ribal: esimene … viimane koosolek (omaniku otsus 20.11.2026) */
  algus: string;
  lopp: string;
  /** liikmepäevade osa koosseisu perioodist 0…1 */
  taidetud: number;
  /** täidetud osad lõigu sees (0…1) */
  osad: { vasak: number; laius: number; algus: string; lopp: string }[];
  /** "1924–1926: liige 15.01.1924–28.01.1924" / "1934–1939: ei olnud liige" */
  silt: string;
}

/**
 * PR5-02: koosseisuriba — 9 võrdset lõiku. Täidetud osa = isiku liikmepäevad (`karjaariSegmendid`,
 * PA-09) koosseisu perioodist. Periood ja isiku lõigud on esimesest viimase koosolekuni
 * (valitu lõik, mis karjaariSegmendid järgi algab valimistest, lõigatakse esimesele koosolekule).
 */
export function koosseisuRibaLoigud(andmed: Andmestik, isikId: number): RibaLoik[] {
  const segmendid = karjaariSegmendid(andmed, isikId);
  return andmed.koosseisud.map((k) => {
    const nimi = k.koosseis_id.replace("-", "–");
    const algus = k.esimene_koosolek || k.valimised_algus;
    const lopp = k.viimane_koosolek || k.valimised_lopp || algus;
    const p0 = paevNr(algus);
    const kokku = paevNr(lopp) - p0 + 1;
    const osad = segmendid
      .filter((s) => s.koosseis_id === k.koosseis_id)
      .map((s) => {
        const sAlgus = s.algus < algus ? algus : s.algus;
        const sLopp = s.lopp > lopp ? lopp : s.lopp < sAlgus ? sAlgus : s.lopp;
        const vasak = (paevNr(sAlgus) - p0) / kokku;
        const laius = (paevNr(sLopp) - paevNr(sAlgus) + 1) / kokku;
        return { vasak, laius, algus: sAlgus, lopp: sLopp };
      });
    const taidetud = Math.min(1, osad.reduce((s, o) => s + o.laius, 0));
    const silt = osad.length
      ? `${nimi}: liige ${osad
          .map((o) => (o.algus === o.lopp ? kuupaevLyhikeD(o.algus) : `${kuupaevLyhikeD(o.algus)}–${kuupaevLyhikeD(o.lopp)}`))
          .join(", ")}`
      : `${nimi}: ei olnud liige`;
    return { koosseis_id: k.koosseis_id, nimi, algus, lopp, taidetud, osad, silt };
  });
}

function kuupaevLyhikeD(iso: string): string {
  const o = iso.split("-");
  return o.length < 3 ? iso : `${o[2]}.${o[1]}.${o[0]}`;
}

export type AjaluguKirje =
  | {
      liik: "valimised";
      kuupaev: string;
      /** valimiste päev(ad) koosseisu tabelist */
      kuupaevad: string[];
      valitud: boolean;
      /** kanooniline nimekiri (NK-03), selle puudumisel toorkuju */
      nimekiri: string;
      /** "5. koht nimekirjas, üldjärjestuses 7." */
      koht: string;
      amet: string;
      /** kokku volditud rea ainus viide: valitul tulemuste, kandidaadil kandidaatide allikas */
      allikas: Allikas;
      /** VK-03 täisvaade ("allikad") */
      kirje: ValimineKoos;
    }
  | { liik: "syndmus"; kuupaev: string; syndmus: Syndmus };

/** PR5-03 järjestus: kuupäev; samal kuupäeval valimised enne liikmesmuutusi; muidu stabiilne. */
export function ajaluguJarjestus(a: AjaluguKirje, b: AjaluguKirje): number {
  return (
    (a.kuupaev || "9999").localeCompare(b.kuupaev || "9999") ||
    (a.liik === "valimised" ? 0 : 1) - (b.liik === "valimised" ? 0 : 1)
  );
}

/**
 * PR5-03: isiku ajalugu — valimised (VK-01) ja liikmesmuutused (UX-06 sündmused, sh kinnitamine)
 * ühes kronoloogilises loendis.
 */
export function isikuAjalugu(andmed: Andmestik, isikId: number): AjaluguKirje[] {
  const nimed = nimekirjaNimed(andmed);
  const valimised: AjaluguKirje[] = isikuValimisedKoos(andmed, isikId).map((kirje) => {
    const k = andmed.koosseisud.find((x) => x.koosseis_id === kirje.koosseis_id);
    const kuupaevad = [k?.valimised_algus, k?.valimised_lopp].filter((x): x is string => !!x);
    const read = andmed.valimised.filter((v) => v.isik_id === isikId && v.aasta === kirje.aasta);
    const valitud = kirje.tulemus === "valitud";
    const pea =
      (valitud ? read.find((r) => r.roll === "valitud") : read.find((r) => r.allikas === "kandidaadid")) ??
      read.find((r) => r.allikas === "kandidaadid") ??
      read[0];
    const nimekiri = pea.nimekiri_id !== null
      ? nimed.get(pea.nimekiri_id) ?? pea.nimekiri_nimi.trim()
      : pea.nimekiri_nimi.trim() || kirje.nimekiri[0]?.nimi || "";
    const koht = [
      pea.jrk_nimekiri.trim() ? `${pea.jrk_nimekiri.trim()}. koht nimekirjas` : "",
      pea.jrk_uld.trim() ? `üldjärjestuses ${pea.jrk_uld.trim()}.` : "",
    ].filter(Boolean).join(", ");
    return {
      liik: "valimised",
      kuupaev: kuupaevad[0] ?? String(kirje.aasta),
      kuupaevad: kuupaevad.length ? kuupaevad : [String(kirje.aasta)],
      valitud,
      nimekiri,
      koht,
      amet: pea.amet.trim(),
      allikas: valimiseAllikas(andmed, pea),
      kirje,
    };
  });
  const syndmused: AjaluguKirje[] = isikuSyndmused(andmed, isikId).map((s) => ({
    liik: "syndmus", kuupaev: s.kuupaev, syndmus: s,
  }));
  return [...valimised, ...syndmused].sort(ajaluguJarjestus);
}

/**
 * PR5-04 (tuletatud): koosolekud, mil isik oli liige (`liikmedKuupaeval`), ja neist need, kus ta
 * ei olnud protokollis (kõrge/keskmine kindlus) puudujana.
 */
export function osalemine(andmed: Andmestik, isikId: number): { osales: number; liige: number } {
  const puudus = new Set(
    andmed.osavott
      .filter((o) => o.isik_id === isikId && o.staatus !== "kohal" &&
        (o.sidumise_kindlus === "kõrge" || o.sidumise_kindlus === "keskmine"))
      .map((o) => o.koosolek_id)
  );
  let liige = 0;
  let osales = 0;
  for (const k of andmed.koosolekud) {
    if (!liikmedKuupaevalMemo(andmed, k.koosseis_id, k.kuupaev).has(isikId)) continue;
    liige++;
    if (!puudus.has(k.koosolek_id)) osales++;
  }
  return { osales, liige };
}
