import type {
  Andmestik, IsikuRida, Koosolek, KoosolekuRida, Muutus, Valimine,
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

/** Isiku peamine nimekiri (toorkuju): sagedasim valimiste kirjetes; eelistab valitud-ridu. */
export function peamineNimekiri(andmed: Andmestik, isikId: number): string {
  const loenda = (read: Valimine[]): string => {
    const loend = new Map<string, number>();
    for (const r of read) {
      if (r.nimekiri_nimi) {
        loend.set(r.nimekiri_nimi, (loend.get(r.nimekiri_nimi) ?? 0) + 1);
      }
    }
    let parim = "";
    let max = 0;
    for (const [nimi, arv] of loend) {
      if (arv > max) {
        max = arv;
        parim = nimi;
      }
    }
    return parim;
  };
  const oma = andmed.valimised.filter((v) => v.isik_id === isikId);
  return (
    loenda(oma.filter((v) => v.roll === "valitud")) ||
    loenda(oma) ||
    andmed.muutused.find((m) => m.isik_id === isikId && m.nimekiri)?.nimekiri ||
    ""
  );
}

/** Valimiste rea allikas (UX-03): valitav → kandidaatide_allikas, valitud → valimistulemuste_allikas. */
export interface Allikas {
  roll: "valitav" | "valitud";
  viide: string;
}

export interface Vaartus {
  vaartus: string;
  allikad: Allikas[];
}

/** UX-03: ühe isiku ühe valimisaasta read koondatuna. */
export interface ValimineKoos {
  aasta: number;
  koosseis_id: string;
  tulemus: "valitud" | "kandidaat";
  /** eri toorkujud eraldi, kumbki oma allikaga */
  nimekiri: { nr: string; nimi: string; allikad: Allikas[] }[];
  koht: { jrk_nimekiri?: string; jrk_uld?: string; jrk_ringkond?: string };
  ringkond?: string;
  haaled?: { jsk1?: string; jsk2?: string; kokku?: number };
  amet: Vaartus[];
  /** kandidaadirealt; mitu väärtust = allikad erinevad */
  vanus: Vaartus[];
  synniaeg: Vaartus[];
  aadress: { tekst: string; allikad: Allikas[] }[];
  markused: Vaartus[];
  /** kõik read, millest kirje koosneb (valitav enne valitud) */
  allikad: Allikas[];
}

function valimiseAllikas(andmed: Andmestik, v: Valimine): Allikas {
  const k = andmed.koosseisud.find((x) => x.koosseis_id === v.koosseis_id);
  const viide = !k ? "" : v.roll === "valitav" ? k.kandidaatide_allikas : k.valimistulemuste_allikas;
  return { roll: v.roll, viide };
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
    if (olemas) olemas.allikad.push(allikas);
    else tulem.push({ k, vaartus: tekst.trim(), allikad: [allikas] });
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
      read = [...read].sort((a, b) => (a.roll === b.roll ? 0 : a.roll === "valitav" ? -1 : 1));
      const allikad = read.map((r) => valimiseAllikas(andmed, r));
      const paar = read.map((r, i) => ({ r, allikas: allikad[i] }));

      const nimekiri: ValimineKoos["nimekiri"] = [];
      for (const { r, allikas } of paar) {
        const nimi = r.nimekiri_nimi.trim();
        const nr = r.nimekiri_nr.trim();
        if (!nimi && !nr) continue;
        const olemas = nimekiri.find(
          (n) => n.nimi === nimi && (n.nr === nr || !n.nr || !nr)
        );
        if (olemas) {
          olemas.nr ||= nr;
          olemas.allikad.push(allikas);
        } else {
          nimekiri.push({ nr, nimi, allikad: [allikas] });
        }
      }

      const koht: ValimineKoos["koht"] = {};
      const jrkN = yks(read.map((r) => r.jrk_nimekiri));
      const jrkU = yks(read.map((r) => r.jrk_uld));
      const jrkR = yks(read.map((r) => r.jrk_ringkond));
      if (jrkN) koht.jrk_nimekiri = jrkN;
      if (jrkU) koht.jrk_uld = jrkU;
      if (jrkR) koht.jrk_ringkond = jrkR;

      const jsk1 = yks(read.map((r) => r.haaled_1_jsk));
      const jsk2 = yks(read.map((r) => r.haaled_2_jsk));
      const kokku = read.find((r) => r.haaled_kokku !== null)?.haaled_kokku ?? undefined;
      const haaled = jsk1 || jsk2 || kokku !== undefined
        ? { ...(jsk1 && { jsk1 }), ...(jsk2 && { jsk2 }), ...(kokku !== undefined && { kokku }) }
        : undefined;

      const aadress = kogu(
        paar.flatMap(({ r, allikas }) => reaAadressid(r).map((tekst) => ({ tekst, allikas }))),
        aadressiVoti
      ).map(({ vaartus, allikad }) => ({ tekst: vaartus, allikad }));

      // Vanus ja sünniaeg on kandidaadireal; valitu rida neid tavaliselt ei sisalda.
      return {
        aasta,
        koosseis_id: read[0].koosseis_id,
        tulemus: read.some((r) => r.roll === "valitud") ? "valitud" : "kandidaat",
        nimekiri,
        koht,
        ...(yks(read.map((r) => r.ringkond_nr)) && { ringkond: yks(read.map((r) => r.ringkond_nr)) }),
        ...(haaled && { haaled }),
        amet: kogu(paar.map(({ r, allikas }) => ({ tekst: r.amet, allikas }))),
        vanus: kogu(paar.map(({ r, allikas }) => ({ tekst: r.vanus, allikas }))),
        synniaeg: kogu(paar.map(({ r, allikas }) => ({ tekst: r.synniaeg, allikas }))),
        aadress,
        markused: kogu(paar.map(({ r, allikas }) => ({ tekst: r.markused, allikas }))),
        allikad,
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
      if (!kirje.allikad.some((a) => a.roll === allikas.roll && a.viide === allikas.viide)) {
        kirje.allikad.push(allikas);
      }
      tulem.set(k, kirje);
    }
  }
  return [...tulem.values()];
}

/** Isikute tabeli read (/isikud, IS-01). */
export function isikuRead(andmed: Andmestik): IsikuRida[] {
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
      peamine_nimekiri: peamineNimekiri(andmed, i.isik_id),
      oli_juhataja: juhatajaIdd.has(i.isik_id),
      aadressid: isikuAadressidKoos(andmed, i.isik_id).map((a) => `${a.tekst} (${a.aastad.join(", ")})`),
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
      } else if (m.liik === "liitumine&lahkumine" && !avatud) {
        segmendid.push({ koosseis_id: kid, algus: m.kuupaev, lopp: m.kuupaev });
      }
    }
    if (avatud) {
      segmendid.push({ koosseis_id: kid, algus: avatud, lopp: koosseisuLopp });
    }
  }
  return segmendid;
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
