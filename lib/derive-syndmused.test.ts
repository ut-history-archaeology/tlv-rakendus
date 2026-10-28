import { describe, expect, it } from "vitest";
import { isikuSyndmused, koosseisuSyndmused } from "./derive";
import { loeAndmestik } from "./data";
import type { Andmestik, Koosseis, Muutus, Valimine } from "./types";

function valitud(isik_id: number): Valimine {
  return {
    aasta: 1926, koosseis_id: "K", roll: "valitud", isik_id,
    nimekiri_nr: "", nimekiri_nimi: "", ringkond_nr: "",
    perenimi: "", alt_perenimi: "", eesnimi: "", alt_eesnimi: "", isanimi: "",
    vanus: "", synniaeg: "", synniaeg_tuletatud: "",
    elukoht_tanav: "", elukoht_majanr: "", elukoht_korterinr: "", elukoht_muu: "",
    amet: "", markused: "", jrk_uld: "", jrk_nimekiri: "", jrk_ringkond: "",
    haaled_1_jsk: "", haaled_2_jsk: "", haaled_kokku: null,
  };
}

function m(
  muutus_id: number, isik_id: number, kuupaev: string, liik: Muutus["liik"],
  lisa: Partial<Muutus> = {}
): Muutus {
  return {
    muutus_id, isik_id, perenimi: "", eesnimi: "", nimekiri: "",
    kuupaev, koosseis_id: "K", liik,
    liitus_prot: "", lahkus_prot: "", ryhmavahetus_prot: "", peatatud_prot: "",
    allikaviide: "", tapsustus: "",
    asendaja_ID: null, asendatav_ID: null, asendaja_puudub: "", asendatav_puudub: "",
    ...lisa,
  };
}

const KOOSSEIS: Koosseis = {
  koosseis_id: "K", aasta_valimised: "1926", valimised_algus: "1926-12-01", valimised_lopp: "",
  esimene_koosolek: "1927-02-07", viimane_koosolek: "1929-12-30", valimised_allikas: "",
  valimistulemuste_allikas: "", kandidaatide_allikas: "",
};

function andmestik(muutused: Muutus[], valimised: Valimine[] = [], koosseis = KOOSSEIS): Andmestik {
  return {
    isikud: [], koosseisud: [koosseis], koosolekud: [], juhatajad: [], muutused,
    valimised, osavott: [], protokollid: [], paevakord: [], mainimised: [],
  };
}

describe("koosseisuSyndmused (TE3-04)", () => {
  it("vahetus samal kuupäeval → üks sündmus", () => {
    const s = koosseisuSyndmused(andmestik([
      m(1, 10, "1928-03-12", "lahkumine", { asendaja_ID: 20, lahkus_prot: "12.03.1928" }),
      m(2, 20, "1928-03-12", "liitumine", { asendatav_ID: 10, liitus_prot: "12.03.1928" }),
    ]), "K");
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({
      liik: "vahetus", lahkuja: 10, asendaja: 20, kuupaev: "1928-03-12",
      liitumiseKuupaev: "1928-03-12", muutus_idd: [1, 2], protokollid: ["12.03.1928"],
    });
  });

  it("vahetus eri kuupäeval → kuupäev = lahkumine, liitumine lisana", () => {
    const [s] = koosseisuSyndmused(andmestik([
      m(1, 10, "1928-09-10", "lahkumine", { asendaja_ID: 20 }),
      m(2, 20, "1928-09-24", "liitumine", { asendatav_ID: 10 }),
    ]), "K");
    expect(s).toMatchObject({ liik: "vahetus", kuupaev: "1928-09-10", liitumiseKuupaev: "1928-09-24" });
  });

  it("paaritu lahkumine jääb omaette; asendajata lahkumine märgitakse", () => {
    const s = koosseisuSyndmused(andmestik([
      m(1, 10, "1928-01-01", "lahkumine", { asendaja_ID: 20 }),
      m(2, 11, "1928-02-01", "lahkumine"),
    ]), "K");
    expect(s.map((x) => x.liik)).toEqual(["lahkumine", "lahkumine"]);
    expect(s[0]).toMatchObject({ asendaja: 20, asendajaPuudub: false });
    expect(s[1]).toMatchObject({ asendaja: null, asendajaPuudub: true });
  });

  it("ahel läbi liitumine&lahkumine ei moodusta vahetust", () => {
    const s = koosseisuSyndmused(andmestik([
      m(1, 10, "1928-01-01", "lahkumine", { asendaja_ID: 20 }),
      m(2, 20, "1928-01-01", "liitumine&lahkumine", { asendatav_ID: 10, asendaja_ID: 30 }),
      m(3, 30, "1928-01-01", "liitumine", { asendatav_ID: 20 }),
    ]), "K");
    expect(s.map((x) => x.liik)).toEqual(["lahkumine", "liitumine&lahkumine", "liitumine"]);
  });

  it("kinnitamine: valitud esimesel koosolekul → üks sündmus; mittevalitud eraldi märkega", () => {
    const s = koosseisuSyndmused(andmestik([
      m(1, 1, "1927-02-07", "liitumine"),
      m(2, 2, "1927-02-07", "liitumine"),
      m(3, 9, "1927-02-07", "liitumine", { asendatav_ID: 5 }),
    ], [valitud(1), valitud(2), valitud(5)]), "K");
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ liik: "kinnitamine", isikud: [1, 2], muutus_idd: [1, 2] });
    expect(s[1]).toMatchObject({ liik: "liitumine", isik: 9, asendatav: 5, eiValitud: true });
  });

  it("koosseisus ilma esimese koosoleku kuupäevata kinnitamist ei teki", () => {
    const s = koosseisuSyndmused(
      andmestik([m(1, 1, "1917-08-20", "liitumine")], [valitud(1)], { ...KOOSSEIS, esimene_koosolek: "" }),
      "K"
    );
    expect(s.map((x) => x.liik)).toEqual(["liitumine"]);
  });

  it("liitumine&lahkumine, rühmavahetus, peatamine 1:1", () => {
    const s = koosseisuSyndmused(andmestik([
      m(1, 1, "1928-01-01", "liitumine&lahkumine"),
      m(2, 2, "1928-02-01", "rühmavahetus"),
      m(3, 3, "1928-03-01", "peatamine"),
    ]), "K");
    expect(s.map((x) => [x.liik, x.muutus_idd])).toEqual([
      ["liitumine&lahkumine", [1]], ["rühmavahetus", [2]], ["peatamine", [3]],
    ]);
  });

  it("päris andmed: muutus_id-de hulk säilib igas koosseisus", () => {
    const a = loeAndmestik();
    for (const k of a.koosseisud) {
      const sisend = a.muutused.filter((x) => x.koosseis_id === k.koosseis_id).map((x) => x.muutus_id).sort((x, y) => x - y);
      const valjund = koosseisuSyndmused(a, k.koosseis_id).flatMap((s) => s.muutus_idd).sort((x, y) => x - y);
      expect(valjund).toEqual(sisend);
    }
  });

  it("päris andmed: 1917–1923 kinnitamist ei ole; 1927–1929 ≤ 42 sündmust, 53 kinnitatut + 2 eraldi", () => {
    const a = loeAndmestik();
    for (const k of ["1917-1919", "1919-1921", "1921-1923"]) {
      expect(koosseisuSyndmused(a, k).some((s) => s.liik === "kinnitamine")).toBe(false);
    }
    const s = koosseisuSyndmused(a, "1927-1929");
    expect(s.length).toBeLessThanOrEqual(42);
    const kinn = s.find((x) => x.liik === "kinnitamine");
    expect(kinn && kinn.liik === "kinnitamine" && kinn.isikud.length).toBe(53);
    expect(s.filter((x) => x.kuupaev === "1927-02-07" && x.liik === "liitumine")).toHaveLength(2);
    const kokku = a.koosseisud.flatMap((k) => koosseisuSyndmused(a, k.koosseis_id)).filter((x) => x.eiValitud);
    expect(kokku).toHaveLength(8);
  });

  it("isikuSyndmused: vahetus mõlemal osapoolel", () => {
    const a = andmestik([
      m(1, 10, "1928-03-12", "lahkumine", { asendaja_ID: 20 }),
      m(2, 20, "1928-03-12", "liitumine", { asendatav_ID: 10 }),
    ]);
    expect(isikuSyndmused(a, 10).map((s) => s.liik)).toEqual(["vahetus"]);
    expect(isikuSyndmused(a, 20).map((s) => s.liik)).toEqual(["vahetus"]);
  });
});
