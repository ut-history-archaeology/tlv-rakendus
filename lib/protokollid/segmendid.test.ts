import { describe, expect, it } from "vitest";
import { segmendid, segmentideTekst } from "./segmendid";
import type { Kone, Olem } from "./types";

const olem = (a: number, l: number, t: Olem["t"] = "PER", isik_id: number | null = 1): Olem =>
  ({ a, l, t, isik_id, kandidaadid: isik_id ? [isik_id] : [], kindlus: t === "PER" ? "kõrge" : null });
const kone = (koneleja: [number, number], tykid: [number, number][], nimi = "Olesk"): Kone =>
  ({ koneleja, nimi, tykid, isik_id: 1, kandidaadid: [1], kindlus: "kõrge" });

describe("TE-05 segmentrenderdaja", () => {
  //            0         1         2         3         4         5
  //            012345678901234567890123456789012345678901234567890123
  const tekst = "Juhataja Olesk: Ma arvan nii. (Piip: Ei!) Ja veel nii. Lõpp.";
  const k = kone([9, 14], [[16, 29], [42, 54]]);
  const olemid = [olem(9, 14), olem(31, 35, "PER", 2), olem(0, 8, "POSITION", null)];

  it("segmentide tekst kokku == algtekst", () => {
    const s = segmendid(tekst, [0, tekst.length], olemid, [k]);
    expect(segmentideTekst(s)).toBe(tekst);
    for (let i = 1; i < s.length; i++) expect(s[i].algus).toBe(s[i - 1].lopp);
  });
  it("olem kõneleja sees → pesastatud; kõnetükid rollidega; vahelehüüe = 'vahe'", () => {
    const s = segmendid(tekst, [0, tekst.length], olemid, [k]);
    const koneleja = s.find((x) => x.tekst === "Olesk")!;
    expect(koneleja.olem?.isik_id).toBe(1);
    expect(koneleja.kone).toEqual({ indeks: 0, roll: "koneleja" });
    expect(s.find((x) => x.tekst === "Ma arvan nii.")?.kone?.roll).toBe("kone");
    expect(s.find((x) => x.tekst === "Ja veel nii.")?.kone?.roll).toBe("kone");
    const piip = s.find((x) => x.tekst === "Piip")!;
    expect(piip.kone?.roll).toBe("vahe");
    expect(piip.olem?.isik_id).toBe(2);
    expect(s.find((x) => x.tekst === ": ")?.kone?.roll).toBe("vahe");
    expect(s.find((x) => x.tekst === " Lõpp.")?.kone).toBeNull();
    expect(s.find((x) => x.tekst === "Juhataja")?.olem?.t).toBe("POSITION");
  });
  it("olem üle kõnetüki piiri tükeldatakse kaheks", () => {
    const t = "A: tere maailm tore";
    const kk = kone([0, 1], [[3, 10]]); // "tere ma|ailm"
    const o = olem(8, 14, "LOC", null); // "maailm" ületab tüki lõpu (10)
    const s = segmendid(t, [0, t.length], [o], [kk]);
    const osad = s.filter((x) => x.olem === o);
    expect(osad.map((x) => x.tekst)).toEqual(["ma", "ailm"]);
    expect(osad[0].kone?.roll).toBe("kone");
    expect(osad[1].kone).toBeNull();
    expect(segmentideTekst(s)).toBe(t);
  });
  it("plokk lõikab üle piiri ulatuva olemi; lisapiirid tükeldavad", () => {
    const t = "0123456789";
    const s = segmendid(t, [2, 8], [olem(0, 5, "ORG", null)], [], [6]);
    expect(segmentideTekst(s)).toBe("234567");
    expect(s[0]).toMatchObject({ algus: 2, lopp: 5 });
    expect(s[0].olem?.t).toBe("ORG");
    expect(s.map((x) => x.lopp)).toEqual([5, 6, 8]);
  });
  it("tühi plokk → tühi loend", () => expect(segmendid("abc", [2, 2], [], [])).toEqual([]));
});
