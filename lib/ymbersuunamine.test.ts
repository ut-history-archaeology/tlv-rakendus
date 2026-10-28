import { describe, expect, it } from "vitest";
import { protokollideNimekirjaUusUrl } from "./ymbersuunamine";

describe("protokollideNimekirjaUusUrl (TE3-07)", () => {
  it("säilitab location.search ja lisab #otsing", () => {
    expect(protokollideNimekirjaUusUrl("?q=walimine&algus=1930-01-01")).toBe(
      "/koosolekud/?q=walimine&algus=1930-01-01#otsing"
    );
  });
  it("ilma parameetriteta", () => {
    expect(protokollideNimekirjaUusUrl("")).toBe("/koosolekud/#otsing");
    expect(protokollideNimekirjaUusUrl("?")).toBe("/koosolekud/#otsing");
  });
});
