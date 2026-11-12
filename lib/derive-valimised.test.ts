import { describe, expect, it } from "vitest";
import { isikuAadressidKoos, isikuValimisedKoos } from "./derive";
import { loeAndmestik } from "./data";
import type { Andmestik, Koosseis, Valimine } from "./types";

function rida(roll: Valimine["roll"], lisa: Partial<Valimine> = {}): Valimine {
  return {
    aasta: 1926, koosseis_id: "K", roll, allikas: roll === "valitud" ? "tulemused" : "kandidaadid", isik_id: 1,
    nimekiri_nr: "", nimekiri_nimi: "", nimekiri_id: null, nimekiri_kontrollida: false, ringkond_nr: "",
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
  volikogu_suurus: "", volikogu_suurus_algne: null, volikogu_suurus_hiljem: null, volikogu_suurus_muutus: "", haaled_allikas: "", valimistulemuste_allikas_url: "", kandidaatide_allikas_url: "",
};

function andmestik(valimised: Valimine[], koosseisud: Koosseis[] = [KOOSSEIS]): Andmestik {
  return {
    isikud: [], koosseisud, koosolekud: [], juhatajad: [], muutused: [],
    valimised, osavott: [], protokollid: [], paevakord: [], mainimised: [],
    nimekirjad: [
      { nimekiri_id: 7, nimi: "Rahvaerakond", mitu_osapoolt: false, wikidata: "" },
    ],
    valimisnimekirjad: [],
    protokolliLehed: [],
  };
}

const KAND = { allikas: "kandidaadid", viide: "KANDIDAADID", url: null } as const;
const TUL = { allikas: "tulemused", viide: "TULEMUSED", url: null } as const;

describe("isikuValimisedKoos (TE3-02)", () => {
  it("ainult kandidaat → tulemus kandidaat, üks allikas", () => {
    const [k] = isikuValimisedKoos(andmestik([rida("valitav", { nimekiri_nimi: "A" })]), 1);
    expect(k.tulemus).toBe("kandidaat");
    expect(k.allikad).toEqual([KAND]);
    expect(k.nimekiri).toEqual([
      { nr: "", nimi: "A", toor: ["A"], nimekiri_id: null, kontrollida: false, allikad: [KAND] },
    ]);
  });

  it("valitud + kandidaat võrdsete väljadega → üks väärtus kahe allikaga", () => {
    const k = isikuValimisedKoos(andmestik([
      rida("valitud", { nimekiri_nimi: "A", amet: "kaupmees", jrk_nimekiri: "6", jrk_uld: "46" }),
      rida("valitav", { nimekiri_nimi: "A", nimekiri_nr: "3", amet: "kaupmees", vanus: "55" }),
    ]), 1);
    expect(k).toHaveLength(1);
    expect(k[0].tulemus).toBe("valitud");
    expect(k[0].nimekiri).toEqual([
      { nr: "3", nimi: "A", toor: ["A"], nimekiri_id: null, kontrollida: false, allikad: [KAND, TUL] },
    ]);
    expect(k[0].amet).toEqual([{ vaartus: "kaupmees", allikad: [KAND, TUL] }]);
    expect(k[0].koht).toEqual([{ vaartus: "6 (üldjärjestuses 46)", allikad: [TUL] }]);
    expect(k[0].allikad).toEqual([KAND, TUL]);
  });

  it("erinev nimekiri_nimi → kaks kuju, kumbki oma allikaga", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { nimekiri_nimi: "Majaomanikud" }),
      rida("valitud", { nimekiri_nimi: "Majaomanikkude selts" }),
    ]), 1);
    expect(k.nimekiri.map((n) => [n.nimi, n.allikad])).toEqual([
      ["Majaomanikud", [KAND]],
      ["Majaomanikkude selts", [TUL]],
    ]);
  });

  it("NK-03: eri toorkujud sama kanoonilise nimekirjaga → üks kanooniline nimi, toorkujud alles", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { nimekiri_nimi: "Eesti rahvaerakonna nimekiri", nimekiri_id: 7 }),
      rida("valitud", { nimekiri_nimi: "Rahvaerakonna nimekiri", nimekiri_id: 7, nimekiri_kontrollida: true }),
    ]), 1);
    expect(k.nimekiri).toEqual([{
      nr: "", nimi: "Rahvaerakond", toor: ["Eesti rahvaerakonna nimekiri", "Rahvaerakonna nimekiri"],
      nimekiri_id: 7, kontrollida: true, allikad: [KAND, TUL],
    }]);
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
    expect(k.ringkond).toEqual([
      { vaartus: "1", allikad: [KAND] },
      { vaartus: "1, koht ringkonnas 8", allikad: [TUL] },
    ]);
    expect(k.haaled).toEqual([{ vaartus: "937 (1. jsk 443, 2. jsk 494)", allikad: [TUL] }]);
  });

  it("allikad õige koosseisu järgi", () => {
    const teine: Koosseis = { ...KOOSSEIS, koosseis_id: "L", kandidaatide_allikas: "K2", valimistulemuste_allikas: "T2" };
    const k = isikuValimisedKoos(andmestik([
      rida("valitav"),
      rida("valitav", { aasta: 1929, koosseis_id: "L" }),
      rida("valitud", { aasta: 1929, koosseis_id: "L" }),
    ], [KOOSSEIS, teine]), 1);
    expect(k.map((x) => x.aasta)).toEqual([1926, 1929]);
    expect(k[1].allikad).toEqual([
      { allikas: "kandidaadid", viide: "K2", url: null }, { allikas: "tulemused", viide: "T2", url: null },
    ]);
  });

  it("päris andmed: Aavik 1926 — üks kirje, vanus 55, koht 6 (46), kaks allikat", () => {
    const k = isikuValimisedKoos(loeAndmestik(), 1).find((x) => x.aasta === 1926)!;
    expect(k.nimekiri).toHaveLength(1);
    expect(k.vanus.map((v) => v.vaartus)).toEqual(["55"]);
    expect(k.koht.map((v) => v.vaartus)).toEqual(["6 (üldjärjestuses 46)"]);
    expect(k.allikad).toHaveLength(2);
  });
});

describe("valimiste kaart allikaviidetega (TE4-04, VK-01…VK-03)", () => {
  it("kolm allikat ühel aastal → üks kaart, allikad rea kaupa", () => {
    const k = isikuValimisedKoos(andmestik([
      rida("valitav", { aasta: 1917, amet: "kontoriametnik" }),
      rida("valitav", { aasta: 1917, allikas: "kandidaadid_vene", amet: "конторщикъ" }),
      rida("valitud", { aasta: 1917 }),
    ]), 1);
    expect(k).toHaveLength(1);
    expect(k[0].allikad.map((a) => a.allikas)).toEqual(["kandidaadid", "kandidaadid_vene", "tulemused"]);
    expect(k[0].amet).toEqual([
      { vaartus: "kontoriametnik", allikad: [KAND] },
      { vaartus: "конторщикъ", allikad: [{ allikas: "kandidaadid_vene", viide: null, url: null }] },
    ]);
  });

  it("võrdne väärtus kahest allikast → üks väärtus kahe viitega", () => {
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { amet: "kaupmees" }), rida("valitud", { amet: "kaupmees" }),
    ]), 1);
    expect(k.amet).toEqual([{ vaartus: "kaupmees", allikad: [KAND, TUL] }]);
  });

  it("viide puudu → viide: null; URL koosseisu tabelist", () => {
    const ilma: Koosseis = { ...KOOSSEIS, kandidaatide_allikas: "", valimistulemuste_allikas_url: "https://dea.digar.ee/x" };
    const [k] = isikuValimisedKoos(andmestik([
      rida("valitav", { amet: "kaupmees" }), rida("valitud", { amet: "kaupmees" }),
    ], [ilma]), 1);
    expect(k.amet[0].allikad).toEqual([
      { allikas: "kandidaadid", viide: null, url: null },
      { allikas: "tulemused", viide: "TULEMUSED", url: "https://dea.digar.ee/x" },
    ]);
  });

  it("päris andmed: Oskar Allik (6) 1917 — üks kaart, eesti viitega, vene VIIDE PUUDU", () => {
    const k = isikuValimisedKoos(loeAndmestik(), 6).filter((x) => x.aasta === 1917);
    expect(k).toHaveLength(1);
    const vene = (v: { allikad: { allikas: string; viide: string | null }[] }) =>
      v.allikad.some((a) => a.allikas === "kandidaadid_vene" && a.viide === null);
    expect(k[0].vanus.find((v) => v.vaartus === "32")).toSatisfy(vene);
    expect(k[0].aadress.find((v) => v.vaartus.startsWith("Толстого 10"))).toSatisfy(vene);
    expect(k[0].amet.find((v) => v.vaartus === "конторщикъ")).toSatisfy(vene);
    const eesti = k[0].allikad.find((a) => a.allikas === "kandidaadid")!;
    expect(eesti.viide).toMatch(/^Eestimaa Kubermangu Teataja, nr\. 35/);
    expect(eesti.url).toMatch(/^https:\/\/dea\.digar\.ee\//);
    expect(k[0].nimekiri[0].allikad.map((a) => a.allikas)).toEqual(["kandidaadid", "kandidaadid_vene", "tulemused"]);
  });

  it("päris andmed: Aavik (1) 1926 — kandidaadi viide puudub (L-04), valitu viide Riigi Teatajale", () => {
    const k = isikuValimisedKoos(loeAndmestik(), 1).find((x) => x.aasta === 1926)!;
    const kand = k.allikad.find((a) => a.allikas === "kandidaadid")!;
    const tul = k.allikad.find((a) => a.allikas === "tulemused")!;
    expect(kand.viide).toBeNull();
    expect(tul.viide).toBe("Riigi Teataja, nr. 6, 24 jaanuar 1927");
    expect(tul.url).toBe("https://dea.digar.ee/article/AKriigiteataja/1927/01/24/12");
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
