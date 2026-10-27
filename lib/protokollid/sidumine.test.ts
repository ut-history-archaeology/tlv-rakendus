import { describe, expect, it } from "vitest";
import { parsiCouncilMemberId, parsiIdd, seoKoneleja } from "./sidumine";
import type { Olem } from "./types";

const tuntud = new Set([38, 39, 82, 128, 258, 290, ...Array.from({ length: 30 }, (_, i) => i + 1)]);

describe("TE-02 SD-02: council_member_id → sidumine", () => {
  it('"None" + no_match (PER) → puudub', () => {
    expect(parsiCouncilMemberId("None", "PER", "no_match", tuntud)).toEqual({ isik_id: null, kandidaadid: [], kindlus: "puudub" });
  });
  it('"None" + not_per (ORG) → kindlus null', () => {
    expect(parsiCouncilMemberId("None", "ORG", "not_per", tuntud)).toEqual({ isik_id: null, kandidaadid: [], kindlus: null });
  });
  it('"128" + exact → kõrge, isik 128', () => {
    expect(parsiCouncilMemberId("128", "PER", "exact", tuntud)).toEqual({ isik_id: 128, kandidaadid: [128], kindlus: "kõrge" });
    expect(parsiCouncilMemberId("128", "PER", "exact;context_exact", tuntud).kindlus).toBe("kõrge");
  });
  it('"128" + exact;ocrmistake või levenshtein_fuzzy → keskmine', () => {
    expect(parsiCouncilMemberId("128", "PER", "exact;ocrmistake", tuntud).kindlus).toBe("keskmine");
    expect(parsiCouncilMemberId("128", "PER", "ambiguous_surname;levenshtein_fuzzy", tuntud).kindlus).toBe("keskmine");
  });
  it('"82;None" → isik 82, mitmene (registriväline)', () => {
    expect(parsiCouncilMemberId("82;None", "PER", "ambiguous_exact", tuntud)).toEqual({ isik_id: 82, kandidaadid: [82], kindlus: "mitmene" });
  });
  it('"38;39;None" → isik null, kandidaadid [38,39], mitmene', () => {
    expect(parsiCouncilMemberId("38;39;None", "PER", "ambiguous_exact", tuntud)).toEqual({ isik_id: null, kandidaadid: [38, 39], kindlus: "mitmene" });
  });
  it('"258;290" → [258,290]', () => {
    expect(parsiCouncilMemberId("258;290", "PER", "ambiguous_exact", tuntud).kandidaadid).toEqual([258, 290]);
  });
  it("27 ID-d → puudub, kandidaadid []", () => {
    const cm = Array.from({ length: 27 }, (_, i) => i + 1).join(";") + ";None";
    expect(parsiCouncilMemberId(cm, "PER", "ambiguous_firstname;levenshtein_fuzzy", tuntud)).toEqual({ isik_id: null, kandidaadid: [], kindlus: "puudub" });
  });
  it("tundmatu ID → viga; tundmatu kuju → viga", () => {
    expect(() => parsiCouncilMemberId("999", "PER", "exact", tuntud)).toThrow(/999 puudub/);
    expect(() => parsiIdd("abc")).toThrow(/tundmatu/);
  });
});

function olem(a: number, l: number, isik_id: number | null, t: Olem["t"] = "PER"): Olem {
  return { a, l, t, isik_id, kandidaadid: isik_id ? [isik_id] : [], kindlus: t === "PER" ? (isik_id ? "kõrge" : "puudub") : null };
}

describe("TE-03 SD-03: kõneleja ↔ PER-olem", () => {
  it("kattuv PER-olem → sama sidumine", () => {
    expect(seoKoneleja([10, 20], [olem(10, 20, 128)])).toEqual({ isik_id: 128, kandidaadid: [128], kindlus: "kõrge" });
    expect(seoKoneleja([12, 18], [olem(10, 20, 128)]).isik_id).toBe(128);
  });
  it("kaks kattuvat → pikim kattuvus", () => {
    expect(seoKoneleja([10, 20], [olem(5, 12, 1), olem(11, 20, 2)]).isik_id).toBe(2);
  });
  it("kattuvust pole → sidumata; ORG-olemit ei arvestata; naabrus (0 märki) ei loe", () => {
    expect(seoKoneleja([10, 20], [olem(30, 40, 1)])).toEqual({ isik_id: null, kandidaadid: [], kindlus: "puudub" });
    expect(seoKoneleja([10, 20], [olem(10, 20, null, "ORG")]).kindlus).toBe("puudub");
    expect(seoKoneleja([10, 20], [olem(20, 30, 1)]).isik_id).toBeNull();
  });
});
