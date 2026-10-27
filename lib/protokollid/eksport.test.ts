import { describe, expect, it } from "vitest";
import { ekspordiFailinimi, koostaJsonMeta, koostaMarkdown, koostaTxt } from "./eksport";
import type { ProtokollAndmed } from "./types";

const tekst = "Tartu linnawolikogu koosolek.\nJuhatab Olesk.\nI.\nPäewakorra kinnitamine.\nOlesk: Kinnitame.\nKinnitatud.\nII.\nProtokoll.\nLoetud.\nKoosolek lõppes.\nLisa tekst.";
const i = (s: string) => tekst.indexOf(s);
const p: ProtokollAndmed = {
  id: "K1", fail: "1920-01-01.json", kuupaevad: ["1920-01-01"], transkribus_url: "https://x/document/1/pages/5",
  arhiiviviide: "ERA.2966.2.60", tekst,
  sissejuhatus: [0, i("I.\n")],
  paevakord: [
    { nr: 1, jrk: 1, algus: i("I.\n"), lopp: i("II.\n"), pealkiri: [i("I.\n"), i("kinnitamine.") + 12] },
    { nr: 2, jrk: 2, algus: i("II.\n"), lopp: i("Koosolek lõppes."), pealkiri: [i("II.\n"), i("Protokoll.") + 10] },
  ],
  lopuosa: [i("Koosolek lõppes."), i("Lisa tekst.")],
  lisad: [{ algus: i("Lisa tekst."), lopp: tekst.length, kirjeldus: "Kiri linnavalitsusele" }],
  tabelid: [], laused: [], olemid: [],
  koned: [{ koneleja: [i("Olesk: K"), i("Olesk: K") + 5], nimi: "Olesk", tykid: [[i("Kinnitame."), i("Kinnitame.") + 10]], isik_id: 116, kandidaadid: [116], kindlus: "kõrge" }],
  normid: [[6, 19, "linnavolikogu"], [i("Päewakorra"), i("Päewakorra") + 10, "Päevakorra"]],
  lehed: [
    { jrk: 1, lk: "27", arhiiviviide: "ERA.2966.2.60", algus: 0, lopp: 50, pilt: "1920/0060_027.png", transkribus_lk: 5, tekstita: false, jagatud: false, loend: false },
    { jrk: 2, lk: "28", arhiiviviide: "ERA.2966.2.60", algus: 50, lopp: tekst.length, pilt: "1920/0060_028.png", transkribus_lk: 6, tekstita: false, jagatud: false, loend: false },
  ],
  statistika: { sonu: 20, lauseid: 9, paevakorrapunkte: 2, olemeid: 0, olemeid_PER: 0, seotud_isikuid: 0, konesid: 1, lehekylgi: 2, lehekylgi_tekstita: 0, lisasid: 1, tabeleid: 0, tekst_kb: 0.2 },
};
const ctx = { kuupaevad: ["1920-01-01"], url: "https://x/protokollid/K1/", kirjakuju: "ajalooline" as const, aeg: "2026-10-27T10:00:00.000Z" };

describe("TE-10 eksport", () => {
  it("markdownis on `## <nr>. <pealkiri>` iga punkti kohta, sissejuhatus, lõpuosa, lisa ja kõne", () => {
    const md = koostaMarkdown(p, ctx);
    expect(md.startsWith("# Protokoll 1. jaanuar 1920\n")).toBe(true);
    expect(md).toContain("## Sissejuhatus");
    expect(md).toContain("## 1. Päewakorra kinnitamine.");
    expect(md).toContain("## 2. Protokoll.");
    expect(md).toContain("## Lõpuosa");
    expect(md).toContain("## Lisa: Kiri linnavalitsusele");
    expect(md).toContain("**Olesk:** Kinnitame.");
    expect((md.match(/^## \d+\. /gm) ?? []).length).toBe(p.paevakord.length);
    expect(md).toContain("- Arhiiviviide: ERA.2966.2.60, lk 27–28");
  });
  it("moderniseeritud kuju muudab teksti ja pealkirja, kõne jääb õigele kohale", () => {
    const md = koostaMarkdown(p, { ...ctx, kirjakuju: "moderniseeritud" });
    expect(md).toContain("## 1. Päevakorra kinnitamine.");
    expect(md).toContain("Tartu linnavolikogu koosolek.");
    expect(md).toContain("**Olesk:** Kinnitame.");
    expect(md).toContain("- Kirjakuju: moderniseeritud");
  });
  it("txt päises on arhiiviviide, Transkribus, allikas ja kirjakuju; tekst muutmata reavahetustega", () => {
    const txt = koostaTxt(p, ctx);
    expect(txt).toContain("Arhiiviviide: ERA.2966.2.60, lk 27–28");
    expect(txt).toContain("Transkribus: https://x/document/1/pages/5");
    expect(txt).toContain("Allikas: Tartu Linnavolikogu andmestik, 2026");
    expect(txt).toContain("Kirjakuju: ajalooline");
    expect(txt.endsWith("\n\n" + tekst + "\n")).toBe(true);
    expect(koostaTxt(p, { ...ctx, kirjakuju: "moderniseeritud" })).toContain("Tartu linnavolikogu koosolek.\nJuhatab");
  });
  it("JSON meta.kirjakuju ja margendus; failinimi EX-07", () => {
    const meta = koostaJsonMeta(p, ctx);
    expect(meta.kirjakuju).toBe("ajalooline");
    expect(meta.margendus).toContain("automaatne");
    expect(meta.allikas).toBe("Tartu Linnavolikogu andmestik, 2026");
    expect(ekspordiFailinimi("K174", "1930-09-08", "md", "2026-10-27")).toBe("tlv-protokoll-K174-1930-09-08-2026-10-27.md");
  });
  it("ilma punktideta protokoll → '## Protokolli tekst' + märge", () => {
    const md = koostaMarkdown({ ...p, paevakord: [], lopuosa: null, sissejuhatus: [0, tekst.length], koned: [] }, ctx);
    expect(md).toContain("## Protokolli tekst");
    expect(md).toContain("Päevakorrapunkte selles protokollis ei ole eristatud");
  });
});
