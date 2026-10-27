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

describe("PT-08 moderniseeri(): kogu protokoll nihutatud vahemikega", () => {
  it("olem ja kõne jäävad õigete sõnade peale ka pikkust muutva asenduse järel", async () => {
    const { moderniseeri } = await import("./kirjakuju");
    const tekst = "Wolikogu juhataja Olesk: tere.";
    //            0123456789012345678901234567890
    const p = {
      id: "K0", fail: "x", kuupaevad: ["1920-01-01"], transkribus_url: "u", arhiiviviide: "a",
      tekst,
      sissejuhatus: [0, tekst.length] as [number, number],
      paevakord: [], lopuosa: null, lisad: [], tabelid: [[25, 30] as [number, number]], laused: [[0, 30] as [number, number]],
      olemid: [{ a: 18, l: 23, t: "PER" as const, isik_id: 116, kandidaadid: [116], kindlus: "kõrge" as const }],
      koned: [{ koneleja: [18, 23] as [number, number], nimi: "Olesk", tykid: [[25, 30] as [number, number]], isik_id: 116, kandidaadid: [116], kindlus: "kõrge" as const }],
      normid: [[0, 8, "Volikogu"], [9, 17, "juhataja-ja"]] as [number, number, string][],
      lehed: [{ jrk: 1, lk: "1", arhiiviviide: "a", algus: 0, lopp: 30, pilt: "x.png", transkribus_lk: 1, tekstita: false, jagatud: false, loend: false }],
      statistika: { sonu: 4, lauseid: 1, paevakorrapunkte: 0, olemeid: 1, olemeid_PER: 1, seotud_isikuid: 1, konesid: 1, lehekylgi: 1, lehekylgi_tekstita: 0, lisasid: 0, tabeleid: 1, tekst_kb: 0 },
    };
    const m = moderniseeri(p);
    expect(m.tekst).toBe("Volikogu juhataja-ja Olesk: tere.");
    expect(m.tekst.slice(m.olemid[0].a, m.olemid[0].l)).toBe("Olesk");
    expect(m.tekst.slice(...m.koned[0].tykid[0])).toBe("tere.");
    expect(m.tekst.slice(...m.tabelid[0])).toBe("tere.");
    expect(m.lehed[0].lopp).toBe(m.tekst.length);
    expect(m.asendusi).toBe(2);
    expect(m.normid).toEqual([]);
  });
});
