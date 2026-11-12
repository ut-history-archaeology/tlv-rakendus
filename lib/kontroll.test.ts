import { describe, expect, it } from "vitest";
import {
  kokkuvote, kt01LiikmeteArv, kt02KohaloluBilanss, kt03MuutusteLoogika, kt04Osavott, kt05Isikud,
} from "./kontroll";
import type { Andmestik, Isik, Koosolek, Koosseis, Muutus, Osavott, Valimine } from "./types";

// TE4-09: iga KT-kontroll vähemalt ühe positiivse ja ühe negatiivse juhtumiga (sünteetilised andmed)

const KOOSSEIS: Koosseis = {
  koosseis_id: "K", aasta_valimised: "1926", valimised_algus: "1926-12-18", valimised_lopp: "1926-12-19",
  esimene_koosolek: "1927-02-07", viimane_koosolek: "1929-12-30", valimised_allikas: "",
  valimistulemuste_allikas: "", kandidaatide_allikas: "",
};

function isik(isik_id: number): Isik {
  return {
    isik_id, perenimi: `P${isik_id}`, alt_perenimi: "", eesnimi: `E${isik_id}`, alt_eesnimi: "", sugu: "m",
    isanimi: "", synd_kuupaev: "", synd_tuletatud: "", surm_kuupaev: "", wikidata: "", arhiiviviited: "", AKL_ID: "",
  };
}

function valitud(isik_id: number): Valimine {
  return {
    aasta: 1926, koosseis_id: "K", roll: "valitud", isik_id,
    nimekiri_nr: "", nimekiri_nimi: "", nimekiri_id: null, nimekiri_kontrollida: false, ringkond_nr: "",
    perenimi: "", alt_perenimi: "", eesnimi: "", alt_eesnimi: "", isanimi: "",
    vanus: "", synniaeg: "", synniaeg_tuletatud: "",
    elukoht_tanav: "", elukoht_majanr: "", elukoht_korterinr: "", elukoht_muu: "",
    amet: "", markused: "", jrk_uld: "", jrk_nimekiri: "", jrk_ringkond: "",
    haaled_1_jsk: "", haaled_2_jsk: "", haaled_kokku: null,
  };
}

function m(muutus_id: number, isik_id: number | null, kuupaev: string, liik: Muutus["liik"], lisa: Partial<Muutus> = {}): Muutus {
  return {
    muutus_id, isik_id, perenimi: "", eesnimi: "", nimekiri: "", kuupaev, koosseis_id: "K", liik,
    liitus_prot: "", lahkus_prot: "", ryhmavahetus_prot: "", peatatud_prot: "", allikaviide: "", tapsustus: "",
    asendaja_ID: null, asendatav_ID: null, asendaja_puudub: "", asendatav_puudub: "", ...lisa,
  };
}

function koosolek(koosolek_id: string, kuupaev: string, lisa: Partial<Koosolek> = {}): Koosolek {
  return {
    koosolek_id, kuupaev, kuupaev_lopp: "", nadalapaev: "", vorm: "korraline", koosseis_id: "K",
    juhataja: "", koosseis_arv: null, kohal_arv: null, kohal_arv_2paev: null, kuupaev_txt: "",
    protokolli_algus_txt: "", ...lisa,
  };
}

function o(koosolek_id: string, kuupaev: string, staatus: Osavott["staatus"], isik_id: number | null, kindlus: Osavott["sidumise_kindlus"] = "kõrge"): Osavott {
  return { koosolek_id, kuupaev, koosseis_id: "K", staatus, nimi_toor: `N${isik_id}`, isik_id, sidumise_kindlus: kindlus };
}

function andmestik(osa: Partial<Andmestik>): Andmestik {
  return {
    isikud: [1, 2, 3, 4, 5, 6].map(isik), koosseisud: [KOOSSEIS], koosolekud: [], juhatajad: [], muutused: [],
    valimised: [1, 2, 3].map(valitud), osavott: [], protokollid: [], paevakord: [], mainimised: [], nimekirjad: [], valimisnimekirjad: [], ...osa,
  };
}

describe("KT-01 liikmete arv", () => {
  it("protokolli suurus ≠ tuletatud → erinevus; võrdne → 0; puuduv → null", () => {
    const r = kt01LiikmeteArv(andmestik({
      koosolekud: [
        koosolek("K1", "1927-02-07", { koosseis_arv: 3 }),
        koosolek("K2", "1927-03-01", { koosseis_arv: 4 }),
        koosolek("K3", "1927-04-01"),
      ],
      muutused: [m(1, 3, "1927-02-20", "lahkumine")],
    }));
    expect(r.map((x) => [x.koosolek_id, x.tuletatud, x.erinevus])).toEqual([
      ["K1", 3, 0], ["K2", 2, -2], ["K3", 2, null],
    ]);
  });
});

describe("KT-02 kohalolu bilanss", () => {
  it("kohal + puudujad vs tuletatud; kahepäevane annab kaks rida", () => {
    const r = kt02KohaloluBilanss(andmestik({
      koosolekud: [
        koosolek("K1", "1927-02-07", { kohal_arv: 2 }),
        koosolek("K2", "1927-03-01", { kohal_arv: 1, kohal_arv_2paev: 2, kuupaev_lopp: "1927-03-02" }),
        koosolek("K3", "1927-04-01"),
      ],
      osavott: [o("K1", "1927-02-07", "puudub", 3), o("K2", "1927-03-01", "puudub", null, "puudub")],
    }));
    expect(r.map((x) => [x.koosolek_id, x.paev, x.erinevus])).toEqual([
      ["K1", 1, 0], ["K2", 1, -1], ["K2", 2, 0],
    ]);
  });
});

describe("KT-03 muutuste loogika", () => {
  const k = kt03MuutusteLoogika(andmestik({
    muutused: [
      m(1, 1, "1927-02-07", "liitumine"), // kinnitusrida
      m(2, 4, "1927-05-01", "lahkumine"), // (a) polnud liige
      m(3, 2, "1927-06-01", "liitumine"), // (b) oli juba liige
      m(4, 3, "1927-07-01", "lahkumine", { asendaja_ID: 5 }), // (c) asendaja liitumine puudub
      m(5, 6, "1927-08-01", "lahkumine", { asendaja_ID: 4 }), // korras paar
      m(6, 4, "1927-08-01", "liitumine", { asendatav_ID: 6 }),
      m(7, 2, "1931-01-01", "lahkumine"), // (d) väljaspool vahemikku
      m(8, null, "1928-01-01", "lahkumine"), // (e)
    ],
  }));
  const tyybid = (t: string) => k.leiud.filter((l) => l.tyyp === t).map((l) => l.muutus_id);

  it("(a) lahkumine mitteliikmelt; liikme lahkumine pole leid", () => {
    expect(tyybid("a")).toContain(2);
    expect(tyybid("a")).not.toContain(4);
  });
  it("(b) korduv liitumine on leid, kinnitusrida mitte", () => {
    expect(tyybid("b")).toEqual([3]);
    expect(k.kinnitusread.get("K")).toBe(1);
  });
  it("(c) paarita vahetus on leid, klappiv paar mitte", () => {
    expect(tyybid("c")).toEqual([4]);
  });
  it("(d) ja (e)", () => {
    expect(tyybid("d")).toEqual([7]);
    expect(tyybid("e")).toEqual([8]);
  });
});

describe("KT-04 osavõtt vs liikmelisus", () => {
  it("(a) nimetatud mitteliige on leid, liige ja keskmisest madalam kindlus mitte; (b) nimetamata liige", () => {
    const l = kt04Osavott(andmestik({
      koosolekud: [koosolek("K1", "1927-02-07")],
      osavott: [
        o("K1", "1927-02-07", "kohal", 1),
        o("K1", "1927-02-07", "kohal", 2),
        o("K1", "1927-02-07", "puudub", 5),
        o("K1", "1927-02-07", "puudub", 6, "mitmene"),
      ],
    }));
    expect(l.filter((x) => x.tyyp === "mitte_liige").map((x) => x.isik_id)).toEqual([5]);
    expect(l.filter((x) => x.tyyp === "nimetamata").map((x) => x.isik_id)).toEqual([3]);
  });
});

describe("KT-05 isikud", () => {
  it("(a) kirjeta, (b) ainult isikutes, (c) juhataja mitteliige", () => {
    const l = kt05Isikud(andmestik({
      koosolekud: [koosolek("K1", "1927-02-07")],
      muutused: [m(1, 4, "1927-05-01", "lahkumine")],
      juhatajad: [
        { koosolek_id: "K1", juhataja_nimi: "E1 P1", isik_id: 1 },
        { koosolek_id: "K1", juhataja_nimi: "E6 P6", isik_id: 6 },
      ],
    }));
    expect(l.filter((x) => x.tyyp === "kirjeta").map((x) => x.isik_id)).toEqual([4]);
    expect(l.filter((x) => x.tyyp === "ainult_isikutes").map((x) => x.isik_id)).toEqual([5]);
    expect(l.filter((x) => x.tyyp === "juhataja").map((x) => x.isik_id)).toEqual([6]);
  });
});

describe("KT-06 kokkuvõte", () => {
  it("loeb leiud koosseisu kaupa; koosseisuta leid eraldi real", () => {
    const t = kokkuvote(andmestik({ muutused: [m(1, 4, "1927-05-01", "lahkumine")] }));
    expect(t.get("K")).toMatchObject({ kt03a: 1, kt05a: 1, kt01: 0 });
    expect(t.get("—")).toMatchObject({ kt05b: 2 });
  });
});
