import type { Andmestik } from "./types";
import { isikuRead } from "./derive";
import { taisnimi } from "./format";

export interface Fakt {
  tekst: string;
  link: string;
}

/** AV-05: huvitavad faktid, arvutatud andmetest. */
export function arvutaFaktid(andmed: Andmestik): Fakt[] {
  const faktid: Fakt[] = [];
  const read = isikuRead(andmed);

  // Pikima karjääriga volinik koosseisude arvu järgi
  const pikim = [...read].sort((a, b) => b.koosseise - a.koosseise)[0];
  if (pikim) {
    faktid.push({
      tekst: `Pikima karjääriga volinik oli ${taisnimi(pikim)}, kes kuulus ${pikim.koosseise} koosseisu (${pikim.esimene_koosseis} … ${pikim.viimane_koosseis}).`,
      link: `/isikud/${pikim.isik_id}/`,
    });
  }

  // Kõige rohkem koosolekuid juhatanud isik
  const juhatamisi = new Map<number, number>();
  for (const j of andmed.juhatajad) {
    if (j.isik_id !== null) {
      juhatamisi.set(j.isik_id, (juhatamisi.get(j.isik_id) ?? 0) + 1);
    }
  }
  const [tippJuhatajaId, tippArv] = [...juhatamisi.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0] ?? [null, 0];
  if (tippJuhatajaId !== null) {
    const isik = andmed.isikud.find((i) => i.isik_id === tippJuhatajaId);
    if (isik) {
      faktid.push({
        tekst: `Kõige rohkem koosolekuid juhatas ${taisnimi(isik)} — ${tippArv} koosolekut ${andmed.koosolekud.length}-st.`,
        link: `/isikud/${tippJuhatajaId}/`,
      });
    }
  }

  // Naised volikogus
  const naisi = read.filter((r) => r.sugu === "n" && r.koosseise > 0).length;
  if (naisi > 0) {
    faktid.push({
      tekst: `Volikogus on aastate jooksul olnud ${naisi} naisliiget 404 isikust.`,
      link: `/isikud/`,
    });
  }

  // Kõige muutusterohkem koosseis
  const muutusi = new Map<string, number>();
  for (const m of andmed.muutused) {
    muutusi.set(m.koosseis_id, (muutusi.get(m.koosseis_id) ?? 0) + 1);
  }
  const [muutlikuim, muutusteArv] = [...muutusi.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0] ?? ["", 0];
  if (muutlikuim) {
    faktid.push({
      tekst: `Kõige rohkem liikmesmuutusi oli koosseisus ${muutlikuim} — ${muutusteArv} muutust.`,
      link: `/koosseisud/${muutlikuim}/`,
    });
  }

  // Kõige tihedama koosolekugraafikuga aasta
  const aastati = new Map<string, number>();
  for (const k of andmed.koosolekud) {
    const a = k.kuupaev.slice(0, 4);
    aastati.set(a, (aastati.get(a) ?? 0) + 1);
  }
  const [tippAasta, koosolekuid] = [...aastati.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0] ?? ["", 0];
  if (tippAasta) {
    faktid.push({
      tekst: `Kõige rohkem koosolekuid peeti ${tippAasta}. aastal — ${koosolekuid} koosolekut.`,
      link: `/koosolekud/?aasta=${tippAasta}`,
    });
  }

  return faktid;
}
