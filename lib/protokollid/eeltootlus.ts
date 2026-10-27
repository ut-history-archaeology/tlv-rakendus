/**
 * Eeltöötluse tuum: üks korpusefail → ProtokollAndmed (ET-02, ET-06, ET-09).
 * Puhas funktsioon (ilma failisüsteemita), et seda saaks testida (TE-11) ja skriptist kasutada.
 */
import { kiht, onSona, relKiht, transkribusLehenumber, vahemik, type KorpuseFail } from "./korpus";
import { loendLehed, seoLehed, sailikXmlist, xmlVahemikud, type LeheRida } from "./lehed";
import { sissejuhatusJaLopuosa } from "./plokid";
import { parsiCouncilMemberId, seoKoneleja } from "./sidumine";
import { erinevadNormid } from "./kirjakuju";
import type {
  Kone, Lisa, Olem, OlemiTyyp, Paevakorrapunkt, ProtokollAndmed, Vahemik,
} from "./types";
import { OLEMI_TYYBID } from "./types";

export interface TootluseKontekst {
  /** koosolek_id, nt "K174" */
  id: string;
  /** korpuse failinimi, nt "1930-09-08_2.json" */
  fail: string;
  /** isikud.csv ID-d (ET-06) */
  tuntudIsikud: Set<number>;
  /** protokolli_lehed.csv read selle faili kohta */
  leheRead: LeheRida[];
}

export interface TootluseTulemus {
  andmed: ProtokollAndmed;
  hoiatused: string[];
  /** ≥ 4 kandidaadiga olemite arv (ET-06 hoiatus) */
  palju_kandidaate: number;
  /** olemid, mis ületavad päevakorrapunkti piiri (informatiivne) */
  olemeid_yle_punktipiiri: number;
  /** kõned ilma PER-olemita */
  koned_ilma_olemita: number;
  /** päevakorrapunktide numbrid, mis failis korduvad */
  korduvad_numbrid: number[];
}

interface AgendaAnn { number: number }
interface NeAnn {
  tag: string;
  council_member_id: string | null;
  council_member_match_status: string | null;
  council_member_ambiguous: boolean;
}
interface WordAnn { normalized_form: string | null }
interface TextlineAnn { xml_file: string; page_class: string }
interface AppAnn { description: string }

function kontrolliVahemik(v: Vahemik, pikkus: number, mis: string, id: string) {
  if (!(v[0] >= 0 && v[1] <= pikkus && v[0] <= v[1])) {
    throw new Error(`${id}: ${mis} vahemik [${v[0]},${v[1]}) on tekstist (${pikkus}) väljas`);
  }
}

export function tootleProtokoll(fail: KorpuseFail, ctx: TootluseKontekst): TootluseTulemus {
  const { id } = ctx;
  const tekst = fail.text;
  const pikkus = tekst.length;
  const hoiatused: string[] = [];

  if (/[\uD800-\uDFFF]/.test(tekst)) {
    throw new Error(`${id}: tekst sisaldab BMP-väliseid märke — Pythoni ja JS märgikohad ei klapiks`);
  }

  // --- päevakorrapunktid + pealkirjad (paaristatakse sisalduvuse järgi, numbrid kontrollitakse) ---
  const punktSpanid = kiht<AgendaAnn>(fail, "agenda_points").spans
    .map((s) => ({ v: vahemik(s.base_span), nr: s.annotations[0].number }))
    .sort((a, b) => a.v[0] - b.v[0]);
  const pealkirjad = kiht<AgendaAnn>(fail, "agenda_point_titles").spans
    .map((s) => ({ v: vahemik(s.base_span), nr: s.annotations[0].number }))
    .sort((a, b) => a.v[0] - b.v[0]);
  if (punktSpanid.length !== pealkirjad.length) {
    throw new Error(`${id}: agenda_points (${punktSpanid.length}) ja agenda_point_titles (${pealkirjad.length}) arv erineb`);
  }
  const paevakord: Paevakorrapunkt[] = [];
  punktSpanid.forEach((p, i) => {
    kontrolliVahemik(p.v, pikkus, `päevakorrapunkt ${p.nr}`, id);
    if (i > 0 && p.v[0] < punktSpanid[i - 1].v[1]) {
      throw new Error(`${id}: päevakorrapunktid ${punktSpanid[i - 1].nr} ja ${p.nr} kattuvad`);
    }
    if (i > 0 && p.v[0] > punktSpanid[i - 1].v[1]) {
      hoiatused.push(`${id}: päevakorrapunktide ${punktSpanid[i - 1].nr} ja ${p.nr} vahel on ${p.v[0] - punktSpanid[i - 1].v[1]} märki`);
    }
    const t = pealkirjad[i];
    if (!(p.v[0] <= t.v[0] && t.v[1] <= p.v[1])) {
      throw new Error(`${id}: pealkiri nr ${t.nr} ei ole punkti nr ${p.nr} sees`);
    }
    if (t.nr !== p.nr) throw new Error(`${id}: pealkirja number ${t.nr} ≠ punkti number ${p.nr}`);
    paevakord.push({ nr: p.nr, jrk: i + 1, algus: p.v[0], lopp: p.v[1], pealkiri: t.v });
  });
  const numbrid = new Map<number, number>();
  for (const p of paevakord) numbrid.set(p.nr, (numbrid.get(p.nr) ?? 0) + 1);
  const korduvad_numbrid = [...numbrid.entries()].filter(([, n]) => n > 1).map(([nr]) => nr);
  if (korduvad_numbrid.length) {
    hoiatused.push(`${id} (${ctx.fail}): päevakorrapunktide numbrid korduvad: ${korduvad_numbrid.join(", ")} — #p<nr> ei ole üheselt määratud`);
  }

  // --- lisad, tabelid, laused ---
  const lisad: Lisa[] = kiht<AppAnn>(fail, "appendix_regions").spans.map((s) => {
    const v = vahemik(s.base_span);
    kontrolliVahemik(v, pikkus, "lisa", id);
    return { algus: v[0], lopp: v[1], kirjeldus: s.annotations[0].description ?? "" };
  });
  const viimanePunktLopp = paevakord.length ? paevakord[paevakord.length - 1].lopp : 0;
  for (const l of lisad) {
    if (l.algus < viimanePunktLopp) hoiatused.push(`${id}: lisa "${l.kirjeldus}" algab enne viimase päevakorrapunkti lõppu`);
  }
  const tabelid: Vahemik[] = kiht(fail, "table_regions").spans.map((s) => {
    const v = vahemik(s.base_span);
    kontrolliVahemik(v, pikkus, "tabel", id);
    return v;
  });
  const laused: Vahemik[] = kiht(fail, "sentences").spans.map((s) => {
    const v = vahemik(s.base_span);
    kontrolliVahemik(v, pikkus, "lause", id);
    return v;
  });

  // --- olemid (SD-02) ---
  let palju_kandidaate = 0;
  const olemid: Olem[] = kiht<NeAnn>(fail, "named_entities").spans.map((s) => {
    const v = vahemik(s.base_span);
    kontrolliVahemik(v, pikkus, "olem", id);
    const a = s.annotations[0];
    if (!OLEMI_TYYBID.includes(a.tag as OlemiTyyp)) throw new Error(`${id}: tundmatu olemitüüp ${a.tag}`);
    const sid = parsiCouncilMemberId(a.council_member_id, a.tag, a.council_member_match_status, ctx.tuntudIsikud);
    if (a.tag === "PER" && sid.kindlus === "puudub" && (a.council_member_id ?? "").split(";").filter((x) => /^\d+$/.test(x)).length >= 4) {
      palju_kandidaate++;
    }
    return { a: v[0], l: v[1], t: a.tag as OlemiTyyp, ...sid };
  });
  // olemid üle punktipiiri (informatiivne)
  const piirid = paevakord.map((p) => p.algus).concat(paevakord.length ? [viimanePunktLopp] : []);
  const piiriIndeks = (pos: number) => {
    let n = 0;
    for (const b of piirid) if (b <= pos) n++;
    return n;
  };
  let olemeid_yle_punktipiiri = 0;
  for (const o of olemid) if (piiriIndeks(o.a) !== piiriIndeks(o.l - 1)) olemeid_yle_punktipiiri++;

  // --- kõned (SD-03) ---
  let koned_ilma_olemita = 0;
  const koned: Kone[] = (relKiht(fail, "speeches")?.relations ?? []).map((r) => {
    const sp = r.named_spans.speaker;
    const koneleja: Vahemik = [sp[0][0], sp[sp.length - 1][1]];
    kontrolliVahemik(koneleja, pikkus, "kõneleja", id);
    const tykid: Vahemik[] = r.named_spans.speech.map((t) => {
      kontrolliVahemik(t, pikkus, "kõne", id);
      return [t[0], t[1]];
    });
    const sid = seoKoneleja(koneleja, olemid);
    const nimi = r.annotations[0]?.speaker_name ?? tekst.slice(koneleja[0], koneleja[1]);
    if (sid.kindlus === "puudub" && !olemid.some((o) => o.t === "PER" && o.a < koneleja[1] && koneleja[0] < o.l)) {
      koned_ilma_olemita++;
    }
    return { koneleja, nimi, tykid, ...sid };
  });

  // --- normid + sõnade arv ---
  const sonad = kiht<WordAnn>(fail, "words").spans;
  let sonu = 0;
  const toorNormid: [number, number, string][] = [];
  for (const s of sonad) {
    const v = vahemik(s.base_span);
    if (onSona(tekst.slice(v[0], v[1]))) sonu++;
    const nf = s.annotations[0].normalized_form;
    if (nf !== null && nf !== undefined) toorNormid.push([v[0], v[1], nf]);
  }
  const normid = erinevadNormid(tekst, toorNormid);

  // --- lehed (ET-09) ---
  const tl = kiht<TextlineAnn>(fail, "textline_info").spans.map((s) => ({
    xml_file: s.annotations[0].xml_file,
    page_class: s.annotations[0].page_class,
    vahemik: vahemik(s.base_span),
  }));
  const xmlV = xmlVahemikud(tl);
  if (ctx.leheRead.length === 0) throw new Error(`${id}: protokolli_lehed.csv-s pole faili ${ctx.fail} ridu`);
  const lehedT = seoLehed(ctx.leheRead, xmlV, loendLehed(tl));
  hoiatused.push(...lehedT.hoiatused);
  const lehed = lehedT.lehed;
  const arhiiviviide = lehed[0].arhiiviviide;
  for (const l of lehed) {
    if (l.arhiiviviide !== arhiiviviide) hoiatused.push(`${id}: lehel ${l.lk} on teine arhiiviviide (${l.arhiiviviide} vs ${arhiiviviide})`);
  }
  for (const x of xmlV.keys()) {
    const s = sailikXmlist(x);
    if (s && s !== arhiiviviide) {
      hoiatused.push(`${id}: xml_file ${x} säilik (${s}) ≠ CSV arhiiviviide (${arhiiviviide})`);
      break;
    }
  }
  const urlLk = transkribusLehenumber(fail.meta.transcribus_url);
  if (urlLk === null) throw new Error(`${id}: meta.transcribus_url ei lõpe /pages/<n>: ${fail.meta.transcribus_url}`);
  if (lehed[0].transkribus_lk !== urlLk) {
    throw new Error(`${id}: esimese lehe transkribus_lk (${lehed[0].transkribus_lk}) ≠ meta.transcribus_url lõpp (${urlLk})`);
  }

  // --- plokid ---
  const { sissejuhatus, lopuosa } = sissejuhatusJaLopuosa(pikkus, paevakord, lisad);

  const seotud = new Set<number>();
  for (const o of olemid) if (o.t === "PER" && o.isik_id !== null) seotud.add(o.isik_id);
  const olemeid_PER = olemid.filter((o) => o.t === "PER").length;

  const andmed: ProtokollAndmed = {
    id,
    fail: ctx.fail,
    kuupaevad: fail.meta.meeting_dates,
    transkribus_url: fail.meta.transcribus_url,
    arhiiviviide,
    tekst,
    sissejuhatus,
    paevakord,
    lopuosa,
    lisad,
    tabelid,
    laused,
    olemid,
    koned,
    normid,
    lehed,
    statistika: {
      sonu,
      lauseid: laused.length,
      paevakorrapunkte: paevakord.length,
      olemeid: olemid.length,
      olemeid_PER,
      seotud_isikuid: seotud.size,
      konesid: koned.length,
      lehekylgi: lehed.length,
      lehekylgi_tekstita: lehed.filter((l) => l.tekstita).length,
      lisasid: lisad.length,
      tabeleid: tabelid.length,
      tekst_kb: Math.round((new TextEncoder().encode(tekst).length / 1024) * 10) / 10,
    },
  };
  return { andmed, hoiatused, palju_kandidaate, olemeid_yle_punktipiiri, koned_ilma_olemita, korduvad_numbrid };
}

/** Sõnade arv vahemikus (päevakorrapunkti `sonu`, ET-07). */
export function sonuVahemikus(fail: KorpuseFail, v: Vahemik): number {
  let n = 0;
  for (const s of kiht(fail, "words").spans) {
    const w = vahemik(s.base_span);
    if (w[0] >= v[0] && w[1] <= v[1] && onSona(fail.text.slice(w[0], w[1]))) n++;
  }
  return n;
}
