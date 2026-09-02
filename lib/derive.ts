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

/** Isiku teadaolevad aadressid tekstina, valimisaastate kaupa (PR-05). */
export function isikuAadressid(andmed: Andmestik, isikId: number): string[] {
  const read: string[] = [];
  for (const v of andmed.valimised) {
    if (v.isik_id !== isikId) continue;
    const osad: string[] = [];
    if (v.elukoht_tanav) {
      let maja = v.elukoht_majanr;
      if (maja && v.elukoht_korterinr) maja += "-" + v.elukoht_korterinr;
      osad.push([v.elukoht_tanav, maja].filter(Boolean).join(" "));
    }
    if (v.elukoht_muu) osad.push(v.elukoht_muu);
    if (osad.length > 0) read.push(`${v.aasta}: ${osad.join("; ")}`);
  }
  return read;
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
      isanimi: i.isanimi,
      synd_kuupaev: i.synd_kuupaev,
      synd_tuletatud: i.synd_tuletatud,
      surm_kuupaev: i.surm_kuupaev,
      wikidata: i.wikidata,
      arhiiviviited: i.arhiiviviited,
      AKL_ID: i.AKL_ID,
      koosseisud,
      koosseise: koosseisud.length,
      esimene_koosseis: koosseisud[0] ?? "",
      viimane_koosseis: koosseisud[koosseisud.length - 1] ?? "",
      peamine_nimekiri: peamineNimekiri(andmed, i.isik_id),
      oli_juhataja: juhatajaIdd.has(i.isik_id),
      aadressid: isikuAadressid(andmed, i.isik_id),
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
