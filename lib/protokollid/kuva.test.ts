import { describe, expect, it } from "vitest";
import { kuvaTekst, leheplokid, markeriteKohad, plokiYksused, protokolliPlokid, type KuvaYksus } from "./kuva";
import type { Leht, ProtokollAndmed } from "./types";

const leht = (jrk: number, lk: string, algus: number | null, lopp: number | null, extra: Partial<Leht> = {}): Leht => ({
  jrk, lk, arhiiviviide: "ERA.2966.2.57", algus, lopp, pilt: `1918/0057_${lk}.png`, transkribus_lk: jrk,
  tekstita: algus === null, jagatud: false, loend: false, ...extra,
});

function tekstKokku(y: KuvaYksus[]): string {
  let s = "";
  for (const u of y) {
    if (u.liik === "segment") s += u.segment.tekst;
    else if (u.liik === "kone") for (const o of u.osad) s += tekstKokku(o.yksused);
  }
  return s;
}

//            0         1         2         3         4
//            0123456789012345678901234567890123456789012345
const tekst = "Sissejuhatus.\n1. Punkt.\nOlesk: tere\nkõik. Lõpp";
const p: ProtokollAndmed = {
  id: "K000", fail: "x.json", kuupaevad: ["1918-01-01"], transkribus_url: "u", arhiiviviide: "ERA.2966.2.57",
  tekst,
  sissejuhatus: [0, 14],
  paevakord: [{ nr: 1, jrk: 1, algus: 14, lopp: 40, pealkiri: [14, 23] }],
  lopuosa: [40, tekst.length],
  lisad: [], tabelid: [[35, 40]], laused: [],
  olemid: [{ a: 24, l: 29, t: "PER", isik_id: 116, kandidaadid: [116], kindlus: "kõrge" }],
  koned: [{ koneleja: [24, 29], nimi: "Olesk", tykid: [[31, 40]], isik_id: 116, kandidaadid: [116], kindlus: "kõrge" }],
  normid: [],
  lehed: [leht(1, "1", 0, 24), leht(2, "2", null, null), leht(3, "3", 24, tekst.length)],
  statistika: { sonu: 0, lauseid: 0, paevakorrapunkte: 1, olemeid: 1, olemeid_PER: 1, seotud_isikuid: 1, konesid: 1, lehekylgi: 3, lehekylgi_tekstita: 1, lisasid: 0, tabeleid: 1, tekst_kb: 0 },
};

describe("kuva: tekstivaate mudel", () => {
  it("markerite kohad: tekstiga leht algusesse, tekstita eelmise lõppu", () => {
    expect(markeriteKohad(p.lehed).map((m) => m.koht)).toEqual([0, 24, 24]);
  });
  it("plokkide üksuste tekst kokku == ploki tekst; markerid õiges plokis", () => {
    const pl = protokolliPlokid(p);
    expect(pl.map((b) => b.id)).toEqual(["sissejuhatus", "p1", "lopuosa"]);
    for (const b of pl) expect(tekstKokku(b.yksused)).toBe(tekst.slice(b.plokk.algus, b.plokk.lopp));
    const markerid = pl.flatMap((b) => b.yksused.filter((y) => y.liik === "marker").map((y) => (y.liik === "marker" ? `${b.id}:${y.leht.lk}` : "")));
    expect(markerid).toEqual(["sissejuhatus:1", "p1:2", "p1:3"]);
  });
  it("kõne grupeeritakse osadeks (kõneleja / vahe / kõne) ja tabeli segment säilitab reavahetused", () => {
    const y = plokiYksused(p, { liik: "punkt", algus: 14, lopp: 40, nr: 1, jrk: 1, pealkiri: [14, 23] }, false);
    const kone = y.find((u) => u.liik === "kone");
    expect(kone && kone.liik === "kone" ? kone.osad.map((o) => o.roll) : []).toEqual(["koneleja", "vahe", "kone"]);
    const sailitatud = y.flatMap((u) => (u.liik === "kone" ? u.osad.flatMap((o) => o.yksused) : [u]))
      .filter((u) => u.liik === "segment" && u.sailita);
    expect(sailitatud.map((u) => (u.liik === "segment" ? u.segment.tekst : ""))).toEqual(["\nkõik"]);
  });
  it("kõne teise kõne sees (vahelehüüe) pesastatakse välimise kõne vahe-ossa", () => {
    //            0         1         2         3         4
    //            0123456789012345678901234567890123456789012345678
    const t = "A: tere (B: oi!) ja nägemist. Lõpp";
    const pp: ProtokollAndmed = {
      ...p, tekst: t, paevakord: [], lopuosa: null, tabelid: [], olemid: [],
      lehed: [leht(1, "1", 0, t.length)],
      koned: [
        { koneleja: [0, 1], nimi: "A", tykid: [[3, 7], [17, 29]], isik_id: null, kandidaadid: [], kindlus: "puudub" },
        { koneleja: [9, 10], nimi: "B", tykid: [[12, 15]], isik_id: null, kandidaadid: [], kindlus: "puudub" },
      ],
    };
    const y = plokiYksused(pp, { liik: "tekst", algus: 0, lopp: t.length }, true);
    expect(tekstKokku(y)).toBe(t);
    const koned = y.filter((u) => u.liik === "kone");
    expect(koned).toHaveLength(1);
    const a = koned[0] as Extract<KuvaYksus, { liik: "kone" }>;
    expect(a.indeks).toBe(0);
    expect(a.osad.map((o) => o.roll)).toEqual(["koneleja", "vahe", "kone", "vahe", "kone"]);
    const vahe = a.osad[3].yksused;
    const sisemine = vahe.find((u) => u.liik === "kone") as Extract<KuvaYksus, { liik: "kone" }> | undefined;
    expect(sisemine?.indeks).toBe(1);
    expect(sisemine?.osad.map((o) => o.roll)).toEqual(["koneleja", "vahe", "kone"]);
  });
  it("kuvaTekst: reavahetus → tühik, säilitamisel jääb", () => {
    expect(kuvaTekst("a \n b", false)).toBe("a b");
    expect(kuvaTekst("a\nb", true)).toBe("a\nb");
  });
  it("leheplokid: leht → plokk, milles lehe tekst algab; tekstita leht → eelmise lehe plokk", () => {
    const m = leheplokid(p);
    expect(m.get("1")).toBe("sissejuhatus");
    expect(m.get("3")).toBe("p1");
    expect(m.get("2")).toBe("p1");
  });
});
