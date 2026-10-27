import { describe, expect, it } from "vitest";
import { koostaViide, kuupaevadEesti } from "./viide";

describe("TE-09 viide", () => {
  const alus = {
    kuupaevad: ["1930-09-08"], arhiiviviide: "ERA.2966.2.74", esimeneLk: "125", viimaneLk: "131",
    transkribusUrl: "https://rahvusarhiiv.transkribus.eu/document/3016346/pages/125",
    leheUrl: "https://ut-history-archaeology.github.io/tlv-rakendus/protokollid/K175/", vaadatud: "2026-10-27",
  };
  it("ilma punktita", () => {
    expect(koostaViide(alus)).toBe(
      "Tartu Linnavolikogu protokoll, 8. september 1930. Rahvusarhiiv, ERA.2966.2.74, lk 125–131. " +
        "Transkribus: https://rahvusarhiiv.transkribus.eu/document/3016346/pages/125. " +
        "Tartu Linnavolikogu andmestik, 2026, https://ut-history-archaeology.github.io/tlv-rakendus/protokollid/K175/ (vaadatud 27. oktoober 2026)."
    );
  });
  it("punktiga: ', päevakorrapunkt 3' ja '#p3'", () => {
    const v = koostaViide({ ...alus, punktNr: 3 });
    expect(v).toContain("8. september 1930, päevakorrapunkt 3. Rahvusarhiiv");
    expect(v).toContain("/protokollid/K175/#p3 (vaadatud");
  });
  it("kahepäevane kuupäev ja üks leht", () => {
    expect(kuupaevadEesti(["1920-03-29", "1920-03-30"])).toBe("29.–30. märts 1920");
    expect(kuupaevadEesti(["1920-02-23", "1920-03-01"])).toBe("23. veebruar 1920 – 1. märts 1920");
    const v = koostaViide({ ...alus, kuupaevad: ["1920-03-29", "1920-03-30"], esimeneLk: "27", viimaneLk: "27" });
    expect(v).toContain("protokoll, 29.–30. märts 1920.");
    expect(v).toContain(", lk 27. Transkribus");
  });
});
