import { describe, expect, it } from "vitest";
import { mainimisteRead } from "./mainimised";
import type { Olem } from "./types";

const o = (a: number, isik_id: number | null, kindlus: Olem["kindlus"], kandidaadid: number[] = isik_id ? [isik_id] : [], t: Olem["t"] = "PER"): Olem =>
  ({ a, l: a + 5, t, isik_id, kandidaadid, kindlus });

describe("TE-13 mainimiste agregaat (ET-08)", () => {
  it("loeb isik × protokoll × kindlus read", () => {
    const read = mainimisteRead("K174", "1930-09-08", [
      o(0, 128, "kõrge"), o(10, 128, "kõrge"), o(20, 128, "keskmine"),
      o(30, 82, "mitmene"),                    // "82;None" → mitmene
      o(40, null, "mitmene", [38, 39]),        // mitu kandidaati → ei loe
      o(50, null, "puudub"),                   // sidumata
      o(60, null, null, [], "ORG"),
    ]);
    expect(read).toEqual([
      { isik_id: 82, koosolek_id: "K174", kuupaev: "1930-09-08", kindlus: "mitmene", arv: 1 },
      { isik_id: 128, koosolek_id: "K174", kuupaev: "1930-09-08", kindlus: "keskmine", arv: 1 },
      { isik_id: 128, koosolek_id: "K174", kuupaev: "1930-09-08", kindlus: "kõrge", arv: 2 },
    ]);
  });
  it("kõneleja-olem loetakse üks kord (kõnet eraldi ei anta)", () => {
    expect(mainimisteRead("K1", "1930-01-01", [o(0, 5, "kõrge")])[0].arv).toBe(1);
  });
});
