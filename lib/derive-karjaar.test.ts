import { describe, expect, it } from "vitest";
import { karjaariSegmendid, liikmedKuupaeval } from "./derive";
import { kuupaevadEesti } from "./protokollid/viide";
import { loeAndmestik } from "./data";
import type { Andmestik, Koosseis, Muutus, Valimine } from "./types";

const KOOSSEIS: Koosseis = {
  koosseis_id: "K", aasta_valimised: "1926", valimised_algus: "1926-12-18", valimised_lopp: "1926-12-19",
  esimene_koosolek: "1927-02-07", viimane_koosolek: "1929-12-30", valimised_allikas: "",
  valimistulemuste_allikas: "", kandidaatide_allikas: "",
  volikogu_suurus: "", volikogu_suurus_algne: null, volikogu_suurus_hiljem: null, volikogu_suurus_muutus: "", haaled_allikas: "", valimistulemuste_allikas_url: "", kandidaatide_allikas_url: "",
};

function valitud(isik_id: number): Valimine {
  return {
    aasta: 1926, koosseis_id: "K", roll: "valitud", allikas: "tulemused", isik_id,
    nimekiri_nr: "", nimekiri_nimi: "", nimekiri_id: null, nimekiri_kontrollida: false, ringkond_nr: "",
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
    liitus_prot: "", lahkus_prot: "", ryhmavahetus_prot: "", peatatud_prot: "", allikaviide: "", tapsustus: "",
    asendaja_ID: null, asendatav_ID: null, asendaja_puudub: "", asendatav_puudub: "",
  };
}

function andmestik(muutused: Muutus[], valimised: Valimine[]): Andmestik {
  return {
    isikud: [], koosseisud: [KOOSSEIS], koosolekud: [], juhatajad: [], muutused, valimised,
    osavott: [], protokollid: [], paevakord: [], mainimised: [], nimekirjad: [], valimisnimekirjad: [], protokolliLehed: [],
  };
}

describe("TE4-05 karjaariSegmendid (PA-09)", () => {
  it("valitud + liitumine&lahkumine → lõik suletakse sel päeval", () => {
    const a = andmestik([m(1, 96, "1927-02-07", "liitumine&lahkumine")], [valitud(96)]);
    expect(karjaariSegmendid(a, 96)).toEqual([{ koosseis_id: "K", algus: "1926-12-18", lopp: "1927-02-07" }]);
  });
  it("liitumine&lahkumine ilma valimiseta → 1-päevane lõik", () => {
    const a = andmestik([m(1, 7, "1928-03-01", "liitumine&lahkumine")], []);
    expect(karjaariSegmendid(a, 7)).toEqual([{ koosseis_id: "K", algus: "1928-03-01", lopp: "1928-03-01" }]);
  });
  it("ühtlus liikmedKuupaeval-iga: liige sel päeval, järgmisel mitte", () => {
    const a = andmestik([m(1, 96, "1927-02-07", "liitumine&lahkumine")], [valitud(96)]);
    expect(liikmedKuupaeval(a.valimised, a.muutused, "K", "1927-02-07").has(96)).toBe(true);
    expect(liikmedKuupaeval(a.valimised, a.muutused, "K", "1927-02-08").has(96)).toBe(false);
  });
  it("päris andmed: isik 96 Mekkart", () => {
    const s = karjaariSegmendid(loeAndmestik(), 96);
    expect(s.find((x) => x.koosseis_id === "1927-1929")).toEqual({ koosseis_id: "1927-1929", algus: "1926-12-18", lopp: "1927-02-07" });
    // valitud 1929 → lõik algab valimistest (sama reegel mis 1927–1929); lahkumine 13.10.1930
    expect(s.find((x) => x.koosseis_id === "1930-1934")).toEqual({ koosseis_id: "1930-1934", algus: "1929-12-14", lopp: "1930-10-13" });
  });
});

describe("TE4-07 kuupaevadEesti koosseisu valimiskuupäevadel (PA-03)", () => {
  it("sama kuu, üks päev, eri kuu", () => {
    expect(kuupaevadEesti(["1926-12-18", "1926-12-19"])).toBe("18.–19. detsember 1926");
    expect(kuupaevadEesti(["1917-08-20", "1917-08-20"])).toBe("20. august 1917");
    expect(kuupaevadEesti(["1923-11-30", "1923-12-01"])).toBe("30. november 1923 – 1. detsember 1923");
  });
  it("kõik 9 koosseisu ühtse kujuga (sõnaline kuu, mitte numbrid)", () => {
    for (const k of loeAndmestik().koosseisud) {
      if (!k.valimised_algus) continue;
      expect(kuupaevadEesti([k.valimised_algus, k.valimised_lopp])).not.toMatch(/\d+\.\d+\.\d{4}/);
    }
  });
});

describe("PA-02 jaluse ZIP-link", () => {
  it("href algab basePath-iga", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: Footer } = await import("../components/Footer");
    expect(renderToStaticMarkup(Footer())).toContain('href="/tlv-rakendus/tlv-andmestik.zip"');
  });
});
