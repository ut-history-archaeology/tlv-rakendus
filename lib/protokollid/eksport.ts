/**
 * PT-09: txt / markdown / JSON-meta koostamine (TE-10). Puhtad funktsioonid, ilma brauserita.
 */
import { kuupaevEesti } from "../format";
import { puhastaPealkiri } from "./korpus";
import { rakendaNormid } from "./kirjakuju";
import { plokid, type Plokk } from "./plokid";
import type { Kone, ProtokollAndmed, Vahemik } from "./types";
import { kuupaevadEesti } from "./viide";

export type Kirjakuju = "ajalooline" | "moderniseeritud";

export const ALLIKAS = "Tartu Linnavolikogu andmestik, 2026";
export const MARGENDUS = "automaatne (est-roberta-hist-ner-for-tccp; est-roberta-hist-quote-extract-for-tccp)";

export interface EkspordiKontekst {
  kuupaevad: string[];
  /** rakenduse lehe URL */
  url: string;
  kirjakuju: Kirjakuju;
  /** ISO-ajatempel; vaikimisi praegu */
  aeg?: string;
}

/** Tekst aktiivses kirjakujus + vahemike teisendaja. */
export function tekstKujus(p: ProtokollAndmed, kuju: Kirjakuju) {
  if (kuju === "moderniseeritud") return rakendaNormid(p.tekst, p.normid);
  return { tekst: p.tekst, teisenda: (x: number) => x, teisendaVahemik: (v: Vahemik): Vahemik => [v[0], v[1]], asendusi: 0 };
}

function paiseRead(p: ProtokollAndmed, k: EkspordiKontekst): string[] {
  return [
    `Tartu Linnavolikogu protokoll, ${kuupaevadEesti(k.kuupaevad)}`,
    `Kuupäev: ${k.kuupaevad.join(" / ")}`,
    `Arhiiviviide: ${p.arhiiviviide}, lk ${p.lehed[0]?.lk ?? "?"}–${p.lehed[p.lehed.length - 1]?.lk ?? "?"}`,
    `Transkribus: ${p.transkribus_url}`,
    `Allikas: ${ALLIKAS}`,
    `URL: ${k.url}`,
    `Eksporditud: ${k.aeg ?? new Date().toISOString()}`,
    `Kirjakuju: ${k.kirjakuju}`,
    `Märgendus: ${MARGENDUS}`,
  ];
}

/** TXT: päis, tühi rida, tekst aktiivses kirjakujus muutmata reavahetustega. */
export function koostaTxt(p: ProtokollAndmed, k: EkspordiKontekst): string {
  return paiseRead(p, k).join("\n") + "\n\n" + tekstKujus(p, k.kirjakuju).tekst + "\n";
}

/** OCR-read lõigu sees tühikuga kokku (E-09). */
function loiguks(s: string): string {
  return s.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Ploki sisu markdownina: kõned kujul `**Nimi:** tekst`, kõnede vahele jääv tekst tavaliselt.
 * Olemeid ei märgita (E-11).
 */
function plokiMarkdown(tekst: string, v: Vahemik, koned: { kone: Kone; koneleja: Vahemik; tykid: Vahemik[] }[]): string {
  const omad = koned
    .filter((k) => k.koneleja[0] >= v[0] && k.koneleja[1] <= v[1])
    .sort((a, b) => a.koneleja[0] - b.koneleja[0]);
  const osad: string[] = [];
  let kursor = v[0];
  for (const k of omad) {
    const konelopp = Math.max(k.koneleja[1], ...k.tykid.map((t) => t[1]));
    if (k.koneleja[0] > kursor) osad.push(loiguks(tekst.slice(kursor, k.koneleja[0])));
    const koneTekst = k.tykid.map((t) => loiguks(tekst.slice(t[0], t[1]))).join(" […] ");
    osad.push(`**${k.kone.nimi}:** ${koneTekst}`);
    kursor = Math.max(kursor, konelopp);
  }
  if (kursor < v[1]) osad.push(loiguks(tekst.slice(kursor, v[1])));
  return osad.filter(Boolean).join("\n\n");
}

/** Markdown: `# Protokoll <kuupäev>`, metaandmed loendina, `## …` iga ploki kohta. */
export function koostaMarkdown(p: ProtokollAndmed, k: EkspordiKontekst): string {
  const kuju = tekstKujus(p, k.kirjakuju);
  const tekst = kuju.tekst;
  const koned = p.koned.map((kone) => ({
    kone,
    koneleja: kuju.teisendaVahemik(kone.koneleja),
    tykid: kone.tykid.map((t) => kuju.teisendaVahemik(t)),
  }));
  const read: string[] = [`# Protokoll ${kuupaevadEesti(k.kuupaevad)}`, ""];
  for (const r of paiseRead(p, k).slice(1)) read.push(`- ${r}`);
  read.push("");
  const pl: Plokk[] = plokid(p.tekst.length, p.paevakord, p.lisad);
  for (const b of pl) {
    const v = kuju.teisendaVahemik([b.algus, b.lopp]);
    let pealkiri: string;
    switch (b.liik) {
      case "sissejuhatus":
        pealkiri = "## Sissejuhatus";
        break;
      case "punkt": {
        const pk = kuju.teisendaVahemik(b.pealkiri);
        pealkiri = `## ${b.nr}. ${puhastaPealkiri(tekst.slice(pk[0], pk[1]))}`;
        break;
      }
      case "lopuosa":
        pealkiri = "## Lõpuosa";
        break;
      case "lisa":
        pealkiri = `## Lisa: ${b.kirjeldus || "(kirjelduseta)"}`;
        break;
      default:
        pealkiri = "## Protokolli tekst";
    }
    read.push(pealkiri, "");
    const sisu = b.liik === "punkt" ? [kuju.teisendaVahemik(b.pealkiri)[1], v[1]] as Vahemik : v;
    read.push(plokiMarkdown(tekst, sisu, koned), "");
  }
  if (p.paevakord.length === 0) {
    read.push("_Päevakorrapunkte selles protokollis ei ole eristatud._", "");
  }
  return read.join("\n");
}

/** JSON-ekspordi meta (EX-04/EX-08 + 2. etapi lisavõtmed). */
export function koostaJsonMeta(p: ProtokollAndmed, k: EkspordiKontekst) {
  return {
    allikas: ALLIKAS,
    eksporditud: k.aeg ?? new Date().toISOString(),
    url: k.url,
    protokoll: p.id,
    kuupaev: k.kuupaevad.map(kuupaevEesti).join(" – "),
    arhiiviviide: p.arhiiviviide,
    kirjakuju: k.kirjakuju,
    margendus: MARGENDUS,
  };
}

/** EX-07 failinimi: tlv-protokoll-K174-1930-09-08-<täna>.<laiend> */
export function ekspordiFailinimi(id: string, kuupaev: string, laiend: string, tana: string): string {
  return `tlv-protokoll-${id}-${kuupaev}-${tana}.${laiend}`;
}
