import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { avaleheKirjeldus, lingiSiht, markdownHtmliks } from "./sisu";

describe("TE5-01 content/avaleht.md teisendus", () => {
  it("lõik, rasvane, kursiiv", () => {
    const html = markdownHtmliks("Esimene **rasvane** ja *kursiiv*.\n\nTeine lõik.");
    expect(html).toBe("<p>Esimene <strong>rasvane</strong> ja <em>kursiiv</em>.</p>\n<p>Teine lõik.</p>");
  });

  it("sisemine link saab basePath-i", () => {
    const html = markdownHtmliks("Vt [Allik](/isikud/6/).");
    expect(html).toContain('<a href="/tlv-rakendus/isikud/6/">Allik</a>');
    expect(html).not.toContain("target=");
  });

  it("basePath-iga link ei saa seda topelt", () => {
    expect(lingiSiht("/tlv-rakendus/isikud/6/")?.url).toBe("/tlv-rakendus/isikud/6/");
  });

  it("väline link avaneb uues aknas ja saab rel-i", () => {
    const html = markdownHtmliks("[RA](https://www.ra.ee/)");
    expect(html).toContain('<a href="https://www.ra.ee/" target="_blank" rel="noopener noreferrer">RA</a>');
  });

  it("loendid", () => {
    const html = markdownHtmliks("- üks\n- kaks\n\n1. a\n2. b");
    expect(html).toContain("<ul>\n<li>üks</li>\n<li>kaks</li>\n</ul>");
    expect(html).toContain("<ol>");
  });

  it("<script> ja muu toores HTML eemaldatakse", () => {
    const html = markdownHtmliks(
      'Tekst.\n\n<script>alert(1)</script>\n\nLõik <b onclick="x()">sees</b> <img src=x onerror=alert(1)>.'
    );
    expect(html).not.toMatch(/<script|alert|onclick|onerror|<b|<img/);
    expect(html).toContain("<p>Tekst.</p>");
    expect(html).toContain("Lõik sees");
  });

  it("javascript: link muutub tekstiks", () => {
    const html = markdownHtmliks("[kuri](javascript:alert(1))");
    expect(html).toBe("<p>kuri</p>");
  });

  it("pealkiri kuvatakse rasvase lõiguna", () => {
    expect(markdownHtmliks("# Pealkiri")).toBe("<p><strong>Pealkiri</strong></p>");
  });

  it("pilt → alt-tekst", () => {
    expect(markdownHtmliks("![Raekoda](https://x/y.png)")).toBe("<p>Raekoda</p>");
  });

  function ajutineJuur(sisu?: string): string {
    const juur = fs.mkdtempSync(path.join(os.tmpdir(), "tlv-sisu-"));
    if (sisu !== undefined) {
      fs.mkdirSync(path.join(juur, "content"));
      fs.writeFileSync(path.join(juur, "content", "avaleht.md"), sisu);
    }
    return juur;
  }

  it("puuduv fail annab vea", () => {
    expect(() => avaleheKirjeldus(ajutineJuur())).toThrow(
      "content/avaleht.md puudub — avalehe kirjeldus on kohustuslik"
    );
  });

  it("tühi fail annab vea (ka ainult tühikud või ainult HTML)", () => {
    expect(() => avaleheKirjeldus(ajutineJuur(""))).toThrow(/content\/avaleht\.md on tühi/);
    expect(() => avaleheKirjeldus(ajutineJuur("  \n\n"))).toThrow(/on tühi/);
    expect(() => avaleheKirjeldus(ajutineJuur("<script>x</script>"))).toThrow(/on tühi/);
  });

  it("repo content/avaleht.md on olemas ja teisendub", () => {
    const html = avaleheKirjeldus();
    expect(html).toMatch(/^<p>/);
    expect(html).toContain("Tartu");
  });
});
