/**
 * PA-10 (OTSUS 12.11.2026): arhiiviviide on link Rahvusarhiivi püsilingile
 * `https://www.ra.ee/dgs/_purl.php?shc=<viide>`. Number pärast `:` on digikaader (mitte
 * lehekülg). Kaadrivahemiku (`:339–387`) korral link esimesele kaadrile. `>` kooloni asemel
 * (`ERA.5130.4.481>817`, VIITED.md A1a) loetakse kaadri eraldajaks. Säilik ilma kaadrita jääb
 * nagu on.
 */
export const RA_PURL = "https://www.ra.ee/dgs/_purl.php?shc=";

const VIIDE = /^([A-ZÕÄÖÜ]{2,5}\.[0-9A-Za-z.]+?)(?:\s*[:>]\s*(\d+[a-z]?)(?:\s*[–—-]\s*\d+[a-z]?)?)?$/;

/** Üks arhiiviviide → püsilink; tundmatu kuju või tühi → null. */
export function arhiiviUrl(viide: string): string | null {
  const v = viide.trim();
  if (!v) return null;
  const m = v.match(VIIDE);
  if (!m) return null;
  const [, sailik, kaader] = m;
  // jagatud lehed 134a/134b on sama pilt (data/README.md) → sama digikaader 134
  return RA_PURL + (kaader ? `${sailik}:${kaader.replace(/[a-z]$/, "")}` : sailik);
}

export interface ViiteLink {
  /** kuvatekst = allika kuju (vahemikuga) */
  tekst: string;
  url: string | null;
}

/** Protokolli säilik + kaader → püsilink. */
export function kaadriUrl(sailik: string, kaader: string): string | null {
  return arhiiviUrl(kaader ? `${sailik}:${kaader}` : sailik);
}

/** "kaader 112" / "kaadrid 112–117". */
export function kaadridTekst(esimene: string, viimane?: string): string {
  return viimane && viimane !== esimene ? `kaadrid ${esimene}–${viimane}` : `kaader ${esimene}`;
}

/** Lahtri sisu (mitu viidet `,` või `;`-ga) → iga viide eraldi lingiga. */
export function arhiiviLingid(lahter: string | null | undefined): ViiteLink[] {
  if (!lahter) return [];
  return lahter
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tekst) => ({ tekst, url: arhiiviUrl(tekst) }));
}
