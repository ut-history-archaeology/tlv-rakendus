/**
 * ET-01: protokollikorpuse eeltöötlus.
 *   npm run eeltootle -- [--korpus korpus/json] [--valjund public/protokollid] [--kontrolli] [--ilma-piltideta]
 *
 * Sisend: korpus/json/*.json, data/koosolekud.csv, data/isikud.csv, data/protokolli_lehed.csv,
 *         scripts/protokollid-vasted.json
 * Väljund: public/protokollid/<K-id>.json, public/protokollid/otsing/<aasta>.json, public/protokollid/_meta.json,
 *          data/protokollid.csv, data/paevakorrapunktid.csv, data/protokolli_mainimised.csv
 * Katkestab (exit 1) ET-06 vigade korral; hoiatused logitakse kokkuvõttesse.
 */
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { KorpuseFail } from "../lib/protokollid/korpus";
import { kiht, puhastaPealkiri } from "../lib/protokollid/korpus";
import { seoFailidKoosolekutega, type Ylekirjutused } from "../lib/protokollid/vasted";
import { tootleProtokoll, sonuVahemikus } from "../lib/protokollid/eeltootlus";
import { ehitaOtsinguKirje } from "../lib/protokollid/otsing";
import { mainimisteRead } from "../lib/protokollid/mainimised";
import type { LeheRida } from "../lib/protokollid/lehed";
import type {
  MainimiseRida, OtsinguKild, PaevakorraRida, ProtokolliRida, ProtokollideMeta,
} from "../lib/protokollid/types";

// ---------- argumendid ----------
const args = process.argv.slice(2);
function lipp(nimi: string, vaikimisi: string): string {
  const i = args.indexOf(nimi);
  return i >= 0 && args[i + 1] ? args[i + 1] : vaikimisi;
}
const JUUR = process.cwd();
const KORPUS = path.resolve(JUUR, lipp("--korpus", "korpus/json"));
const VALJUND = path.resolve(JUUR, lipp("--valjund", "public/protokollid"));
const KONTROLLI = args.includes("--kontrolli");
const ILMA_PILTIDETA = args.includes("--ilma-piltideta");
const DATA = path.join(JUUR, "data");
const PILDID = path.join(JUUR, "public", "pildid");

const algus = Date.now();
const vead: string[] = [];
const hoiatused: string[] = [];
const log = (s: string) => console.log(s);

// ---------- abifunktsioonid ----------
function loeCSV(fail: string): Record<string, string>[] {
  const sisu = fs.readFileSync(path.join(DATA, fail), "utf-8");
  const res = Papa.parse<Record<string, string>>(sisu, { header: true, skipEmptyLines: true });
  const tosine = res.errors.filter((e) => e.code !== "TooFewFields");
  if (tosine.length) throw new Error(`CSV viga failis ${fail}: ${JSON.stringify(tosine[0])}`);
  return res.data;
}
function csvValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function kirjutaCSV(fail: string, veerud: string[], read: Record<string, string | number | null | undefined>[]) {
  const ridu = [veerud.join(","), ...read.map((r) => veerud.map((v) => csvValue(r[v])).join(","))];
  if (!KONTROLLI) fs.writeFileSync(fail, ridu.join("\n") + "\n", "utf-8");
}
function kirjutaJSON(fail: string, sisu: unknown): number {
  const s = JSON.stringify(sisu);
  if (!KONTROLLI) {
    fs.mkdirSync(path.dirname(fail), { recursive: true });
    fs.writeFileSync(fail, s, "utf-8");
  }
  return Buffer.byteLength(s, "utf8");
}
/** Faili alguse `{"text": "…"` väärtus ilma kogu JSON-i parsimata (SD-01 p 3 kontroll). */
function tekstiAlgus(fail: string): string | undefined {
  const fd = fs.openSync(fail, "r");
  const buf = Buffer.alloc(4096);
  const n = fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);
  const m = /^\{\s*"text"\s*:\s*"((?:[^"\\]|\\.){0,300})/.exec(buf.toString("utf-8", 0, n));
  if (!m) return undefined;
  try {
    return JSON.parse('"' + m[1] + '"');
  } catch {
    return undefined;
  }
}
function mb(b: number) {
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

// ---------- sisendid ----------
if (!fs.existsSync(KORPUS)) {
  console.error(`Korpuse kaust puudub: ${KORPUS}`);
  process.exit(1);
}
const failid = fs.readdirSync(KORPUS).filter((f) => f.endsWith(".json")).sort();
const koosolekud = loeCSV("koosolekud.csv");
const isikud = loeCSV("isikud.csv");
const tuntudIsikud = new Set(isikud.map((r) => Number(r.isik_id)));
const leheReadKoik: LeheRida[] = loeCSV("protokolli_lehed.csv").map((r) => ({
  protokoll: r.protokoll,
  jrk: Number(r.jrk),
  arhiiviviide: r.arhiiviviide,
  lehekulg: r.lehekulg,
  xml_file: r.xml_file ?? "",
  pilt: r.pilt,
  transkribus_lk: Number(r.transkribus_lk),
  tekstita: r.tekstita === "1",
}));
const lehedFailiti = new Map<string, LeheRida[]>();
for (const r of leheReadKoik) {
  const l = lehedFailiti.get(r.protokoll) ?? [];
  l.push(r);
  lehedFailiti.set(r.protokoll, l);
}
const vastedFail = JSON.parse(fs.readFileSync(path.join(JUUR, "scripts", "protokollid-vasted.json"), "utf-8")) as {
  vasted: Record<string, { koosolek_id: string | null }>;
};
const ylekirjutused: Ylekirjutused = Object.fromEntries(
  Object.entries(vastedFail.vasted).map(([f, v]) => [f, v.koosolek_id])
);

log(`Korpus: ${failid.length} faili (${KORPUS})`);
log(`Koosolekuid CSV-s: ${koosolekud.length}; isikuid: ${isikud.length}; lehti CSV-s: ${leheReadKoik.length}`);

// ---------- SD-01 vasted ----------
const tekstiAlgused = new Map<string, string>();
for (const f of failid) {
  const t = tekstiAlgus(path.join(KORPUS, f));
  if (t !== undefined) tekstiAlgused.set(f, t);
}
let vasted: Map<string, string | null>;
let markused: Map<string, string[]>;
let erinevaAlgusega: string[] = [];
try {
  const t = seoFailidKoosolekutega(
    failid,
    koosolekud.map((k) => ({
      koosolek_id: k.koosolek_id, kuupaev: k.kuupaev, kuupaev_lopp: k.kuupaev_lopp ?? "",
      protokolli_algus_txt: k.protokolli_algus_txt ?? "",
    })),
    ylekirjutused,
    tekstiAlgused
  );
  vasted = t.vasted;
  markused = t.markused;
  erinevaAlgusega = t.erinevaAlgusega;
  hoiatused.push(...t.hoiatused.map((h) => `SD-01: ${h}`));
} catch (e) {
  console.error(`SD-01 VIGA: ${(e as Error).message}`);
  process.exit(1);
}
for (const f of Object.keys(ylekirjutused)) {
  if (!failid.includes(f)) hoiatused.push(`vasted.json viitab failile, mida korpuses pole: ${f}`);
}
for (const f of lehedFailiti.keys()) {
  if (!failid.includes(f)) vead.push(`protokolli_lehed.csv protokoll puudub korpuses: ${f}`);
}

// ---------- failide töötlus ----------
const koosolekMap = new Map(koosolekud.map((k) => [k.koosolek_id, k]));
const protokolliRead: ProtokolliRida[] = [];
const paevakorraRead: PaevakorraRida[] = [];
const mainimised: MainimiseRida[] = [];
const killud = new Map<number, OtsinguKild>();
const seotudIdd: string[] = [];
let valjundBaite = 0;
let suurim = { id: "", baite: 0 };
let lehti = 0, lehtiTekstita = 0, protokolleTekstitaLehtedega = 0;
let paljuKandidaate = 0, olemeidYlePiiri = 0, konedIlmaOlemita = 0;
const korduvadNumbrid: string[] = [];
const kasutatudPildid = new Set<string>();
const tekstitaLehed: string[] = [];

for (const f of failid) {
  const id = vasted.get(f);
  if (id === undefined) {
    vead.push(`failil ${f} pole vastet ega null-kirjet`);
    continue;
  }
  if (id === null) {
    hoiatused.push(`fail ${f} on teadlikult sidumata (vasted.json null)`);
    protokolliRead.push(tyhiRida("", f, "teadlikult sidumata"));
    continue;
  }
  const koosolek = koosolekMap.get(id)!;
  let fail: KorpuseFail;
  try {
    fail = JSON.parse(fs.readFileSync(path.join(KORPUS, f), "utf-8")) as KorpuseFail;
  } catch (e) {
    vead.push(`${f}: JSON ei parsi: ${(e as Error).message}`);
    continue;
  }
  try {
    const t = tootleProtokoll(fail, { id, fail: f, tuntudIsikud, leheRead: lehedFailiti.get(f) ?? [] });
    const p = t.andmed;
    hoiatused.push(...t.hoiatused);
    paljuKandidaate += t.palju_kandidaate;
    olemeidYlePiiri += t.olemeid_yle_punktipiiri;
    konedIlmaOlemita += t.koned_ilma_olemita;
    if (t.korduvad_numbrid.length) korduvadNumbrid.push(`${id} (${f}): ${t.korduvad_numbrid.join(", ")}`);
    lehti += p.lehed.length;
    const tekstita = p.lehed.filter((l) => l.tekstita);
    lehtiTekstita += tekstita.length;
    if (tekstita.length) {
      protokolleTekstitaLehtedega++;
      tekstitaLehed.push(`${id}: lk ${tekstita.map((l) => l.lk).join(", ")}`);
    }
    for (const l of p.lehed) kasutatudPildid.add(l.pilt);

    // väljund: protokoll
    const baite = kirjutaJSON(path.join(VALJUND, `${id}.json`), p);
    valjundBaite += baite;
    if (baite > suurim.baite) suurim = { id, baite };
    seotudIdd.push(id);

    // otsingukild (aasta = CSV kuupäev, mitte failinimi)
    const aasta = Number(koosolek.kuupaev.slice(0, 4));
    const kild = killud.get(aasta) ?? { aasta, protokollid: [] };
    kild.protokollid.push(ehitaOtsinguKirje(p, { kuupaev: koosolek.kuupaev, kuupaev_lopp: koosolek.kuupaev_lopp ?? "" }));
    killud.set(aasta, kild);

    // ET-07 päevakorrapunktid
    for (const pk of p.paevakord) {
      paevakorraRead.push({
        koosolek_id: id, jrk: pk.jrk, nr: pk.nr,
        pealkiri: puhastaPealkiri(p.tekst.slice(pk.pealkiri[0], pk.pealkiri[1])),
        algus: pk.algus, lopp: pk.lopp, sonu: sonuVahemikus(fail, [pk.algus, pk.lopp]),
      });
    }
    // ET-08 mainimised
    mainimised.push(...mainimisteRead(id, koosolek.kuupaev, p.olemid));

    // ET-03 rida
    const m = [...(markused.get(f) ?? [])];
    if (koosolek.kuupaev !== p.kuupaevad[0]) m.push(`korpuse kuupäev ${p.kuupaevad.join("/")} ≠ CSV ${koosolek.kuupaev}`);
    const s = p.statistika;
    protokolliRead.push({
      koosolek_id: id, fail: f, kuupaev_1: koosolek.kuupaev, kuupaev_2: koosolek.kuupaev_lopp ?? "",
      transkribus_url: p.transkribus_url, arhiiviviide: p.arhiiviviide,
      lehekylgi: s.lehekylgi, lehekylgi_tekstita: s.lehekylgi_tekstita,
      esimene_lk: p.lehed[0].lk, viimane_lk: p.lehed[p.lehed.length - 1].lk,
      sonu: s.sonu, lauseid: s.lauseid, paevakorrapunkte: s.paevakorrapunkte, olemeid: s.olemeid,
      olemeid_PER: s.olemeid_PER, seotud_isikuid: s.seotud_isikuid, konesid: s.konesid, tekst_kb: s.tekst_kb,
      lisasid: s.lisasid, tabeleid: s.tabeleid, markus: m.join("; "),
    });
  } catch (e) {
    vead.push(`${f} → ${id}: ${(e as Error).message}`);
  }
}

function tyhiRida(id: string, fail: string, markus: string): ProtokolliRida {
  const k = koosolekMap.get(id);
  return {
    koosolek_id: id, fail, kuupaev_1: k?.kuupaev ?? "", kuupaev_2: k?.kuupaev_lopp ?? "",
    transkribus_url: "", arhiiviviide: "", lehekylgi: null, lehekylgi_tekstita: null, esimene_lk: "", viimane_lk: "",
    sonu: null, lauseid: null, paevakorrapunkte: null, olemeid: null, olemeid_PER: null, seotud_isikuid: null,
    konesid: null, tekst_kb: null, lisasid: null, tabeleid: null, markus,
  };
}

// koosolekud ilma protokollita (AP-03: K336 saab rea märkusega)
const protokolliga = new Set(seotudIdd);
const ilmaProtokollita = koosolekud.filter((k) => !protokolliga.has(k.koosolek_id)).map((k) => k.koosolek_id);
for (const id of ilmaProtokollita) {
  const markus = id === "K336" ? "ärakiri K335-st, protokollifaili pole" : "protokollifaili pole";
  hoiatused.push(`koosolek ilma protokollita: ${id} (${markus})`);
  protokolliRead.push(tyhiRida(id, "", markus));
}

// ---------- pildid ----------
let orbPildid: string[] = [];
if (!ILMA_PILTIDETA) {
  for (const suurus of ["1200", "300"]) {
    const kaust = path.join(PILDID, suurus);
    if (!fs.existsSync(kaust)) {
      vead.push(`piltide kaust puudub: ${kaust} (kasuta --ilma-piltideta, kui pilte pole kloonis)`);
      continue;
    }
    for (const p of kasutatudPildid) {
      if (!fs.existsSync(path.join(kaust, p))) vead.push(`pilt puudub: pildid/${suurus}/${p}`);
    }
  }
  const kaust1200 = path.join(PILDID, "1200");
  if (fs.existsSync(kaust1200)) {
    for (const aasta of fs.readdirSync(kaust1200)) {
      const ak = path.join(kaust1200, aasta);
      if (!fs.statSync(ak).isDirectory()) continue;
      for (const f of fs.readdirSync(ak)) {
        if (f.endsWith(".png") && !kasutatudPildid.has(`${aasta}/${f}`)) orbPildid.push(`${aasta}/${f}`);
      }
    }
  }
  orbPildid.sort();
}

// ---------- vead ----------
if (vead.length) {
  console.error(`\nVIGU: ${vead.length}`);
  for (const v of vead) console.error("  ✖ " + v);
  process.exit(1);
}

// ---------- väljundid ----------
const jarjesta = <T extends { koosolek_id: string }>(read: T[], kp: (r: T) => string) =>
  read.sort((a, b) => (kp(a) < kp(b) ? -1 : kp(a) > kp(b) ? 1 : a.koosolek_id.localeCompare(b.koosolek_id)));

let kildudeBaite = 0;
for (const [aasta, kild] of [...killud.entries()].sort((a, b) => a[0] - b[0])) {
  kild.protokollid.sort((a, b) => (a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : a.id.localeCompare(b.id)));
  kildudeBaite += kirjutaJSON(path.join(VALJUND, "otsing", `${aasta}.json`), kild);
}
jarjesta(protokolliRead, (r) => r.kuupaev_1);
kirjutaCSV(path.join(DATA, "protokollid.csv"), [
  "koosolek_id", "fail", "kuupaev_1", "kuupaev_2", "transkribus_url", "arhiiviviide", "lehekylgi", "lehekylgi_tekstita",
  "esimene_lk", "viimane_lk", "sonu", "lauseid", "paevakorrapunkte", "olemeid", "olemeid_PER", "seotud_isikuid",
  "konesid", "tekst_kb", "lisasid", "tabeleid", "markus",
], protokolliRead as unknown as Record<string, string | number | null>[]);
const kpMap = new Map(koosolekud.map((k) => [k.koosolek_id, k.kuupaev]));
paevakorraRead.sort((a, b) => {
  const ka = kpMap.get(a.koosolek_id)!, kb = kpMap.get(b.koosolek_id)!;
  return ka < kb ? -1 : ka > kb ? 1 : a.koosolek_id.localeCompare(b.koosolek_id) || a.jrk - b.jrk;
});
kirjutaCSV(path.join(DATA, "paevakorrapunktid.csv"), ["koosolek_id", "jrk", "nr", "pealkiri", "algus", "lopp", "sonu"],
  paevakorraRead as unknown as Record<string, string | number>[]);
mainimised.sort((a, b) => a.isik_id - b.isik_id || (a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : 0) || a.koosolek_id.localeCompare(b.koosolek_id) || a.kindlus.localeCompare(b.kindlus));
kirjutaCSV(path.join(DATA, "protokolli_mainimised.csv"), ["isik_id", "koosolek_id", "kuupaev", "kindlus", "arv"],
  mainimised as unknown as Record<string, string | number>[]);

const meta: ProtokollideMeta = {
  versioon: 1,
  genereeritud: new Date().toISOString(),
  korpuse_faile: failid.length,
  protokolle: seotudIdd.length,
  killud: [...killud.keys()].sort((a, b) => a - b),
  failid: [...seotudIdd].sort(),
  hoiatusi: hoiatused.length,
};
kirjutaJSON(path.join(VALJUND, "_meta.json"), meta);
if (!KONTROLLI) {
  // eemalda vananenud väljundfailid (nt kui koosolek_id muutus)
  for (const f of fs.readdirSync(VALJUND)) {
    if (/^K\d+\.json$/.test(f) && !protokolliga.has(f.replace(".json", ""))) fs.unlinkSync(path.join(VALJUND, f));
  }
}

// ---------- kokkuvõte ----------
const kestus = ((Date.now() - algus) / 1000).toFixed(1);
log(`\n=== Eeltöötluse kokkuvõte${KONTROLLI ? " (--kontrolli, midagi ei kirjutatud)" : ""} ===`);
log(`Faile: ${failid.length}; seotud koosolekuid: ${seotudIdd.length}; koosolekuid ilma protokollita: ${ilmaProtokollita.length} (${ilmaProtokollita.join(", ") || "—"})`);
log(`Käsitsi vasteid: ${Object.keys(ylekirjutused).length}; ID-de kontroll (ET-06): kõik council_member_id-d ⊂ isikud.csv ✓`);
log(`SD-01 p 3: teksti algus erineb CSV protokolli_algus_txt-st ${erinevaAlgusega.length} üherealisel päeval (OCR-müra lehe alguses; informatiivne${KONTROLLI ? ": " + erinevaAlgusega.join(", ") : ""})`);
log(`Päevakorrapunkte: ${paevakorraRead.length}; mainimiste ridu: ${mainimised.length}`);
log(`Lehti: ${lehti} (tekstita ${lehtiTekstita} / ${protokolleTekstitaLehtedega} protokollis); kasutusel pilte: ${kasutatudPildid.size}`);
log(`Olemeid üle päevakorrapunkti piiri: ${olemeidYlePiiri}; kõnesid ilma PER-olemita: ${konedIlmaOlemita}; ≥ 4 kandidaadiga olemeid: ${paljuKandidaate}`);
if (korduvadNumbrid.length) log(`Korduvad päevakorranumbrid: ${korduvadNumbrid.join(" | ")}`);
log(`Väljund: protokollid ${mb(valjundBaite)} (suurim ${suurim.id} ${mb(suurim.baite)}), otsingukillud ${mb(kildudeBaite)} (${killud.size} aastat), kokku ${mb(valjundBaite + kildudeBaite)}`);
if (!ILMA_PILTIDETA) log(`Protokollidega sidumata pilte public/pildid/1200: ${orbPildid.length}${orbPildid.length ? " (nt " + orbPildid.slice(0, 5).join(", ") + ")" : ""}`);
log(`Hoiatusi: ${hoiatused.length}; kestus ${kestus} s`);
const naita = KONTROLLI ? hoiatused : hoiatused.filter((h) => !h.includes("tekstita leht") && !h.includes("jagatud leht"));
for (const h of naita.slice(0, KONTROLLI ? 1000 : 60)) log("  ⚠ " + h);
if (naita.length > 60 && !KONTROLLI) log(`  … ja veel ${naita.length - 60} (vaata --kontrolli)`);
if (KONTROLLI && orbPildid.length) {
  log(`\nSidumata pildid (${orbPildid.length}):`);
  for (const p of orbPildid) log("  " + p);
}
