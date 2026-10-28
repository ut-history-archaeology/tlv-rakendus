import { describe, expect, it } from "vitest";
import { aklKuva, wikidataQid } from "./format";

describe("wikidataQid (TE3-01)", () => {
  it("tunneb ära kõik sisendkujud", () => {
    expect(wikidataQid("Q1")).toBe("Q1");
    expect(wikidataQid("https://www.wikidata.org/wiki/Q1")).toBe("Q1");
    expect(wikidataQid("http://www.wikidata.org/entity/Q1")).toBe("Q1");
    expect(wikidataQid(" Q1 ")).toBe("Q1");
    expect(wikidataQid("https://www.wikidata.org/wiki/Q12370898")).toBe("Q12370898");
  });
  it("prügi → tühi", () => {
    expect(wikidataQid("")).toBe("");
    expect(wikidataQid("abc")).toBe("");
    expect(wikidataQid("n/a")).toBe("");
    expect(wikidataQid(null)).toBe("");
    expect(wikidataQid("https://example.org/wiki/Q1")).toBe("");
  });
});

describe("aklKuva", () => {
  it("eemaldab ujukoma-saba", () => {
    expect(aklKuva("36.0")).toBe("36");
    expect(aklKuva("48")).toBe("48");
    expect(aklKuva("")).toBe("");
  });
});
