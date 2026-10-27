import { describe, expect, it } from "vitest";
import { parsiFailinimi, seoFailidKoosolekutega, voordleAlgus, type VasteKoosolek } from "./vasted";

function k(koosolek_id: string, kuupaev: string, kuupaev_lopp = "", algus = ""): VasteKoosolek {
  return { koosolek_id, kuupaev, kuupaev_lopp, protokolli_algus_txt: algus };
}

describe("TE-01 SD-01: protokollifail ↔ koosolek", () => {
  it("parsib failinimed", () => {
    expect(parsiFailinimi("1930-09-08.json")).toEqual({ d1: "1930-09-08", d2: null, teine: false });
    expect(parsiFailinimi("1930-09-08_2.json")).toEqual({ d1: "1930-09-08", d2: null, teine: true });
    expect(parsiFailinimi("1920-02-23_1920-02-24.json")).toEqual({ d1: "1920-02-23", d2: "1920-02-24", teine: false });
    expect(parsiFailinimi("readme.json")).toBeNull();
  });

  it("D.json → ainus rida", () => {
    const t = seoFailidKoosolekutega(["1921-03-01.json"], [k("K040", "1921-03-01")]);
    expect(t.vasted.get("1921-03-01.json")).toBe("K040");
    expect(t.hoiatused).toEqual([]);
  });

  it("kaks rida samal päeval: sufiksita → väiksem ID, _2 → suurem", () => {
    const t = seoFailidKoosolekutega(
      ["1930-09-08_2.json", "1930-09-08.json"],
      [k("K175", "1930-09-08"), k("K174", "1930-09-08")]
    );
    expect(t.vasted.get("1930-09-08.json")).toBe("K174");
    expect(t.vasted.get("1930-09-08_2.json")).toBe("K175");
  });

  it("D1_D2.json: kuupaev_lopp erinevus annab hoiatuse ja märkuse, mitte vea", () => {
    const t = seoFailidKoosolekutega(
      ["1920-02-29_1920-03-30.json"],
      [k("K026", "1920-02-29", "1920-02-30")]
    );
    expect(t.vasted.get("1920-02-29_1920-03-30.json")).toBe("K026");
    expect(t.hoiatused[0]).toContain("kuupaev_lopp erineb: 1920-02-30 vs 1920-03-30");
    expect(t.markused.get("1920-02-29_1920-03-30.json")).toEqual(["kuupaev_lopp erineb: 1920-02-30 vs 1920-03-30"]);
  });

  it("D1_D2.json ilma erinevuseta: hoiatust pole", () => {
    const t = seoFailidKoosolekutega(["1920-02-23_1920-02-24.json"], [k("K025", "1920-02-23", "1920-02-24")]);
    expect(t.hoiatused).toEqual([]);
  });

  it("ülekirjutus võidab automaatreegli; null = teadlikult sidumata", () => {
    const t = seoFailidKoosolekutega(
      ["1925-06-25.json", "1925-06-17.json"],
      [k("K077", "1923-06-25"), k("K105", "1925-06-25"), k("K104", "1925-06-17")],
      { "1925-06-25.json": "K077", "1925-06-17.json": null }
    );
    expect(t.vasted.get("1925-06-25.json")).toBe("K077");
    expect(t.vasted.get("1925-06-17.json")).toBeNull();
    expect(t.markused.get("1925-06-25.json")).toEqual(["käsitsi vaste"]);
  });

  it("kaks faili samale koosolekule → viga", () => {
    expect(() =>
      seoFailidKoosolekutega(["1921-03-01.json", "1921-03-08.json"], [k("K040", "1921-03-01"), k("K041", "1921-03-08")], {
        "1921-03-08.json": "K040",
      })
    ).toThrow(/samale koosolekule K040/);
  });

  it("failinimi ilma CSV-kuupäevata → viga; vale muster → viga", () => {
    expect(() => seoFailidKoosolekutega(["1999-01-01.json"], [k("K001", "1918-01-11")])).toThrow(/ei vasta ükski/);
    expect(() => seoFailidKoosolekutega(["abc.json"], [k("K001", "1918-01-11")])).toThrow(/mustrile/);
    expect(() => seoFailidKoosolekutega(["1918-01-11.json"], [k("K001", "1918-01-11")], { "1918-01-11.json": "K999" })).toThrow(/koosolekut pole/);
  });

  it("teksti alguse võrdlus: paaril hoiatus + märkus, üherealisel ainult loend", () => {
    const algused = new Map([
      ["1930-09-08.json", "Tartu Linnawolikogu erakorraline koosolek"],
      ["1930-09-08_2.json", "Tartu Linnawolikogu korraline koosolek"],
      ["1931-01-26.json", "Tartu Linnavolikogu korraline koosolek"],
    ]);
    const t = seoFailidKoosolekutega(
      ["1930-09-08.json", "1930-09-08_2.json", "1931-01-26.json"],
      [
        k("K174", "1930-09-08", "", "122    Tartu Linnawolikogu erakorraline koosolek"),
        k("K175", "1930-09-08", "", "125    Tartu Linnawolikogu KORRALINE koosolek XX"),
        k("K183", "1931-01-26", "", "garbage Tartu Linnavolikogu korraline koosolek"),
      ],
      {},
      algused
    );
    expect(t.hoiatused.some((h) => h.includes("1930-09-08_2.json") && h.includes("sama päeva paar"))).toBe(true);
    expect(t.hoiatused.some((h) => h.includes("1930-09-08.json →"))).toBe(false);
    expect(t.erinevaAlgusega).toEqual(["1931-01-26.json → K183"]);
    expect(voordleAlgus("122    Tartu  Linna\nwolikogu")).toBe("Tartu Linna wolikogu");
  });
});
