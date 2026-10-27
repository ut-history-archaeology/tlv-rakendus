import { describe, expect, it } from "vitest";
import { aktiivneLeht, leiaLeht, naaberLeht, pildiUrl, sailikXmlist, samaPildiLehed, seoLehed, transkribusLeheUrl, xmlVahemikud, type LeheRida } from "./lehed";

const rida = (jrk: number, lehekulg: string, xml_file: string, pilt: string, transkribus_lk: number, tekstita = false): LeheRida =>
  ({ protokoll: "1934-04-30.json", jrk, arhiiviviide: "ERA.2966.2.83", lehekulg, xml_file, pilt, transkribus_lk, tekstita });

describe("TE-16 lehtede sidumine (ET-09)", () => {
  const xml = new Map<string, [number, number]>([
    ["a.xml", [0, 100]], ["b.xml", [101, 200]], ["c1.xml", [201, 250]], ["c2.xml", [251, 280]], ["c3.xml", [281, 300]],
  ]);
  it("õige jrk järjekord, tekstita leht omal kohal null-vahemikuga, jagatud lehed", () => {
    const { lehed, hoiatused } = seoLehed(
      [
        rida(3, "134", "c1.xml", "1934/0083_134.png", 134),
        rida(1, "132", "a.xml", "1934/0083_132.png", 132),
        rida(2, "133", "", "1934/0083_133.png", 133, true),
        rida(4, "134a", "c2.xml", "1934/0083_134.png", 134),
        rida(5, "134b", "c3.xml", "1934/0083_134.png", 134),
      ],
      new Map([...xml].filter(([k]) => k !== "b.xml"))
    );
    expect(lehed.map((l) => l.lk)).toEqual(["132", "133", "134", "134a", "134b"]);
    expect(lehed[1]).toMatchObject({ tekstita: true, algus: null, lopp: null, jagatud: false });
    expect(lehed[0]).toMatchObject({ algus: 0, lopp: 100, jagatud: false });
    expect(lehed[2]).toMatchObject({ algus: 201, lopp: 250, jagatud: true });
    expect(lehed[3]).toMatchObject({ algus: 251, lopp: 280, jagatud: true });
    expect(lehed[4].jagatud).toBe(true);
    expect(hoiatused.some((h) => h.includes("tekstita leht lk 133"))).toBe(true);
    expect(hoiatused.some((h) => h.includes("jagatud leht lk 134"))).toBe(true);
  });
  it("korpuse xml_file, mida CSV-s pole → viga", () => {
    expect(() => seoLehed([rida(1, "1", "a.xml", "p.png", 1)], xml)).toThrow(/b.xml puudub protokolli_lehed.csv/);
  });
  it("CSV xml_file, mida korpuses pole → viga", () => {
    expect(() => seoLehed([rida(1, "1", "zzz.xml", "p.png", 1)], new Map())).toThrow(/zzz.xml puudub korpuses/);
  });
  it("jrk lünk → viga", () => {
    expect(() => seoLehed([rida(1, "1", "a.xml", "p.png", 1), rida(3, "2", "b.xml", "q.png", 2)], xml)).toThrow(/jrk ei ole pidev/);
  });
  it("kattuvad vahemikud → viga", () => {
    const halb = new Map<string, [number, number]>([["a.xml", [0, 150]], ["b.xml", [101, 200]]]);
    expect(() => seoLehed([rida(1, "1", "a.xml", "p.png", 1), rida(2, "2", "b.xml", "q.png", 2)], halb)).toThrow(/kattub/);
  });
  it("xmlVahemikud: ridade min/max xml_file kaupa", () => {
    const m = xmlVahemikud([
      { xml_file: "a", vahemik: [0, 10] }, { xml_file: "a", vahemik: [11, 20] }, { xml_file: "b", vahemik: [21, 30] },
    ]);
    expect(m.get("a")).toEqual([0, 20]);
    expect(m.get("b")).toEqual([21, 30]);
  });
});

describe("TE-17 Transkribuse ja pildi URL (ET-05)", () => {
  const dok = "https://rahvusarhiiv.transkribus.eu/document/3016346/pages/26";
  it("lõpunumber asendatakse transkribus_lk-ga; arhiivi lk ei satu URL-i", () => {
    expect(transkribusLeheUrl(dok, 31)).toBe("https://rahvusarhiiv.transkribus.eu/document/3016346/pages/31");
    expect(transkribusLeheUrl(dok, 26)).toBe(dok);
    expect(transkribusLeheUrl(dok, 31)).not.toContain("/pages/112");
  });
  it("134a → …/pages/134 (transkribus_lk on sama kui 134-l)", () => {
    expect(transkribusLeheUrl("https://x/document/1/pages/5", 134)).toBe("https://x/document/1/pages/134");
  });
  it("vale URL → viga", () => expect(() => transkribusLeheUrl("https://x/doc/1", 3)).toThrow());
  it("pildi URL = basePath + /pildid/<suurus>/ + pilt", () => {
    expect(pildiUrl("/tlv-rakendus", 1200, "1918/0057_112.png")).toBe("/tlv-rakendus/pildid/1200/1918/0057_112.png");
    expect(pildiUrl("", 300, "1918/0057_112.png")).toBe("/pildid/300/1918/0057_112.png");
  });
  it("säilik xml_file nimest", () => {
    expect(sailikXmlist("era2966_002_0000074_00339_t.xml")).toBe("ERA.2966.2.74");
    expect(sailikXmlist("era2966_002_0000064a_00001_t.xml")).toBe("ERA.2966.2.64a");
    expect(sailikXmlist("era2966_009_0000008_00424_t.xml")).toBe("ERA.2966.9.8");
    expect(sailikXmlist("muu.xml")).toBeNull();
  });
});

describe("TE-18 aktiivse lehe määramine (PT-05)", () => {
  const L = (jrk: number, lk: string, algus: number | null, lopp: number | null) =>
    ({ jrk, lk, arhiiviviide: "ERA.2966.2.57", algus, lopp, pilt: `p${lk}.png`, transkribus_lk: jrk, tekstita: algus === null, jagatud: false, loend: false });
  const lehed = [L(1, "10", 0, 100), L(2, "11", 100, 200), L(3, "12", null, null), L(4, "13", 200, 300)];

  it("kerimiskoht enne esimest markerit → 1. leht", () => {
    expect(aktiivneLeht(lehed, [{ lk: "10", offset: 500 }, { lk: "11", offset: 900 }], 300)).toBe("10");
  });
  it("markerite vahel → viimane ülalpool", () => {
    expect(aktiivneLeht(lehed, [{ lk: "10", offset: -800 }, { lk: "11", offset: -100 }, { lk: "13", offset: 600 }], 300)).toBe("11");
  });
  it("ainult nähtavad markerid loevad (kokkuklapitud punkti marker puudub loendist)", () => {
    expect(aktiivneLeht(lehed, [{ lk: "10", offset: -800 }, { lk: "13", offset: 600 }], 300)).toBe("10");
  });
  it("tekstita leht ei saa kerimisest aktiivseks", () => {
    expect(aktiivneLeht(lehed, [{ lk: "11", offset: -200 }, { lk: "12", offset: -50 }], 300)).toBe("11");
  });
  it("?lk= kehtetu väärtus → null; kehtiv → leht", () => {
    expect(leiaLeht(lehed, "99")).toBeNull();
    expect(leiaLeht(lehed, "")).toBeNull();
    expect(leiaLeht(lehed, "12")?.tekstita).toBe(true);
  });
  it("naaberleht servades null", () => {
    expect(naaberLeht(lehed, "10", -1)).toBeNull();
    expect(naaberLeht(lehed, "13", 1)).toBeNull();
    expect(naaberLeht(lehed, "11", 1)?.lk).toBe("12");
  });
  it("jagatud lehe teised lk-d", () => {
    const j = [L(1, "134", 0, 10), L(2, "134a", 10, 20), L(3, "134b", 20, 30)].map((l) => ({ ...l, pilt: "x.png", jagatud: true }));
    expect(samaPildiLehed(j, j[1])).toEqual(["134", "134b"]);
  });
});
