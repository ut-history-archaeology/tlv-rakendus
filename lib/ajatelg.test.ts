import { describe, expect, it } from "vitest";
import { paigutaMarkerid } from "./ajatelg";
import { liikmeteArvuSeeria } from "./derive";
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

function m(muutus_id: number, isik_id: number, kuupaev: string, liik: Muutus["liik"]): Muutus {
  return {
    muutus_id, isik_id, perenimi: "", eesnimi: "", nimekiri: "", kuupaev, koosseis_id: "K", liik,
    liitus_prot: "", lahkus_prot: "", ryhmavahetus_prot: "", peatatud_prot: "",
    allikaviide: "", tapsustus: "",
    asendaja_ID: null, asendatav_ID: null, asendaja_puudub: "", asendatav_puudub: "",
  };
}

const KOOSSEIS: Koosseis = {
  koosseis_id: "K", aasta_valimised: "1926", valimised_algus: "1926-12-01", valimised_lopp: "",
  esimene_koosolek: "1927-02-07", viimane_koosolek: "1929-12-30", valimised_allikas: "",
  valimistulemuste_allikas: "", kandidaatide_allikas: "",
};

describe("liikmeteArvuSeeria (TE3-05)", () => {
  it("valitud 3, lahkumine, liitumine → 3, 2, 3, 3; kinnitamine arvu ei muuda", () => {
    const andmed: Andmestik = {
      isikud: [], koosseisud: [KOOSSEIS], koosolekud: [], juhatajad: [],
      muutused: [
        m(1, 1, "1927-02-07", "liitumine"), // kinnitamine (valitud)
        m(2, 1, "1928-01-01", "lahkumine"),
        m(3, 4, "1928-02-01", "liitumine"),
      ],
      valimised: [valitud(1), valitud(2), valitud(3)],
      osavott: [], protokollid: [], paevakord: [], mainimised: [],
    };
    expect(liikmeteArvuSeeria(andmed, "K", "1926-12-01", "1929-12-30")).toEqual([
      { kuupaev: "1926-12-01", arv: 3 },
      { kuupaev: "1927-02-07", arv: 3 },
      { kuupaev: "1928-01-01", arv: 2 },
      { kuupaev: "1928-02-01", arv: 3 },
      { kuupaev: "1929-12-30", arv: 3 },
    ]);
  });
});

describe("liikmeteArvuSeeria: liitumine&lahkumine", () => {
  it("ühepäevane liige tõstab arvu ainult sel päeval", () => {
    const andmed: Andmestik = {
      isikud: [], koosseisud: [KOOSSEIS], koosolekud: [], juhatajad: [],
      muutused: [m(1, 9, "1928-01-31", "liitumine&lahkumine")],
      valimised: [valitud(1), valitud(2)],
      osavott: [], protokollid: [], paevakord: [], mainimised: [],
    };
    expect(liikmeteArvuSeeria(andmed, "K", "1926-12-01", "1929-12-30").map((x) => [x.kuupaev, x.arv])).toEqual([
      ["1926-12-01", 2], ["1928-01-31", 3], ["1928-02-01", 2], ["1929-12-30", 2],
    ]);
  });
});

describe("paigutaMarkerid (TE3-06)", () => {
  const x = (k: string) => ({ a: 0, b: 5, c: 20, d: 22, e: 24 } as Record<string, number>)[k];

  it("sama päev → üks marker", () => {
    expect(paigutaMarkerid(["a", "a", "a"], x)).toEqual([{ kuupaev: "a", x: 0, rida: 0 }]);
  });

  it("kaks kuupäeva < 8 px → teine rida; kaugemal → tagasi esimesele", () => {
    expect(paigutaMarkerid(["a", "b", "c"], x).map((p) => p.rida)).toEqual([0, 1, 0]);
  });

  it("mõlemad read kinni → suurema vahega rida", () => {
    expect(paigutaMarkerid(["c", "d", "e"], x).map((p) => p.rida)).toEqual([0, 1, 0]);
  });
});
