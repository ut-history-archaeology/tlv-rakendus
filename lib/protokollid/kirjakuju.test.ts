import { describe, expect, it } from "vitest";
import { erinevadNormid, rakendaNormid } from "./kirjakuju";

describe("TE-07 kirjakuju", () => {
  const tekst = "Tartu linnawolikogu koosolek. Lnw. Olesk wõtab sõna.";
  it("identne normalized_form filtreeritakse välja", () => {
    const n = erinevadNormid(tekst, [[0, 5, "Tartu"], [6, 19, "linnavolikogu"], [40, 45, "võtab"]]);
    expect(n).toEqual([[6, 19, "linnavolikogu"], [40, 45, "võtab"]]);
  });
  it("asendused rakenduvad; sama pikkusega asendus ei nihuta", () => {
    const w = tekst.indexOf("wõtab");
    const r = rakendaNormid(tekst, [[6, 19, "linnavolikogu"], [w, w + 5, "võtab"]]);
    expect(r.tekst).toBe("Tartu linnavolikogu koosolek. Lnw. Olesk võtab sõna.");
    expect(r.asendusi).toBe(2);
    const o = tekst.indexOf("Olesk");
    expect(r.teisendaVahemik([o, o + 5])).toEqual([o, o + 5]); // "Olesk" — sama pikkusega asendused ei nihuta
    expect(r.teisenda(tekst.length)).toBe(r.tekst.length);
  });
  it("pikkusevahe nihutab järgnevaid vahemikke õigesti (sünteetiline)", () => {
    const t = "aa bbbb cc dd";
    const r = rakendaNormid(t, [[3, 7, "b"], [8, 10, "cccccc"]]);
    expect(r.tekst).toBe("aa b cccccc dd");
    expect(r.teisendaVahemik([11, 13])).toEqual([12, 14]); // "dd"
    expect(r.tekst.slice(12, 14)).toBe("dd");
    expect(r.teisendaVahemik([8, 10])).toEqual([5, 11]); // "cc" → "cccccc" (eelnev asendus lühendas 3 võrra)
    expect(r.tekst.slice(5, 11)).toBe("cccccc");
    expect(r.teisendaVahemik([3, 7])).toEqual([3, 4]); // "bbbb" → "b"
    // positsioon asendatud sõna sees ei ületa uue kuju lõppu
    expect(r.teisenda(6)).toBe(4); // "bbbb" 4. märk → uue kuju "b" lõpp
    expect(r.teisenda(0)).toBe(0);
  });
  it("olemi vahemik asenduse peal jääb õige sõna peale ka pärast varasemat pikkusemuutust", () => {
    const t = "wolikogu esimees Lui Olesk";
    const r = rakendaNormid(t, [[0, 8, "volikogu!!"]]); // +2
    const olem: [number, number] = [17, 26]; // "Lui Olesk"
    const uus = r.teisendaVahemik(olem);
    expect(r.tekst.slice(uus[0], uus[1])).toBe("Lui Olesk");
  });
  it("kattuvad asendused: hilisem jäetakse vahele; järjestamata sisend sorteeritakse", () => {
    const r = rakendaNormid("ab cd", [[3, 5, "CD"], [0, 2, "AB"], [1, 3, "xx"]]);
    expect(r.tekst).toBe("AB CD");
  });
});
