import { describe, expect, it } from "vitest";
import { normalizeOtsing } from "../format";
import {
  OLEMI_BITID, ehitaOtsinguKirje, kontekstiVahemik, lauseIndeks, lauseteTyybid, leiaKohad,
  normaliseeriParing, normaliseeriTekst, onKehtivParing, paevakorraNr, tabamusedProtokollis, vajalikudAastad,
} from "./otsing";
import type { Olem, OtsinguProtokoll, ProtokollAndmed } from "./types";

describe("TE-08 otsing", () => {
  it("normalizeOtsing: Walimine == valimine; diakriitika", () => {
    expect(normalizeOtsing("Walimine")).toBe(normalizeOtsing("valimine"));
    expect(normalizeOtsing("hääletamine")).toBe(normalizeOtsing("haaletamine"));
    expect(normaliseeriParing(" Walimine ")).toBe("valimine");
  });
  it("normaliseeriTekst säilitab pikkuse ja ühtib päringu normaliseeringuga", () => {
    const s = "Tartu Linnawolikogu HÄÄLETAMINE šokolaad Õ Ä Ö Ü ž";
    expect(normaliseeriTekst(s)).toHaveLength(s.length);
    expect(normaliseeriTekst(s)).toBe(normalizeOtsing(s));
    expect(normaliseeriTekst(s).indexOf("haaletamine")).toBe(s.indexOf("HÄÄLETAMINE"));
  });
  it("lauseIndeks binaarotsinguga; lausete vahel → eelmine; enne esimest → -1", () => {
    const laused: [number, number][] = [[0, 10], [11, 20], [21, 30]];
    expect(lauseIndeks(laused, 0)).toBe(0);
    expect(lauseIndeks(laused, 9)).toBe(0);
    expect(lauseIndeks(laused, 10)).toBe(0);
    expect(lauseIndeks(laused, 11)).toBe(1);
    expect(lauseIndeks(laused, 29)).toBe(2);
    expect(lauseIndeks(laused, 100)).toBe(2);
    expect(lauseIndeks([[5, 10]], 2)).toBe(-1);
  });
  it("kontekst ±1 teksti alguses ja lõpus", () => {
    const laused: [number, number][] = [[0, 10], [11, 20], [21, 30]];
    expect(kontekstiVahemik(laused, 0, 1)).toEqual([0, 20]);
    expect(kontekstiVahemik(laused, 2, 1)).toEqual([11, 30]);
    expect(kontekstiVahemik(laused, 1, 1)).toEqual([0, 30]);
    expect(kontekstiVahemik(laused, 1, 0)).toEqual([11, 20]);
  });
  it("laused_tyybid bitmask", () => {
    const o = (a: number, l: number, t: Olem["t"]): Olem => ({ a, l, t, isik_id: null, kandidaadid: [], kindlus: t === "PER" ? "puudub" : null });
    const mask = lauseteTyybid([[0, 10], [11, 20], [21, 30]], [o(2, 5, "PER"), o(8, 13, "MONEY"), o(25, 28, "ORG"), o(26, 27, "LOC")]);
    expect(mask[0]).toBe(OLEMI_BITID.PER | OLEMI_BITID.MONEY);
    expect(mask[1]).toBe(OLEMI_BITID.MONEY);
    expect(mask[2]).toBe(OLEMI_BITID.ORG | OLEMI_BITID.LOC);
  });
  it("min 3 märki", () => {
    expect(onKehtivParing("ab")).toBe(false);
    expect(onKehtivParing(" ab ")).toBe(false);
    expect(onKehtivParing("abc")).toBe(true);
  });
  it("leiaKohad leiab kõik, ka kattuvad", () => {
    expect(leiaKohad("aaa", "aa")).toEqual([0, 1]);
    expect(leiaKohad("x", "")).toEqual([]);
  });
  it("vajalikudAastad vahemiku järgi", () => {
    const killud = [1918, 1919, 1930, 1937, 1941];
    expect(vajalikudAastad(killud, "1930-01-01", "1930-12-31")).toEqual([1930]);
    expect(vajalikudAastad(killud, "1940-08-01")).toEqual([1941]);
    expect(vajalikudAastad(killud, undefined, "1919-06-01")).toEqual([1918, 1919]);
  });

  const protokoll: OtsinguProtokoll = {
    id: "K1", kuupaev: "1920-01-01", kuupaev_lopp: "",
    tekst_norm: "esimene lause valimine. teine lause. kolmas valimine siin.",
    laused: [[0, 24], [25, 37], [38, 59]],
    laused_tyybid: [1, 0, 2],
    paevakord: [[1, 25, 59]],
    algkuju_kaardistus: [0, 30, 45],
  };
  it("tabamused protokollis: lause, punkt, algkuju koht", () => {
    const t = tabamusedProtokollis(protokoll, "valimine");
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ koht: 14, lause: 0, punkt: null, algkuju_koht: 0, tyybid: 1 });
    expect(t[1]).toMatchObject({ lause: 2, punkt: 1, algkuju_koht: 45 });
    expect(paevakorraNr(protokoll.paevakord, 0)).toBeNull();
  });
  it("tüübifilter piirab tabamused; tühja päringuga = sobivad laused", () => {
    expect(tabamusedProtokollis(protokoll, "valimine", OLEMI_BITID.ORG)).toHaveLength(1);
    expect(tabamusedProtokollis(protokoll, "", OLEMI_BITID.PER | OLEMI_BITID.ORG)).toHaveLength(2);
    expect(tabamusedProtokollis(protokoll, "", 0)).toHaveLength(0);
  });
  it("ehitaOtsinguKirje: normid rakendatud, lausepiirid nihutatud, kaardistus algsesse teksti", () => {
    const tekst = "Tartu linnawolikogu koosolek.\nWalimine toimus.";
    const p = {
      id: "K1", tekst, laused: [[0, 29], [30, 46]],
      normid: [[6, 19, "linnavolikogu"], [30, 38, "Valimine!!"]], // teine pikem 2 märki
      paevakord: [{ nr: 1, jrk: 1, algus: 30, lopp: 46, pealkiri: [30, 38] }],
      olemid: [],
    } as unknown as ProtokollAndmed;
    const k = ehitaOtsinguKirje(p, { kuupaev: "1920-01-01", kuupaev_lopp: "" });
    expect(k.tekst_norm).toBe("tartu linnavolikogu koosolek.\nvalimine!! toimus.");
    expect(k.laused).toEqual([[0, 29], [30, 48]]);
    expect(k.paevakord).toEqual([[1, 30, 48]]);
    expect(k.algkuju_kaardistus).toEqual([0, 30]);
    // "walimine" ja "valimine" leiavad sama koha
    expect(leiaKohad(k.tekst_norm, normaliseeriParing("Walimine"))).toEqual(leiaKohad(k.tekst_norm, normaliseeriParing("valimine")));
  });
});
