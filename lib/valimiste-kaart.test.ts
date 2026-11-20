import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ValimiseAllikad from "@/components/ValimiseAllikad";
import IsikuAjalugu from "@/components/IsikuAjalugu";
import { isikuAjalugu, isikuValimisedKoos } from "./derive";
import { loeAndmestik } from "./data";
import { taisnimi } from "./format";

const a = loeAndmestik();

/**
 * TE4-04 / VK-03: renderduses viide puudu → jämedas kirjas "VIIDE PUUDU", URL → link.
 * 5. etapp: VK-03 vaade on isiku ajaloos "allikad" all (ValimiseAllikad), aadressita (PR5-01).
 */
describe("valimiste allikate renderdus (VK-03, PR5-03)", () => {
  const kirje = isikuValimisedKoos(a, 6).find((k) => k.aasta === 1917)!;
  const html = renderToStaticMarkup(createElement(ValimiseAllikad, { k: kirje }));

  it("venekeelse nimekirja väärtused: <strong>VIIDE PUUDU</strong>", () => {
    expect(html).toMatch(/<strong[^>]*>VIIDE PUUDU<\/strong>/);
    expect(html).toContain("конторщикъ");
  });

  it("eestikeelse allika viide on link DIGAR-i", () => {
    expect(html).toMatch(/<a href="https:\/\/dea\.digar\.ee\/article\/ekmteataja\/1917\/08\/31\/3"[^>]*>Eestimaa Kubermangu Teataja/);
  });

  it("aadressi ei kuvata (andmetes on, nt Толстого 10)", () => {
    expect(kirje.aadress.map((x) => x.vaartus).join(" ")).toContain("Толстого");
    expect(html).not.toContain("Толстого");
    expect(html).not.toContain("Aadress");
  });
});

describe("isiku ajaloo renderdus (PR5-03), Allik (6)", () => {
  const nimed = Object.fromEntries(a.isikud.map((i) => [i.isik_id, taisnimi(i)]));
  const html = renderToStaticMarkup(createElement(IsikuAjalugu, { kirjed: isikuAjalugu(a, 6), isikId: 6, nimed }));

  it("28.01.1924: Lahkus, asemele Mihkel Massakas + koosolek + ERA.2966.2.64a:10 lingina", () => {
    const rida = html.split("<li").find((r) => r.includes("28.01.1924"))!;
    expect(rida).toMatch(/Lahkus, asemele <a [^>]*href="\/isikud\/\d+\/?"[^>]*>Mihkel Massakas<\/a>/);
    expect(rida).toMatch(/<a [^>]*href="\/koosolekud\/K\d+\/?"[^>]*>koosolek 28\.01\.1924<\/a>/);
    expect(rida).toContain('href="https://www.ra.ee/dgs/_purl.php?shc=ERA.2966.2.64a:10"');
  });

  it("valimiste rida: Valiti, kokku volditult üks allikaviide, 'allikad' <details>", () => {
    const rida = html.split("<li").find((r) => r.includes("20.08.1917"))!;
    expect(rida).toContain("Valiti, ");
    expect(rida).toContain("<details");
    expect(rida).toContain(">allikad</summary>");
    const summaryEel = rida.split("<details")[0];
    expect((summaryEel.match(/dea\.digar\.ee/g) ?? []).length).toBe(1);
  });

  it("mitmepäevased valimised ühel real", () => {
    expect(html).toContain("18.–19.12.1926");
  });
});
