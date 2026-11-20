/**
 * AV5-02: avalehe kirjeldus failist `content/avaleht.md` (Markdown → HTML build-ajal).
 *
 * Teisendaja: `marked` (ilma sõltuvusteta), renderdaja on piiratud:
 * - toores HTML (plokk ja tekstisisene) eemaldatakse täielikult — `<script>` jms ei jõua HTML-i;
 * - pealkirjad (`#`) → tavaline rasvane lõik (lehe pealkiri on koodis);
 * - lingid: `/…` → basePath ette; `http(s):`/`mailto:` → uues aknas, `rel="noopener noreferrer"`;
 *   muu skeem (nt `javascript:`) või suhteline tee → ainult tekst;
 * - pildid → ainult alt-tekst (välispilte lehele ei tooda).
 * Kliendi JS-i see ei suurenda: kutsutakse ainult serverkomponendist.
 */
import fs from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";
import { BASE_PATH } from "./protokollid/laadi";

export const AVALEHE_FAIL = path.join("content", "avaleht.md");

const VIGA_PUUDUB = "content/avaleht.md puudub — avalehe kirjeldus on kohustuslik";
const VIGA_TYHI = "content/avaleht.md on tühi — avalehe kirjeldus on kohustuslik";

function atribuut(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tekst(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Lingi siht: sisemine (basePath-iga), väline või null (lubamatu → ainult tekst). */
export function lingiSiht(
  href: string,
  basePath: string = BASE_PATH
): { url: string; valine: boolean } | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h) || /^mailto:/i.test(h)) return { url: h, valine: true };
  if (h.startsWith("#")) return { url: h, valine: false };
  if (h.startsWith("/") && !h.startsWith("//")) {
    const url = basePath && (h === basePath || h.startsWith(basePath + "/")) ? h : basePath + h;
    return { url, valine: false };
  }
  return null;
}

/** Markdown → turvaline HTML (vt faili päis). */
export function markdownHtmliks(md: string, basePath: string = BASE_PATH): string {
  const marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      html() {
        return "";
      },
      heading({ tokens }: Tokens.Heading) {
        return `<p><strong>${this.parser.parseInline(tokens)}</strong></p>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const sisu = this.parser.parseInline(tokens);
        const siht = lingiSiht(href, basePath);
        if (!siht) return sisu;
        const t = title ? ` title="${atribuut(title)}"` : "";
        const uus = siht.valine ? ` target="_blank" rel="noopener noreferrer"` : "";
        return `<a href="${atribuut(siht.url)}"${t}${uus}>${sisu}</a>`;
      },
      image({ text }: Tokens.Image) {
        return tekst(text);
      },
    },
  });
  return (marked.parse(md, { async: false }) as string).trim();
}

/**
 * Loe ja teisenda avalehe kirjeldus. Puuduv või tühi fail katkestab buildi (AV5-02).
 * `juur` = repo juurkaust (testides ajutine kaust).
 */
export function avaleheKirjeldus(juur: string = process.cwd()): string {
  const fail = path.join(juur, AVALEHE_FAIL);
  let md: string;
  try {
    md = fs.readFileSync(fail, "utf8");
  } catch {
    throw new Error(VIGA_PUUDUB);
  }
  if (!md.trim()) throw new Error(VIGA_TYHI);
  const html = markdownHtmliks(md);
  if (!html.replace(/<[^>]*>/g, "").trim()) throw new Error(VIGA_TYHI);
  return html;
}
