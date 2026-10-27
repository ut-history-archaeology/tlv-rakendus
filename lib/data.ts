import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type {
  Andmestik, Isik, Koosolek, KoosolekJuhataja, Koosseis, Muutus, Osavott, Valimine,
} from "./types";
import type { MainimiseRida, PaevakorraRida, ProtokolliRida } from "./protokollid/types";

const DATA_DIR = path.join(process.cwd(), "data");

function loeCSV<T = Record<string, string>>(fail: string): T[] {
  const sisu = fs.readFileSync(path.join(DATA_DIR, fail), "utf-8");
  const res = Papa.parse<T>(sisu, { header: true, skipEmptyLines: true });
  if (res.errors.length > 0) {
    const tosine = res.errors.filter((e) => e.code !== "TooFewFields");
    if (tosine.length > 0) {
      throw new Error(`CSV viga failis ${fail}: ${JSON.stringify(tosine[0])}`);
    }
  }
  return res.data;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** "1871.0" → "1871" (Exceli float-jäänused). */
function puhastaAasta(v: string | undefined): string {
  if (!v) return "";
  return v.replace(/\.0$/, "");
}

let cache: Andmestik | null = null;

/** Laeb kogu andmestiku CSV-dest (build-ajal; tulemus mälus puhverdatud). */
export function loeAndmestik(): Andmestik {
  if (cache) return cache;

  const isikud: Isik[] = loeCSV("isikud.csv").map((r) => ({
    isik_id: Number(r.isik_id),
    perenimi: r.perenimi ?? "",
    alt_perenimi: r.alt_perenimi ?? "",
    eesnimi: r.eesnimi ?? "",
    alt_eesnimi: r.alt_eesnimi ?? "",
    sugu: r.sugu ?? "",
    isanimi: r.isanimi ?? "",
    synd_kuupaev: puhastaAasta(r.synd_kuupaev),
    synd_tuletatud: r.synd_tuletatud ?? "",
    surm_kuupaev: puhastaAasta(r.surm_kuupaev),
    wikidata: r.wikidata ?? "",
    arhiiviviited: r.arhiiviviited ?? "",
    AKL_ID: r.AKL_ID ?? "",
  }));

  const koosseisud: Koosseis[] = loeCSV("koosseisud.csv").map((r) => ({
    koosseis_id: r.koosseis_id,
    aasta_valimised: r.aasta_valimised ?? "",
    valimised_algus: r.valimised_algus ?? "",
    valimised_lopp: r.valimised_lopp ?? "",
    esimene_koosolek: r.esimene_koosolek ?? "",
    viimane_koosolek: r.viimane_koosolek ?? "",
    valimised_allikas: r.valimised_allikas ?? "",
    valimistulemuste_allikas: r.valimistulemuste_allikas ?? "",
    kandidaatide_allikas: r.kandidaatide_allikas ?? "",
  }));

  const koosolekud: Koosolek[] = loeCSV("koosolekud.csv").map((r) => ({
    koosolek_id: r.koosolek_id,
    kuupaev: r.kuupaev ?? "",
    kuupaev_lopp: r.kuupaev_lopp ?? "",
    nadalapaev: r.nadalapaev ?? "",
    vorm: r.vorm?.trim() || "määramata",
    koosseis_id: r.koosseis_id ?? "",
    juhataja: r.juhataja ?? "",
    koosseis_arv: num(r.koosseis_arv),
    kohal_arv: num(r.kohal_arv),
    kohal_arv_2paev: num(r.kohal_arv_2paev),
    kuupaev_txt: r.kuupaev_txt ?? "",
    protokolli_algus_txt: r.protokolli_algus_txt ?? "",
  }));

  const juhatajad: KoosolekJuhataja[] = loeCSV("koosolek_juhatajad.csv").map((r) => ({
    koosolek_id: r.koosolek_id,
    juhataja_nimi: r.juhataja_nimi ?? "",
    isik_id: num(r.isik_id),
  }));

  const muutused: Muutus[] = loeCSV("muutused.csv").map((r) => ({
    muutus_id: Number(r.muutus_id),
    isik_id: num(r.isik_id),
    perenimi: r.perenimi ?? "",
    eesnimi: r.eesnimi ?? "",
    nimekiri: r.nimekiri ?? "",
    kuupaev: r.kuupaev ?? "",
    koosseis_id: r.koosseis_id ?? "",
    liik: r.liik as Muutus["liik"],
    liitus_prot: r.liitus_prot ?? "",
    lahkus_prot: r.lahkus_prot ?? "",
    ryhmavahetus_prot: r.ryhmavahetus_prot ?? "",
    peatatud_prot: r.peatatud_prot ?? "",
    allikaviide: r.allikaviide ?? "",
    tapsustus: r["täpsustus"] ?? "",
    asendaja_ID: num(r.asendaja_ID),
    asendatav_ID: num(r.asendatav_ID),
    asendaja_puudub: r.asendaja_puudub ?? "",
    asendatav_puudub: r.asendatav_puudub ?? "",
  }));

  const valimised: Valimine[] = loeCSV("valimised.csv").map((r) => ({
    aasta: Number(r.aasta),
    koosseis_id: r.koosseis_id ?? "",
    roll: r.roll as Valimine["roll"],
    isik_id: Number(r.isik_id),
    nimekiri_nr: puhastaAasta(r.nimekiri_nr),
    nimekiri_nimi: r.nimekiri_nimi ?? "",
    ringkond_nr: puhastaAasta(r.ringkond_nr),
    perenimi: r.perenimi ?? "",
    alt_perenimi: r.alt_perenimi ?? "",
    eesnimi: r.eesnimi ?? "",
    alt_eesnimi: r.alt_eesnimi ?? "",
    isanimi: r.isanimi ?? "",
    vanus: puhastaAasta(r.vanus),
    synniaeg: puhastaAasta(r["sünniaeg"]),
    synniaeg_tuletatud: r["sünniaeg_tuletatud"] ?? "",
    elukoht_tanav: r["elukoht_tänav"] ?? "",
    elukoht_majanr: puhastaAasta(r.elukoht_majanr),
    elukoht_korterinr: puhastaAasta(r.elukoht_korterinr),
    elukoht_muu: r.elukoht_muu ?? "",
    amet: r.amet ?? "",
    markused: r["märkused"] ?? "",
    jrk_uld: puhastaAasta(r["jrk_üld"]),
    jrk_nimekiri: puhastaAasta(r.jrk_nimekiri),
    jrk_ringkond: puhastaAasta(r.jrk_ringkond),
    haaled_1_jsk: puhastaAasta(r["hääled_1_jsk"]),
    haaled_2_jsk: puhastaAasta(r["hääled_2_jsk"]),
    haaled_kokku: num(puhastaAasta(r["hääled_kokku"])),
  }));

  const osavott: Osavott[] = loeCSV("osavott.csv").map((r) => ({
    koosolek_id: r.koosolek_id,
    kuupaev: r.kuupaev ?? "",
    koosseis_id: r.koosseis_id ?? "",
    staatus: r.staatus as Osavott["staatus"],
    nimi_toor: r.nimi_toor ?? "",
    isik_id: num(r.isik_id),
    sidumise_kindlus: (r.sidumise_kindlus ?? "") as Osavott["sidumise_kindlus"],
  }));

  const protokollid: ProtokolliRida[] = loeCSV("protokollid.csv").map((r) => ({
    koosolek_id: r.koosolek_id,
    fail: r.fail ?? "",
    kuupaev_1: r.kuupaev_1 ?? "",
    kuupaev_2: r.kuupaev_2 ?? "",
    transkribus_url: r.transkribus_url ?? "",
    arhiiviviide: r.arhiiviviide ?? "",
    lehekylgi: num(r.lehekylgi),
    lehekylgi_tekstita: num(r.lehekylgi_tekstita),
    esimene_lk: r.esimene_lk ?? "",
    viimane_lk: r.viimane_lk ?? "",
    sonu: num(r.sonu),
    lauseid: num(r.lauseid),
    paevakorrapunkte: num(r.paevakorrapunkte),
    olemeid: num(r.olemeid),
    olemeid_PER: num(r.olemeid_PER),
    seotud_isikuid: num(r.seotud_isikuid),
    konesid: num(r.konesid),
    tekst_kb: num(r.tekst_kb),
    lisasid: num(r.lisasid),
    tabeleid: num(r.tabeleid),
    markus: r.markus ?? "",
  }));

  const paevakord: PaevakorraRida[] = loeCSV("paevakorrapunktid.csv").map((r) => ({
    koosolek_id: r.koosolek_id,
    jrk: Number(r.jrk),
    nr: Number(r.nr),
    pealkiri: r.pealkiri ?? "",
    algus: Number(r.algus),
    lopp: Number(r.lopp),
    sonu: Number(r.sonu),
  }));

  const mainimised: MainimiseRida[] = loeCSV("protokolli_mainimised.csv").map((r) => ({
    isik_id: Number(r.isik_id),
    koosolek_id: r.koosolek_id,
    kuupaev: r.kuupaev ?? "",
    kindlus: r.kindlus as MainimiseRida["kindlus"],
    arv: Number(r.arv),
  }));

  cache = {
    isikud, koosseisud, koosolekud, juhatajad, muutused, valimised, osavott,
    protokollid, paevakord, mainimised,
  };
  return cache;
}
