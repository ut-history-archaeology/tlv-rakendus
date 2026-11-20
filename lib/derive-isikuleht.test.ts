import { describe, expect, it } from "vitest";
import { loeAndmestik } from "./data";
import {
  ajaluguJarjestus, isikuAjalugu, koosseisuRibaLoigud, osalemine, type AjaluguKirje,
} from "./derive";
import { kuupaevadLyhike } from "./format";
import { isikuViide } from "./isikuviide";

const a = loeAndmestik();

describe("kuupaevadLyhike (PR5-03)", () => {
  it("kujud", () => {
    expect(kuupaevadLyhike(["1926-12-18", "1926-12-19"])).toBe("18.–19.12.1926");
    expect(kuupaevadLyhike(["1927-02-07"])).toBe("07.02.1927");
    expect(kuupaevadLyhike(["1927-02-07", "1927-02-07"])).toBe("07.02.1927");
    expect(kuupaevadLyhike(["1926-11-30", "1926-12-01"])).toBe("30.11.–01.12.1926");
    expect(kuupaevadLyhike(["1926-12-31", "1927-01-01"])).toBe("31.12.1926–01.01.1927");
    expect(kuupaevadLyhike(["1926"])).toBe("1926");
    expect(kuupaevadLyhike([])).toBe("");
  });
});

describe("TE5-03 koosseisuRibaLoigud", () => {
  it("9 lõiku, igaühel täidetud (0…1), algus, lõpp ja silt", () => {
    const l = koosseisuRibaLoigud(a, 6);
    expect(l).toHaveLength(9);
    for (const x of l) {
      expect(x.taidetud).toBeGreaterThanOrEqual(0);
      expect(x.taidetud).toBeLessThanOrEqual(1);
      expect(x.algus).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(x.lopp >= x.algus).toBe(true);
      expect(x.silt).toMatch(/^\d{4}(–\d{4})?: /);
    }
  });

  it("Allik (6): 6 lõigul > 0, 1924–1926 < 0,05 (15.01.–28.01.1924)", () => {
    const l = koosseisuRibaLoigud(a, 6);
    expect(l.filter((x) => x.taidetud > 0)).toHaveLength(6);
    const k = l.find((x) => x.koosseis_id === "1924-1926")!;
    expect(k.taidetud).toBeGreaterThan(0);
    expect(k.taidetud).toBeLessThan(0.05);
    expect(k.osad[0].vasak).toBe(0);
    expect(k.silt).toBe("1924–1926: liige 15.01.1924–28.01.1924");
    expect(l.find((x) => x.koosseis_id === "1934-1939")!.silt).toBe("1934–1939: ei olnud liige");
  });

  it("Mekkart (96): 1927–1929 osaliselt (PA-09)", () => {
    const k = koosseisuRibaLoigud(a, 96).find((x) => x.koosseis_id === "1927-1929")!;
    expect(k.taidetud).toBeGreaterThan(0);
    expect(k.taidetud).toBeLessThan(1);
  });

  it("Bukk (395, PA-06): ükski lõik pole täidetud", () => {
    expect(koosseisuRibaLoigud(a, 395).every((x) => x.taidetud === 0)).toBe(true);
  });
});

describe("TE5-04 isikuAjalugu", () => {
  const ajalugu = (id: number) => isikuAjalugu(a, id);
  const kpv = (k: AjaluguKirje) => k.kuupaev;

  it("Allik (6): valimised ja muutused ühes loendis kuupäeva järgi, 20.08.1917 … 24.01.1930", () => {
    const l = ajalugu(6);
    expect(l.length).toBeGreaterThanOrEqual(10);
    expect(l.map(kpv)).toEqual([...l.map(kpv)].sort());
    expect(l[0].kuupaev).toBe("1917-08-20");
    expect(l[l.length - 1].kuupaev).toBe("1930-01-24");
    expect(l.some((k) => k.liik === "valimised")).toBe(true);
    expect(l.some((k) => k.liik === "syndmus")).toBe(true);
    const v1926 = l.find((k) => k.liik === "valimised" && k.kirje.aasta === 1926)!;
    expect(v1926.liik === "valimised" && v1926.kuupaevad).toEqual(["1926-12-18", "1926-12-19"]);
  });

  it("Allik 28.01.1924: lahkumine, asemele Massakas, koosolek ja ERA.2966.2.64a:10", () => {
    const k = ajalugu(6).find((x) => x.kuupaev === "1924-01-28")!;
    expect(k.liik).toBe("syndmus");
    if (k.liik !== "syndmus") return;
    const s = k.syndmus;
    expect(s.liik === "vahetus" ? s.lahkuja : s.liik === "lahkumine" ? s.isik : null).toBe(6);
    expect(s.allikaviited).toContain("ERA.2966.2.64a:10");
    expect(s.koosolekuViited?.[0]).not.toBeNull();
  });

  it("valimised enne kinnitamist samal kuupäeval", () => {
    const v = ajalugu(6).find((k) => k.liik === "valimised")!;
    const s = ajalugu(6).find((k) => k.liik === "syndmus")!;
    const samaPaev = { ...s, kuupaev: v.kuupaev } as AjaluguKirje;
    expect([samaPaev, v].sort(ajaluguJarjestus)[0].liik).toBe("valimised");
  });

  it("valitud vs 'Kandideeris' (valitud-rida puudub)", () => {
    const allik = ajalugu(6).filter((k) => k.liik === "valimised");
    expect(allik.every((k) => k.liik === "valimised" && k.valitud)).toBe(true);
    const bukk = ajalugu(395).filter((k) => k.liik === "valimised");
    expect(bukk).toHaveLength(1);
    expect(bukk[0].liik === "valimised" && bukk[0].valitud).toBe(false);
    // kandidaadi ainus viide = kandidaatide allikas
    expect(bukk[0].liik === "valimised" && bukk[0].allikas.allikas).toBe("kandidaadid");
  });

  it("valitu ainus viide = tulemuste allikas", () => {
    const v = ajalugu(6).find((k) => k.liik === "valimised")!;
    expect(v.liik === "valimised" && v.allikas.allikas).toBe("tulemused");
  });

  it("Mekkart (96): liitumine&lahkumine 07.02.1927 üks rida", () => {
    expect(ajalugu(96).filter((k) => k.kuupaev === "1927-02-07")).toHaveLength(1);
  });
});

describe("PR5-04 osalemine (tuletatud)", () => {
  it("osales ≤ liige; Allik oli liige mitmel koosolekul", () => {
    const o = osalemine(a, 6);
    expect(o.liige).toBeGreaterThan(0);
    expect(o.osales).toBeLessThanOrEqual(o.liige);
    expect(osalemine(a, 395)).toEqual({ osales: 0, liige: 0 });
  });
});

describe("isikuViide (Kopeeri viide)", () => {
  it("kuju", () => {
    expect(isikuViide({ nimi: "Oskar Allik", leheUrl: "https://x/tlv-rakendus/isikud/6/", vaadatud: "2026-11-20" }))
      .toBe("Oskar Allik. Tartu Linnavolikogu andmestik, 2026, https://x/tlv-rakendus/isikud/6/ (vaadatud 20. november 2026).");
  });
});
