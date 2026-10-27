/**
 * TE-11 / TE-12: integratsioonitestid päris korpusega. Jäetakse vahele, kui korpus/json puudub.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { tootleProtokoll } from "./eeltootlus";
import type { KorpuseFail } from "./korpus";
import type { LeheRida } from "./lehed";

const JUUR = process.cwd();
const KORPUS = path.join(JUUR, "korpus", "json");
const korpusOlemas = fs.existsSync(KORPUS) && fs.existsSync(path.join(KORPUS, "1937-09-06.json"));

function csv(fail: string) {
  return Papa.parse<Record<string, string>>(fs.readFileSync(path.join(JUUR, "data", fail), "utf-8"), {
    header: true, skipEmptyLines: true,
  }).data;
}

describe.skipIf(!korpusOlemas)("TE-11 näidisfailid", () => {
  const tuntudIsikud = new Set(csv("isikud.csv").map((r) => Number(r.isik_id)));
  const lehed = csv("protokolli_lehed.csv");
  const vasted = JSON.parse(fs.readFileSync(path.join(JUUR, "scripts", "protokollid-vasted.json"), "utf-8")).vasted as Record<string, { koosolek_id: string }>;
  function tootle(fail: string, id: string) {
    const json = JSON.parse(fs.readFileSync(path.join(KORPUS, fail), "utf-8")) as KorpuseFail;
    const leheRead: LeheRida[] = lehed.filter((r) => r.protokoll === fail).map((r) => ({
      protokoll: r.protokoll, jrk: Number(r.jrk), arhiiviviide: r.arhiiviviide, lehekulg: r.lehekulg,
      xml_file: r.xml_file ?? "", pilt: r.pilt, transkribus_lk: Number(r.transkribus_lk), tekstita: r.tekstita === "1",
    }));
    return tootleProtokoll(json, { id, fail, tuntudIsikud, leheRead });
  }

  it("1937-09-06.json → 0 punkti, PER-olemeid, isik 128 kaks korda", () => {
    const { andmed } = tootle("1937-09-06.json", "K272");
    expect(andmed.paevakord).toHaveLength(0);
    expect(andmed.sissejuhatus).toEqual([0, andmed.tekst.length]);
    expect(andmed.lopuosa).toBeNull();
    const per = andmed.olemid.filter((o) => o.t === "PER");
    expect(per.length).toBe(18);
    expect(per.filter((o) => o.isik_id === 128 && o.kindlus === "kõrge")).toHaveLength(2);
    expect(per.some((o) => o.isik_id === 82 && o.kindlus === "mitmene")).toBe(true);
    expect(andmed.lehed).toHaveLength(1);
  });

  it("1920-02-29_1920-03-30.json → K026 (ülekirjutus), 20 punkti", () => {
    expect(vasted["1920-02-29_1920-03-30.json"].koosolek_id).toBe("K026");
    const { andmed } = tootle("1920-02-29_1920-03-30.json", "K026");
    expect(andmed.paevakord).toHaveLength(20);
    expect(andmed.kuupaevad).toEqual(["1920-02-29", "1920-03-30"]);
  });

  it("1930-09-08_2.json → K175 (11 punkti, 40 kõnet); 1925-06-25.json → K077", () => {
    expect(vasted["1930-09-08_2.json"].koosolek_id).toBe("K175");
    expect(vasted["1925-06-25.json"].koosolek_id).toBe("K077");
    const { andmed } = tootle("1930-09-08_2.json", "K175");
    expect(andmed.paevakord).toHaveLength(11);
    expect(andmed.koned).toHaveLength(40);
    expect(andmed.paevakord.map((p) => p.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("1940-11-13.json → K338 ja 1940-11-13_2.json → K329, mõlemal 0 kõnet", () => {
    expect(vasted["1940-11-13.json"].koosolek_id).toBe("K338");
    expect(vasted["1940-11-13_2.json"].koosolek_id).toBe("K329");
    const a = tootle("1940-11-13.json", "K338").andmed;
    const b = tootle("1940-11-13_2.json", "K329").andmed;
    expect(a.koned).toHaveLength(0);
    expect(b.koned).toHaveLength(0);
    expect(a.tekst.startsWith("Protokoll nr. 28.")).toBe(true);
    expect(b.tekst.startsWith("Protokoll nr. 29.")).toBe(true);
    expect(a.paevakord).toHaveLength(1);
    expect(b.paevakord).toHaveLength(2);
    expect(b.lisad).toHaveLength(1);
  });

  it("1930-10-27.json → 152 kõnet, 11 punkti; mitmetükilisi kõnesid on", () => {
    const { andmed } = tootle("1930-10-27.json", "K178");
    expect(andmed.koned).toHaveLength(152);
    expect(andmed.paevakord).toHaveLength(11);
    expect(andmed.koned.filter((k) => k.tykid.length > 1).length).toBeGreaterThan(0);
  });

  it("1937-03-22.json → 7 punkti, 4 lisa, 52 tabelit, 93 lehte (lk 106 tekstita)", () => {
    const { andmed } = tootle("1937-03-22.json", "K266");
    expect(andmed.paevakord).toHaveLength(7);
    expect(andmed.lisad).toHaveLength(4);
    expect(andmed.tabelid).toHaveLength(52);
    expect(andmed.lehed).toHaveLength(93);
    expect(andmed.lehed.find((l) => l.lk === "106")?.tekstita).toBe(true);
    // normid: 1937. a tekstis muutub < 1 % sõnadest
    expect(andmed.normid.length / andmed.statistika.sonu).toBeLessThan(0.01);
  });

  it("K004 (1918-12-04): lehed 112–117 ↔ Transkribus 26–31; K143 lk 38 tekstita; K225 134/134a/134b sama pilt", () => {
    const k004 = tootle("1918-12-04.json", "K004").andmed;
    expect(k004.lehed.map((l) => l.lk)).toEqual(["112", "113", "114", "115", "116", "117"]);
    expect(k004.lehed.map((l) => l.transkribus_lk)).toEqual([26, 27, 28, 29, 30, 31]);
    expect(k004.arhiiviviide).toBe("ERA.2966.2.57");
    const k143 = tootle("1928-02-24.json", "K143").andmed;
    expect(k143.lehed).toHaveLength(8);
    expect(k143.lehed[3]).toMatchObject({ lk: "38", tekstita: true, algus: null });
    const k225 = tootle("1934-04-30.json", "K225").andmed;
    const jag = k225.lehed.filter((l) => l.jagatud);
    expect(jag.map((l) => l.lk)).toEqual(["134", "134a", "134b"]);
    expect(new Set(jag.map((l) => l.pilt)).size).toBe(1);
    expect(new Set(jag.map((l) => l.transkribus_lk)).size).toBe(1);
  });

  it("1918-12-04: moderniseeritud kuju algab 'Tartu linnavolikogu erakorraline koosolek'", () => {
    const { andmed } = tootle("1918-12-04.json", "K004");
    expect(andmed.tekst.toLowerCase().startsWith("tartu linnawolikogu")).toBe(true);
    const n = andmed.normid.find((x) => x[0] === andmed.tekst.indexOf("linnawolikogu"));
    expect(n?.[2]).toBe("linnavolikogu");
  });
});

const valjundOlemas = fs.existsSync(path.join(JUUR, "public", "protokollid", "_meta.json")) && fs.existsSync(path.join(JUUR, "data", "protokollid.csv"));

describe.skipIf(!valjundOlemas)("TE-12 kogu korpus (eeltöötluse väljund)", () => {
  const meta = JSON.parse(fs.readFileSync(path.join(JUUR, "public", "protokollid", "_meta.json"), "utf-8"));
  const protokollid = csv("protokollid.csv");
  const koosolekud = csv("koosolekud.csv");

  it("337 faili → 337 seotud; K336 ilma protokollita; iga koosolek ≤ 1 protokoll", () => {
    expect(meta.korpuse_faile).toBe(337);
    expect(meta.protokolle).toBe(337);
    const seotud = protokollid.filter((r) => r.fail);
    expect(seotud).toHaveLength(337);
    expect(protokollid.filter((r) => !r.fail).map((r) => r.koosolek_id)).toEqual(["K336"]);
    expect(protokollid.find((r) => r.koosolek_id === "K336")?.markus).toContain("ärakiri K335-st");
    expect(new Set(seotud.map((r) => r.koosolek_id)).size).toBe(337);
    expect(new Set(seotud.map((r) => r.fail)).size).toBe(337);
    expect(koosolekud).toHaveLength(338);
  });

  it("paevakorrapunktid.csv 3511 rida; protokolli_mainimised.csv isikud ⊂ isikud.csv", () => {
    expect(csv("paevakorrapunktid.csv")).toHaveLength(3511);
    const isikud = new Set(csv("isikud.csv").map((r) => r.isik_id));
    const m = csv("protokolli_mainimised.csv");
    expect(m.length).toBeGreaterThan(5000);
    expect(m.every((r) => isikud.has(r.isik_id))).toBe(true);
  });

  it("lehed: 7121 kirjet, 7093 tekstiga, 28 tekstita 23 protokollis; K266 93 lehte", () => {
    const lehti = protokollid.reduce((s, r) => s + (Number(r.lehekylgi) || 0), 0);
    const tekstita = protokollid.reduce((s, r) => s + (Number(r.lehekylgi_tekstita) || 0), 0);
    expect(lehti).toBe(7121);
    expect(tekstita).toBe(28);
    expect(lehti - tekstita).toBe(7093);
    expect(protokollid.filter((r) => Number(r.lehekylgi_tekstita) > 0)).toHaveLength(23);
    expect(protokollid.find((r) => r.koosolek_id === "K266")?.lehekylgi).toBe("93");
  });

  it("1930-09-08 ja 1940-11-13 on kahel real; K026 kuupäev parandatud; K077 märkusega", () => {
    expect(protokollid.filter((r) => r.kuupaev_1 === "1930-09-08").map((r) => r.koosolek_id).sort()).toEqual(["K174", "K175"]);
    expect(protokollid.filter((r) => r.kuupaev_1 === "1940-11-13").map((r) => r.koosolek_id).sort()).toEqual(["K329", "K338"]);
    const k026 = protokollid.find((r) => r.koosolek_id === "K026")!;
    expect(k026.kuupaev_1).toBe("1920-03-29");
    expect(k026.kuupaev_2).toBe("1920-03-30");
    expect(protokollid.find((r) => r.koosolek_id === "K077")?.markus).toContain("1925-06-25");
  });

  it("väljundi kogumaht (ilma piltideta) < 50 MB; 24 otsingukildu; iga pilt mõlemas kaustas", () => {
    const kaust = path.join(JUUR, "public", "protokollid");
    let baite = 0;
    for (const f of fs.readdirSync(kaust)) {
      const p = path.join(kaust, f);
      if (fs.statSync(p).isFile()) baite += fs.statSync(p).size;
    }
    for (const f of fs.readdirSync(path.join(kaust, "otsing"))) baite += fs.statSync(path.join(kaust, "otsing", f)).size;
    expect(baite).toBeLessThan(50 * 1024 * 1024);
    expect(meta.killud).toHaveLength(24);
    expect(meta.killud[0]).toBe(1918);
    expect(meta.killud[23]).toBe(1941);
    const pildid = path.join(JUUR, "public", "pildid");
    if (fs.existsSync(pildid)) {
      const lehed = csv("protokolli_lehed.csv");
      const puudu = lehed.filter((r) => !fs.existsSync(path.join(pildid, "1200", r.pilt)) || !fs.existsSync(path.join(pildid, "300", r.pilt)));
      expect(puudu).toHaveLength(0);
    }
  });

  it("sorteerimine sõnade järgi: esimene on 1934-08-27 või 1931-03-30 (PT-01 aktsepteerimine)", () => {
    const top = [...protokollid].filter((r) => r.sonu).sort((a, b) => Number(b.sonu) - Number(a.sonu))[0];
    expect(["1934-08-27", "1931-03-30"]).toContain(top.kuupaev_1);
    expect(protokollid.filter((r) => r.kuupaev_1 >= "1930-01-01" && r.kuupaev_1 <= "1930-12-31")).toHaveLength(16);
    expect(protokollid.filter((r) => r.fail && r.kuupaev_1 >= "1940-08-01")).toHaveLength(29);
  });
});
