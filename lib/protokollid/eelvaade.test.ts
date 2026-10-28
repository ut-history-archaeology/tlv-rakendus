import { describe, expect, it } from "vitest";
import { punktiEelvaade } from "./eelvaade";

describe("punktiEelvaade (UX-11)", () => {
  const tekst = "II.\nWalimised.\nKoosolek walib  kolm liiget.\nTeine lause.";
  const k = tekst.indexOf("Koosolek");
  const t = tekst.indexOf("Teine");
  const laused: [number, number][] = [[0, k - 1], [k, t - 1], [t, tekst.length]];
  it("esimene lause pealkirja järel, tühikud ühtlustatud", () => {
    expect(punktiEelvaade(tekst, laused, { algus: 0, lopp: tekst.length, pealkiri: [0, k - 1] })).toBe("Koosolek walib kolm liiget.");
  });
  it("pikk lause lõigatakse ≤ max märgini", () => {
    const e = punktiEelvaade(tekst, laused, { algus: 0, lopp: tekst.length, pealkiri: [0, k - 1] }, 20);
    expect(e.length).toBeLessThanOrEqual(20);
    expect(e.endsWith("…")).toBe(true);
  });
  it("pealkirja järel teksti pole → tühi", () => {
    expect(punktiEelvaade(tekst, laused, { algus: 0, lopp: k - 1, pealkiri: [0, k - 1] })).toBe("");
  });
});
