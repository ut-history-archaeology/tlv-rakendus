import { describe, expect, it } from "vitest";
import { loeAndmestik } from "./data";
import {
  allikaviiteKoosolek, isikuRead, koosseisuSyndmused, liikmekirjePuudub,
} from "./derive";
import type { Andmestik, Koosolek } from "./types";

function koosolek(koosolek_id: string, kuupaev: string): Koosolek {
  return {
    koosolek_id, kuupaev, kuupaev_lopp: "", nadalapaev: "", vorm: "", koosseis_id: "K", juhataja: "",
    koosseis_arv: null, kohal_arv: null, kohal_arv_2paev: null, kuupaev_txt: "", protokolli_algus_txt: "",
  };
}

/** Kaks protokolli samal päeval, jagatud kaader 243. */
function andmestik(): Andmestik {
  const prot = (koosolek_id: string, fail: string) => ({ koosolek_id, fail } as Andmestik["protokollid"][number]);
  return {
    isikud: [], koosseisud: [], juhatajad: [], muutused: [], valimised: [], osavott: [],
    paevakord: [], mainimised: [], nimekirjad: [], valimisnimekirjad: [],
    koosolekud: [koosolek("K1", "1930-09-08"), koosolek("K2", "1930-09-08"), koosolek("K3", "1930-09-29")],
    protokollid: [prot("K1", "a.json"), prot("K2", "b.json"), prot("K3", "c.json")],
    protokolliLehed: [
      { protokoll: "a.json", arhiiviviide: "ERA.1.2.3", lehekulg: "242" },
      { protokoll: "a.json", arhiiviviide: "ERA.1.2.3", lehekulg: "243" },
      { protokoll: "b.json", arhiiviviide: "ERA.1.2.3", lehekulg: "243" },
      { protokoll: "c.json", arhiiviviide: "ERA.1.2.3", lehekulg: "300" },
    ],
  };
}

describe("PA-07 protokolliviide → koosolek (TE4-06)", () => {
  it("säilik:kaader → üks koosolek", () => {
    expect(allikaviiteKoosolek(andmestik(), "ERA.1.2.3:300")).toEqual({ koosolek_id: "K3", kuupaev: "1930-09-29", kaader: "300" });
  });
  it("kaader kahes protokollis, kuupäev ei erista → null (ei arvata)", () => {
    expect(allikaviiteKoosolek(andmestik(), "ERA.1.2.3:243", ["1930-09-08"])).toBeNull();
    expect(allikaviiteKoosolek(andmestik(), "ERA.1.2.3:243")).toBeNull();
  });
  it("tundmatu kaader või kaadrita viide → null", () => {
    expect(allikaviiteKoosolek(andmestik(), "ERA.1.2.3:999")).toBeNull();
    expect(allikaviiteKoosolek(andmestik(), "ERA.1.2.3")).toBeNull();
  });

  const a = loeAndmestik();
  it("päris andmed: kõik 633 muutust leiavad koosoleku ja kuupäev klapib", () => {
    const leitud = a.muutused.map((m) => [m, allikaviiteKoosolek(a, m.allikaviide, [m.kuupaev])] as const);
    expect(leitud.filter(([, k]) => k === null)).toHaveLength(0);
    expect(leitud.filter(([m, k]) => k!.kuupaev !== m.kuupaev)).toHaveLength(0);
  });
  it("päris andmed: isik 96 17.02.1926 → selle päeva koosolek", () => {
    const m = a.muutused.find((x) => x.isik_id === 96 && x.kuupaev === "1926-02-17")!;
    const k = allikaviiteKoosolek(a, m.allikaviide, [m.kuupaev])!;
    expect(a.koosolekud.find((x) => x.koosolek_id === k.koosolek_id)!.kuupaev).toBe("1926-02-17");
    expect(k.kaader).toBe("40");
  });
  it("päris andmed: 1930-09-08 kahe koosoleku päeval → K175 (kaader 243)", () => {
    const s = koosseisuSyndmused(a, "1930-1934").filter((x) => x.kuupaev === "1930-09-08");
    expect(s.length).toBeGreaterThan(0);
    for (const x of s) expect(x.koosolekuViited?.map((k) => k?.koosolek_id)).toEqual(["K175"]);
  });
});

describe("PA-06 liikmeks saamise kirje puudub", () => {
  const a = loeAndmestik();
  it("isik 395 Bukk: tõendid, liikmelisust ei tuletata", () => {
    const t = liikmekirjePuudub(a, 395)!;
    expect(t).not.toBeNull();
    expect(t.osavotuKordi).toBeGreaterThan(0);
    const r = isikuRead(a).find((x) => x.isik_id === 395)!;
    expect(r.koosseise).toBe(0);
    expect(r.liikmekirje_puudub).toMatch(/protokollides nimetatud \d+ korda/);
  });
  it("tavaline kandidaat (0 koosseisu, tõenditeta) → null", () => {
    const kand = isikuRead(a).find((r) => r.koosseise === 0 && !r.liikmekirje_puudub);
    expect(kand).toBeDefined();
    expect(liikmekirjePuudub(a, kand!.isik_id)).toBeNull();
  });
  it("arv = KT-05a (19)", () => {
    expect(isikuRead(a).filter((r) => r.liikmekirje_puudub)).toHaveLength(19);
  });
});
