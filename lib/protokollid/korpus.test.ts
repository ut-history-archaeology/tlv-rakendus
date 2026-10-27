import { describe, expect, it } from "vitest";
import { onSona, puhastaPealkiri, transkribusLehenumber, vahemik } from "./korpus";

describe("TE-06 base_span teisendus", () => {
  it("[[a,b],[c,d]] → [a,d]", () => expect(vahemik([[0, 5], [6, 19]])).toEqual([0, 19]));
  it("[[a,b]] → [a,b]", () => expect(vahemik([[85, 93]])).toEqual([85, 93]));
  it("[a,b] → [a,b]", () => expect(vahemik([592, 2160])).toEqual([592, 2160]));
});

describe("TE-14 päevakorrapunkti pealkiri", () => {
  it('"1. Protokoll." → "Protokoll."', () => expect(puhastaPealkiri("1. Protokoll.")).toBe("Protokoll."));
  it('"I.\\nWolikogu juhataja awasõna" → ilma numbrita', () =>
    expect(puhastaPealkiri("I.\nWolikogu juhataja awasõna")).toBe("Wolikogu juhataja awasõna"));
  it("pealkiri ilma numbrita jääb samaks", () => expect(puhastaPealkiri("Protokoll.")).toBe("Protokoll."));
  it("liidetud numbrid: '3 ja 4.' ja 'II. ja III.'", () => {
    expect(puhastaPealkiri("3 ja 4.\nRiigikogu walimise komitee")).toBe("Riigikogu walimise komitee");
    expect(puhastaPealkiri("II. ja III.\nLinnavalitsuse ühe liikme valimine")).toBe("Linnavalitsuse ühe liikme valimine");
    expect(puhastaPealkiri("4. ja 5.\nMarie Gerardi' küsimus")).toBe("Marie Gerardi' küsimus");
  });
  it("ainult numbrist koosnev pealkiri jääb alles", () => expect(puhastaPealkiri("12.")).toBe("12."));
  it("'Isikud' ei ole rooma number", () => expect(puhastaPealkiri("Isikud ja asjad")).toBe("Isikud ja asjad"));
});

describe("abifunktsioonid", () => {
  it("onSona: kirjavahemärgid välja (E-03)", () => {
    expect(onSona("wolikogu")).toBe(true);
    expect(onSona("22.")).toBe(true);
    expect(onSona(".")).toBe(false);
    expect(onSona("—")).toBe(false);
  });
  it("transkribusLehenumber", () => {
    expect(transkribusLehenumber("https://rahvusarhiiv.transkribus.eu/document/3016346/pages/26")).toBe(26);
    expect(transkribusLehenumber("https://x/doc/1")).toBeNull();
  });
});
