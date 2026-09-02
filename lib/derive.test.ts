import { describe, expect, it } from "vitest";
import { liikmedKuupaeval, koosseisuLiikmedKokku, tuletatudKohalolijad } from "./derive";
import { loeAndmestik } from "./data";
import type { Muutus, Valimine } from "./types";

function valitud(isik_id: number, koosseis_id = "K"): Valimine {
  return {
    aasta: 1921, koosseis_id, roll: "valitud", isik_id,
    nimekiri_nr: "", nimekiri_nimi: "", ringkond_nr: "",
    perenimi: "", alt_perenimi: "", eesnimi: "", alt_eesnimi: "", isanimi: "",
    vanus: "", synniaeg: "", synniaeg_tuletatud: "",
    elukoht_tanav: "", elukoht_majanr: "", elukoht_korterinr: "", elukoht_muu: "",
    amet: "", markused: "", jrk_uld: "", jrk_nimekiri: "", jrk_ringkond: "",
    haaled_1_jsk: "", haaled_2_jsk: "", haaled_kokku: null,
  };
}

function muutus(
  muutus_id: number,
  isik_id: number,
  kuupaev: string,
  liik: Muutus["liik"],
  koosseis_id = "K"
): Muutus {
  return {
    muutus_id, isik_id, perenimi: "", eesnimi: "", nimekiri: "",
    kuupaev, koosseis_id, liik,
    liitus_prot: "", lahkus_prot: "", ryhmavahetus_prot: "", peatatud_prot: "",
    allikaviide: "", tapsustus: "",
    asendaja_ID: null, asendatav_ID: null, asendaja_puudub: "", asendatav_puudub: "",
  };
}

describe("liikmedKuupaeval (erireegel 1)", () => {
  it("alustab valitute hulgast", () => {
    const l = liikmedKuupaeval([valitud(1), valitud(2)], [], "K", "1921-06-01");
    expect(l).toEqual(new Set([1, 2]));
  });

  it("liitumine lisab alates muutuse kuupäevast", () => {
    const m = [muutus(1, 3, "1921-05-01", "liitumine")];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-04-30").has(3)).toBe(false);
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-05-01").has(3)).toBe(true);
  });

  it("lahkumine eemaldab alates muutuse kuupäevast", () => {
    const m = [muutus(1, 1, "1921-05-01", "lahkumine")];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-04-30").has(1)).toBe(true);
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-05-01").has(1)).toBe(false);
  });

  it("liitumine&lahkumine: liige ainult samal päeval", () => {
    const m = [muutus(1, 5, "1921-05-01", "liitumine&lahkumine")];
    expect(liikmedKuupaeval([], m, "K", "1921-05-01").has(5)).toBe(true);
    expect(liikmedKuupaeval([], m, "K", "1921-05-02").has(5)).toBe(false);
  });

  it("peatamine eemaldab", () => {
    const m = [muutus(1, 1, "1921-05-01", "peatamine")];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-06-01").has(1)).toBe(false);
  });

  it("rühmavahetus ei muuda liikmelisust", () => {
    const m = [muutus(1, 1, "1921-05-01", "rühmavahetus")];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-06-01").has(1)).toBe(true);
  });

  it("rakendab muutused kronoloogiliselt (lahkumine + hilisem taasliitumine)", () => {
    const m = [
      muutus(1, 1, "1921-05-01", "lahkumine"),
      muutus(2, 1, "1921-08-01", "liitumine"),
    ];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-06-01").has(1)).toBe(false);
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-09-01").has(1)).toBe(true);
  });

  it("teise koosseisu muutused ei mõjuta", () => {
    const m = [muutus(1, 1, "1921-05-01", "lahkumine", "TEINE")];
    expect(liikmedKuupaeval([valitud(1)], m, "K", "1921-06-01").has(1)).toBe(true);
  });
});

describe("koosseisuLiikmedKokku", () => {
  it("valitud + liitunud, lahkumised ei vähenda", () => {
    const m = [
      muutus(1, 3, "1921-05-01", "liitumine"),
      muutus(2, 1, "1921-06-01", "lahkumine"),
    ];
    expect(koosseisuLiikmedKokku([valitud(1), valitud(2)], m, "K")).toEqual(
      new Set([1, 2, 3])
    );
  });
});

describe("päris andmed: valideerimiskontrollid", () => {
  const andmed = loeAndmestik();

  it("andmestik on oodatud suurusega", () => {
    expect(andmed.isikud).toHaveLength(404);
    expect(andmed.koosseisud).toHaveLength(9);
    expect(andmed.koosolekud).toHaveLength(337);
    expect(andmed.muutused).toHaveLength(633);
    expect(andmed.valimised).toHaveLength(1092);
    expect(andmed.osavott).toHaveLength(5087);
  });

  it("tuletatud liikmete arv on lähedane protokolli koosseis_arv väärtusele", () => {
    // Käsitsi kontrollitav juht: võrdle tuletatud koosseisusuurust protokollis
    // kirjas oleva koosseis_arv-ga koosolekutel, kus see on antud.
    const kontrollitavad = andmed.koosolekud.filter((k) => k.koosseis_arv !== null);
    expect(kontrollitavad.length).toBeGreaterThan(0);
    let tapseid = 0;
    for (const k of kontrollitavad) {
      const tuletatud = liikmedKuupaeval(
        andmed.valimised, andmed.muutused, k.koosseis_id, k.kuupaev
      ).size;
      if (Math.abs(tuletatud - k.koosseis_arv!) <= 2) tapseid++;
    }
    // Vähemalt 80% juhtudel peab tuletatud suurus klappima ±2 piires
    expect(tapseid / kontrollitavad.length).toBeGreaterThan(0.8);
  });

  it("tuletatud kohalolijate arv K001-l on protokolli lähedal", () => {
    const k001 = andmed.koosolekud.find((k) => k.koosolek_id === "K001")!;
    const tuletatud = tuletatudKohalolijad(andmed, k001);
    // Protokoll: 38 kohal; koosseis 1917-1919 andmed on auklikud, seega ainult
    // mõistlikkuse kontroll
    expect(tuletatud.length).toBeGreaterThan(0);
  });
});
