import { describe, expect, it } from "vitest";
import { isikuAadressidKoos, isikuValimisedKoos } from "./derive";
import { loeAndmestik } from "./data";
import type { Andmestik, Koosseis, Valimine } from "./types";

function rida(roll: Valimine["roll"], lisa: Partial<Valimine> = {}): Valimine {
  return {
    aasta: 1926, koosseis_id: "K", roll, isik_id: 1,
    nimekiri_nr: "", nimekiri_nimi: "", ringkond_nr: "",
    perenimi: "", alt_perenimi: "", eesnimi: "", alt_eesnimi: "", isanimi: "",
    vanus: "", synniaeg: "", synniaeg_tuletatud: "",
    elukoht_tanav: "", elukoht_majanr: "", elukoht_korterinr: "", elukoht_muu: "",
    amet: "", markused: "", jrk_uld: "", jrk_nimekiri: "", jrk_ringkond: "",
    haaled_1_jsk: "", haaled_2_jsk: "", haaled_kokku: null,
    ...lisa,
  };
}

const KOOSSEIS: Koosseis = {
  koosseis_id: "K", aasta_valimised: "1926", valimised_algus: "", valimised_lopp: "",
  esimene_koosolek: "", viimane_koosolek: "", valimised_allikas: "",
  valimistulemuste_allikas: "TULEMUSED", kandidaatide_allikas: "KANDIDAADID",
};

function andmestik(valimised: Valimine[], koosseisud: Koosseis[] = [KOOSSEIS]): Andmestik {
  return {
    isikud: [], koosseisud, koosolekud: [], juhatajad: [], muutused: [],
    valimised, osavott: [], protokollid: [], paevakord: [], mainimised: [],
  };
}

const KAND = { roll: "valitav", viide: "KANDIDAADID" } as const;
const TUL = { roll: "valitud", viide: "TULEMUSED" } as const;

describe("isikuValimisedKoos (TE3-02)", () => {
  it("ainult kandidaat → tulemus kandidaat, üks allikas", () => {
    const [k] = isikuValimisedKoos(andmestik([rida("valitav", { nimekiri_nimi: "A" })]), 1);
    expect(k.tulemus).toBe("kandidaat");
    expect(k.allikad).toEqual([KAND]);
    expect(k.nimekiri).toEqual([{ nr: "", nimi: "A", allikad: [KAND] }]);
  });

  it("valitud + kandidaat võrdsete väljadega → üks väärtus kahe allikaga", () => {
    const k = isikuValimisedKoos(andmestik([
      rida("valitud", { nimekiri_nimi: "A", amet: "kaupmees", jrk_nimekiri: "6", jrk_uld: "46" }),
      rida("valitav", { nimekiri_nimi: "A", nimekiri_nr: "3", amet: "kaupmees", vanus: "55" }),
    ]), 1);
    expect(k).toHaveLength(1);
    expect(k[0].tulemus).toBe("valitud");
    expect(k[0].nimekiri).toEqual([{ nr: "3", nimi: "A", allikad: [KAND, TUL] }]);
    expect(k[0].amet).toEqual([{ vaartus: "kaupmees", allikad: [KAND, TUL] }]);
    expect(k[0].koht).toEqual({ jrk_nimekiri: "6", jrk_uld: "46" });
    expect(k[0].allikad).toEqual([KAND, TUL]);
  });

  it("erinev nimekiri_nimi → kaks kuju, kumbki oma allikaga", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { nimekiri_nimi: "Majaomanikud" }),
      rida("valitud", { nimekiri_nimi: "Majaomanikkude selts" }),
    ]), 1);
    expect(k.nimekiri).toEqual([
      { nr: "", nimi: "Majaomanikud", allikad: [KAND] },
      { nr: "", nimi: "Majaomanikkude selts", allikad: [TUL] },
    ]);
  });

  it("vanus kandidaadirealt", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitud"), rida("valitav", { vanus: "55" }),
    ]), 1);
    expect(k.vanus).toEqual([{ vaartus: "55", allikad: [KAND] }]);
  });

  it("1939: ringkond ja hääled", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { aasta: 1939, ringkond_nr: "1" }),
      rida("valitud", { aasta: 1939, ringkond_nr: "1", jrk_ringkond: "8", haaled_1_jsk: "443", haaled_2_jsk: "494", haaled_kokku: 937 }),
    ]), 1);
    expect(k.ringkond).toBe("1");
    expect(k.koht.jrk_ringkond).toBe("8");
    expect(k.haaled).toEqual({ jsk1: "443", jsk2: "494", kokku: 937 });
  });

  it("allikad õige koosseisu järgi", () => {
    const teine: Koosseis = { ...KOOSSEIS, koosseis_id: "L", kandidaatide_allikas: "K2", valimistulemuste_allikas: "T2" };
    const k = isikuValimisedKoos(andmestik([
      rida("valitav"),
      rida("valitav", { aasta: 1929, koosseis_id: "L" }),
      rida("valitud", { aasta: 1929, koosseis_id: "L" }),
    ], [KOOSSEIS, teine]), 1);
    expect(k.map((x) => x.aasta)).toEqual([1926, 1929]);
    expect(k[1].allikad).toEqual([{ roll: "valitav", viide: "K2" }, { roll: "valitud", viide: "T2" }]);
  });

  it("päris andmed: Aavik 1926 — üks kirje, vanus 55, koht 6 (46), kaks allikat", () => {
    const k = isikuValimisedKoos(loeAndmestik(), 1).find((x) => x.aasta === 1926)!;
    expect(k.nimekiri).toHaveLength(1);
    expect(k.vanus.map((v) => v.vaartus)).toEqual(["55"]);
    expect(k.koht).toMatchObject({ jrk_nimekiri: "6", jrk_uld: "46" });
    expect(k.allikad).toHaveLength(2);
  });
});

describe("isikuAadressidKoos (TE3-03)", () => {
  it("dubleerimine samal aastal → üks", () => {
    const a = isikuAadressidKoos(andmestik([
      rida("valitav", { elukoht_tanav: "Raatuse", elukoht_majanr: "10" }),
      rida("valitud", { elukoht_tanav: "Raatuse", elukoht_majanr: "10" }),
    ]), 1);
    expect(a).toEqual([{ tekst: "Raatuse 10", aastad: [1926], allikad: [KAND, TUL] }]);
  });

  it("sama aadress eri aastatel → aastad koos; eri maja → eraldi", () => {
    const a = isikuAadressidKoos(andmestik([
      rida("valitav", { aasta: 1929, elukoht_tanav: "Pikk", elukoht_majanr: "3" }),
      rida("valitav", { aasta: 1923, elukoht_tanav: "Pikk", elukoht_majanr: "3" }),
      rida("valitav", { aasta: 1934, elukoht_tanav: "Pikk", elukoht_majanr: "5" }),
    ]), 1);
    expect(a.map((x) => [x.tekst, x.aastad])).toEqual([["Pikk 3", [1923, 1929]], ["Pikk 5", [1934]]]);
  });

  it("tõst ja tühikud ei loo uut aadressi", () => {
    const a = isikuAadressidKoos(andmestik([
      rida("valitav", { aasta: 1923, elukoht_tanav: "Pikk", elukoht_majanr: "3" }),
      rida("valitav", { aasta: 1926, elukoht_tanav: "pikk ", elukoht_majanr: "3" }),
    ]), 1);
    expect(a).toHaveLength(1);
    expect(a[0].tekst).toBe("Pikk 3");
  });

  it("elukoht_muu on eraldi aadress", () => {
    const a = isikuAadressidKoos(andmestik([
      rida("valitav", { elukoht_tanav: "Pikk", elukoht_majanr: "3", elukoht_muu: "Tähtvere mõis" }),
    ]), 1);
    expect(a.map((x) => x.tekst)).toEqual(["Pikk 3", "Tähtvere mõis"]);
  });

  it("päris andmed: Aavik → Raatuse 10 (1926) üks kord", () => {
    const a = isikuAadressidKoos(loeAndmestik(), 1);
    expect(a.filter((x) => x.tekst === "Raatuse 10")).toEqual([
      expect.objectContaining({ aastad: [1926] }),
    ]);
  });
});
