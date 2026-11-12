import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ValimisedKoos from "@/components/ValimisedKoos";
import { isikuValimisedKoos } from "./derive";
import { loeAndmestik } from "./data";

/** TE4-04 / VK-03: renderduses viide puudu → jämedas kirjas "VIIDE PUUDU", URL → link. */
describe("valimiste kaardi renderdus", () => {
  const html = renderToStaticMarkup(
    createElement(ValimisedKoos, { kirjed: isikuValimisedKoos(loeAndmestik(), 6).filter((k) => k.aasta === 1917) })
  );

  it("venekeelse nimekirja väärtused: <strong>VIIDE PUUDU</strong>", () => {
    expect(html).toMatch(/<strong[^>]*>VIIDE PUUDU<\/strong>/);
    expect(html).toContain("конторщикъ");
  });

  it("eestikeelse allika viide on link DIGAR-i", () => {
    expect(html).toMatch(/<a href="https:\/\/dea\.digar\.ee\/article\/ekmteataja\/1917\/08\/31\/3"[^>]*>Eestimaa Kubermangu Teataja/);
  });
});
