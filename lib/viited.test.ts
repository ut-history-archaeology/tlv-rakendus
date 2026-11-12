import { describe, expect, it } from "vitest";
import { arhiiviLingid, arhiiviUrl } from "./viited";

describe("arhiiviUrl (TE4-08, PA-10)", () => {
  it("säilik ja kaader", () => {
    expect(arhiiviUrl("EAA.1211.1.158:1")).toBe("https://www.ra.ee/dgs/_purl.php?shc=EAA.1211.1.158:1");
    expect(arhiiviUrl("ERA.2966.2.57:112")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.57:112");
  });
  it("säilik ilma kaadrita", () => {
    expect(arhiiviUrl("ERA.2966.2.200")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.200");
    expect(arhiiviUrl("ERA.2966.2.64a")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.64a");
  });
  it("vahemik → esimene kaader", () => {
    expect(arhiiviUrl("ERA.2966.2.74:339–387")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.74:339");
    expect(arhiiviUrl("ERA.5130.4.481>817")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.5130.4.481:817");
  });
  it("jagatud leht 134a → kaader 134", () => {
    expect(arhiiviUrl("ERA.2966.2.83:134a")).toBe("https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.83:134");
  });
  it("tühi või tundmatu → null", () => {
    expect(arhiiviUrl("")).toBeNull();
    expect(arhiiviUrl("Riigi Teataja, nr. 6")).toBeNull();
  });
  it("mitu viidet lahtris → mitu linki", () => {
    expect(arhiiviLingid("ERA.5130.4.422:473;ERA.4414.2.1257:7")).toEqual([
      { tekst: "ERA.5130.4.422:473", url: "https://www.ra.ee/dgs/_purl.php?shc=ERA.5130.4.422:473" },
      { tekst: "ERA.4414.2.1257:7", url: "https://www.ra.ee/dgs/_purl.php?shc=ERA.4414.2.1257:7" },
    ]);
    expect(arhiiviLingid("ERA.2966.2.202,EAA.2111.1.13617").map((l) => l.url)).toEqual([
      "https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.202",
      "https://www.ra.ee/dgs/_purl.php?shc=EAA.2111.1.13617",
    ]);
    expect(arhiiviLingid("")).toEqual([]);
  });
});
