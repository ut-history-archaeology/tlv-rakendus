import { describe, expect, it } from "vitest";
import { loeAndmestik } from "./data";
import {
  isikuRead, koosseisuNimekirjaJaotus, koosseisuNimekirjad, peamineNimekiri,
} from "./derive";

/** NK-01…NK-03 tegelike andmetega (data/*.csv). */
describe("kanoonilised nimekirjad (NK-01…NK-03)", () => {
  const a = loeAndmestik();

  it("NK-01: 35 kanoonilist, 78 ametlikku nimekirja; viited kehtivad", () => {
    expect(a.nimekirjad).toHaveLength(35);
    expect(a.valimisnimekirjad).toHaveLength(78);
    const idd = new Set(a.nimekirjad.map((n) => n.nimekiri_id));
    for (const v of a.valimised) if (v.nimekiri_id !== null) expect(idd.has(v.nimekiri_id)).toBe(true);
    // ainus ilma kanoonilise vasteta ametlik nimekiri: 1917 nr 3 "Tagasi võetud"
    expect(a.valimisnimekirjad.filter((n) => n.nimekiri_id === null).map((n) => `${n.aasta} ${n.nr}`))
      .toEqual(["1917 3"]);
  });

  it("NK-01: igal toorkujuga valimisreal on kanooniline id; 1939 tühi", () => {
    expect(a.valimised.filter((v) => v.nimekiri_nimi.trim() && v.nimekiri_id === null)).toEqual([]);
    expect(a.valimised.filter((v) => v.aasta === 1939 && v.nimekiri_id !== null)).toEqual([]);
  });

  it("NK-02: ajutised vasted märgitud (Tamm 1923 → 20; Kase, Unt 1926 → 24)", () => {
    const k = a.valimised.filter((v) => v.nimekiri_kontrollida)
      .map((v) => [v.aasta, v.isik_id, v.nimekiri_id]);
    expect(k).toEqual(expect.arrayContaining([[1923, 362, 20], [1926, 49, 24], [1926, 183, 24]]));
    expect(k).toHaveLength(3);
  });

  it("NK-03: 1926–1929 rahvaerakonna toorkujud on filtris üks valik", () => {
    const read = isikuRead(a).filter((r) => r.koosseisud.includes("1927-1929"));
    const rahva = read.filter((r) => r.peamine_nimekiri === "Rahvaerakond");
    expect(new Set(rahva.map((r) => r.peamine_nimekiri_id))).toEqual(new Set([7]));
    expect(new Set(rahva.map((r) => r.peamine_nimekiri_toor)).size).toBeGreaterThan(1);
  });

  it("NK-03: 1929 jaotuses üks \"Majaomanikud, haridus- ja majandustegelased\" (3 613 häält), Rütli ja Tamman selle all", () => {
    const j = koosseisuNimekirjaJaotus(a, "1930-1934");
    const maja = j.filter((s) => s.nimi === "Majaomanikud, haridus- ja majandustegelased");
    expect(maja).toHaveLength(1);
    expect(maja[0].haaled).toBe(3613);
    expect(maja[0].isikud).toContain(148); // Rütli
    const tamman = a.valimised.find((v) => v.aasta === 1929 && v.roll === "valitud" && v.perenimi.startsWith("Tamman"));
    expect(tamman && maja[0].isikud).toContain(tamman!.isik_id);
  });

  it("NK-03: nimekirjade tabel — 1929 alamnimekirjad kõrvuti, valituid ühine", () => {
    const t = koosseisuNimekirjad(a, "1930-1934");
    expect(t).toHaveLength(16);
    const i = t.findIndex((r) => r.nimekiri_id === 26);
    expect(t[i].ryhm).toBe(3);
    expect(t.slice(i + 1, i + 3).map((r) => r.ryhm)).toEqual([0, 0]);
    expect(t.slice(i, i + 3).reduce((s, r) => s + (r.haaled ?? 0), 0)).toBe(3613);
    expect(t.reduce((s, r) => s + (r.ryhm ? r.valituid ?? 0 : 0), 0)).toBe(55);
  });

  it("NK-03: 1919 valimistulemustes nimekirju pole → valituid null, jaotus tühi", () => {
    expect(koosseisuNimekirjaJaotus(a, "1919-1921")).toEqual([]);
    const t = koosseisuNimekirjad(a, "1919-1921");
    expect(t.map((r) => r.nr)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(t.every((r) => r.valituid === null)).toBe(true);
  });

  it("peamine nimekiri eelistab valitud-ridu ja kannab toorkujud", () => {
    const p = peamineNimekiri(a, 148);
    expect(typeof p?.id).toBe("number");
    expect(p!.toor.length).toBeGreaterThan(0);
  });
});
