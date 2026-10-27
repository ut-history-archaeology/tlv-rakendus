import { describe, expect, it } from "vitest";
import { plokid, sissejuhatusJaLopuosa } from "./plokid";
import type { Lisa, Paevakorrapunkt } from "./types";

const pk = (nr: number, algus: number, lopp: number): Paevakorrapunkt => ({ nr, jrk: nr, algus, lopp, pealkiri: [algus, algus + 3] });
const lisa = (algus: number, lopp: number, kirjeldus = "Kiri"): Lisa => ({ algus, lopp, kirjeldus });

function katavad(p: ReturnType<typeof plokid>, pikkus: number) {
  let k = 0;
  for (const b of p) {
    expect(b.algus).toBe(k);
    k = b.lopp;
  }
  expect(k).toBe(pikkus);
}

describe("TE-04 plokid", () => {
  it("sissejuhatus + punktid + lõpuosa + lisad katavad teksti ilma kattumiseta", () => {
    const p = plokid(100, [pk(1, 10, 30), pk(2, 30, 60)], [lisa(80, 90), lisa(91, 100, "Teine")]);
    expect(p.map((b) => b.liik)).toEqual(["sissejuhatus", "punkt", "punkt", "lopuosa", "lisa", "lisa"]);
    katavad(p, 100);
    expect(p[3]).toMatchObject({ algus: 60, lopp: 80 });
    expect(p[4]).toMatchObject({ algus: 80, lopp: 91, kirjeldus: "Kiri" }); // vahele jääv märk eelnevasse
  });
  it("ilma punktideta protokoll → üks plokk 'tekst'", () => {
    const p = plokid(50, [], []);
    expect(p).toEqual([{ liik: "tekst", algus: 0, lopp: 50 }]);
    expect(sissejuhatusJaLopuosa(50, [], [])).toEqual({ sissejuhatus: [0, 50], lopuosa: null });
  });
  it("lisa vahetult pärast viimast punkti: lõpuosa puudub", () => {
    const p = plokid(100, [pk(1, 10, 60)], [lisa(60, 100)]);
    expect(p.map((b) => b.liik)).toEqual(["sissejuhatus", "punkt", "lisa"]);
    expect(sissejuhatusJaLopuosa(100, [pk(1, 10, 60)], [lisa(60, 100)]).lopuosa).toBeNull();
  });
  it("tekst pärast viimast lisa jääb viimasesse plokki; pealkiri on punkti sees", () => {
    const p = plokid(100, [pk(1, 10, 60)], [lisa(70, 90)]);
    katavad(p, 100);
    const punkt = p.find((b) => b.liik === "punkt")!;
    expect(punkt.liik === "punkt" && punkt.pealkiri[0] >= punkt.algus && punkt.pealkiri[1] <= punkt.lopp).toBe(true);
  });
  it("punktid alates teksti algusest: sissejuhatus on tühi ja jäetakse välja", () => {
    const p = plokid(20, [pk(1, 0, 20)], []);
    expect(p.map((b) => b.liik)).toEqual(["punkt"]);
    expect(sissejuhatusJaLopuosa(20, [pk(1, 0, 20)], []).sissejuhatus).toEqual([0, 0]);
  });
});
