/** UX-07 ajatelje abifunktsioonid (puhtad, testitavad). */

/** ISO-kuupäev (ka osaline) → UTC millisekundid. */
export function utc(iso: string): number {
  const [a, k, p] = iso.split("-").map(Number);
  return Date.UTC(a, (k || 1) - 1, p || 1);
}

export interface Paigutus {
  kuupaev: string;
  x: number;
  rida: 0 | 1;
}

/**
 * Markerite paigutus: üks marker kuupäeva kohta (sama päev = üks marker).
 * Kui eelmine marker samal real on lähemal kui `minVahe` px, läheb marker teisele reale;
 * kui mõlemad read on kinni, valitakse rida, kus vahe on suurem.
 */
export function paigutaMarkerid(
  kuupaevad: string[],
  x: (kuupaev: string) => number,
  minVahe = 8
): Paigutus[] {
  const unikaalsed = [...new Set(kuupaevad)].sort();
  const viimane: [number, number] = [-Infinity, -Infinity];
  return unikaalsed.map((kuupaev) => {
    const px = x(kuupaev);
    const vahe0 = px - viimane[0];
    const vahe1 = px - viimane[1];
    const rida: 0 | 1 = vahe0 >= minVahe ? 0 : vahe1 >= minVahe ? 1 : vahe0 >= vahe1 ? 0 : 1;
    viimane[rida] = px;
    return { kuupaev, x: px, rida };
  });
}
