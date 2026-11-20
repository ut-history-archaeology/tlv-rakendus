import { describe, expect, it } from "vitest";
import { loeAndmestik } from "./data";
import { isikuAastad, isikuRead, karjaariSegmendid } from "./derive";
import { multiSort } from "./useTabeliSeis";
import {
  ISIKUTE_ALIASED, ISIKUTE_EKSPORDI_VEERUD, VAIKE_SORT,
  filtreeriIsikud, isikuEkspordiRida, isikuFiltrid, isikuSortVaartus, loeSort, normaliseeriParameetrid,
} from "./isikuloend";

const a = loeAndmestik();
const read = isikuRead(a);

/** URL → filtrid → read (nagu IsikudLoend laadimisel). */
function urlist(qs: string) {
  const p = normaliseeriParameetrid(new URLSearchParams(qs), ISIKUTE_ALIASED);
  const f = isikuFiltrid(Object.fromEntries(p.entries()));
  return multiSort(filtreeriIsikud(read, f), loeSort(p.get("sort")).length ? loeSort(p.get("sort")) : VAIKE_SORT, isikuSortVaartus);
}

describe("TE5-02 isikuAastad", () => {
  it("vahemik, üks aasta, null", () => {
    expect(isikuAastad([
      { algus: "1917-08-20", lopp: "1919-05-01" },
      { algus: "1930-01-24", lopp: "1934-02-01" },
    ])).toBe("1917–1934");
    expect(isikuAastad([{ algus: "1921-02-12", lopp: "1921-11-30" }])).toBe("1921");
    expect(isikuAastad([])).toBeNull();
  });

  it("andmetes: Allik (6) 1917–1934, Bukk (395, PA-06) null", () => {
    expect(isikuAastad(karjaariSegmendid(a, 6))).toBe("1917–1934");
    expect(isikuAastad(karjaariSegmendid(a, 395))).toBeNull();
    expect(read.find((r) => r.isik_id === 6)!.aastad).toBe("1917–1934");
  });
});

describe("TE5-05 isikute filter ja URL", () => {
  const k1927 = read.filter((r) => r.koosseisud.includes("1927-1929")).length;

  it("üksikväärtus: ?koosseis=1927-1929 (alias) = ?koosseisud=1927-1929, 55+", () => {
    expect(k1927).toBeGreaterThanOrEqual(55);
    expect(urlist("koosseis=1927-1929")).toHaveLength(k1927);
    expect(urlist("koosseisud=1927-1929")).toHaveLength(k1927);
  });

  it("mitmikväärtus: ühend, nii komaga kui korduva aliasega", () => {
    const yhend = read.filter((r) => r.koosseisud.some((k) => k === "1917-1919" || k === "1927-1929")).length;
    expect(urlist("koosseisud=1917-1919,1927-1929")).toHaveLength(yhend);
    expect(urlist("koosseis=1917-1919&koosseis=1927-1929")).toHaveLength(yhend);
    expect(yhend).toBeGreaterThan(k1927);
  });

  it("nimekiri alias", () => {
    const id = read.find((r) => r.isik_id === 6)!.peamine_nimekiri_id!;
    const n = read.filter((r) => r.peamine_nimekiri_id === id).length;
    expect(urlist(`nimekiri=${id}`)).toHaveLength(n);
  });

  it("vaikejärjestus perenimi A–Z (eesti tähestik)", () => {
    const nimed = urlist("").map((r) => r.perenimi);
    expect(nimed).toEqual([...nimed].sort((x, y) => x.localeCompare(y, "et")));
    expect(nimed).toHaveLength(read.length);
  });

  it("sort parameeter ei viska viga; mõlemad kujud", () => {
    expect(loeSort("koosseise-desc")).toEqual([{ key: "koosseise", desc: true }]);
    expect(loeSort("koosseise:desc,perenimi:asc")).toEqual([
      { key: "koosseise", desc: true }, { key: "perenimi", desc: false },
    ]);
    expect(() => urlist("sort=koosseise-desc")).not.toThrow();
    const r = urlist("sort=koosseise-desc");
    expect(r[0].koosseise).toBe(Math.max(...read.map((x) => x.koosseise)));
    expect(() => urlist("sort=tundmatu-desc")).not.toThrow();
    expect(() => urlist("sort=::,")).not.toThrow();
  });

  it("juhataja URL-ist rakendatakse", () => {
    expect(urlist("juhataja=1").every((r) => r.oli_juhataja)).toBe(true);
  });

  it("otsing 'walter' leiab Rätsepa (isik 284 Valter Rättsepp; w→v, alternatiivkujud)", () => {
    expect(urlist("q=walter").some((r) => r.isik_id === 284)).toBe(true);
    expect(urlist("q=rätsep").some((r) => r.isik_id === 284)).toBe(true);
  });

  it("eksport: kõik senised veerud + isanimi ja AKL ID", () => {
    const votmed = ISIKUTE_EKSPORDI_VEERUD.map((v) => v.key);
    for (const k of ["aadressid", "wikidata", "arhiiviviited", "liikmekirje_puudub", "isanimi", "AKL_ID"]) {
      expect(votmed).toContain(k);
    }
    const rida = isikuEkspordiRida(read[0]);
    expect(Object.keys(rida).sort()).toEqual([...votmed].sort());
  });
});
