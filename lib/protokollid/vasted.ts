/**
 * SD-01: protokollifail ↔ koosolek (TE-01).
 */

export interface VasteKoosolek {
  koosolek_id: string;
  kuupaev: string;
  kuupaev_lopp: string;
  protokolli_algus_txt: string;
}

export interface Failinimi {
  d1: string;
  d2: string | null;
  /** `_2` sufiks: sama päeva teine protokoll */
  teine: boolean;
}

/** Käsitsi ülekirjutused: fail → koosolek_id või null (teadlikult sidumata). */
export type Ylekirjutused = Record<string, string | null>;

export interface VasteTulemus {
  /** fail → koosolek_id (null = teadlikult sidumata) */
  vasted: Map<string, string | null>;
  /** Logitavad hoiatused (SD-01 p 2–3) */
  hoiatused: string[];
  /** Lühimärkused protokollid.csv `markus` veergu, faili kaupa */
  markused: Map<string, string[]>;
  /** Failid, mille teksti algus erineb CSV protokolli_algus_txt-st (üherealised päevad; informatiivne) */
  erinevaAlgusega: string[];
}

const ISO = "\\d{4}-\\d{2}-\\d{2}";

/** `D1.json`, `D1_D2.json`, `D1_2.json` → osad; muu kuju → null. */
export function parsiFailinimi(fail: string): Failinimi | null {
  const m = new RegExp(`^(${ISO})(?:_(${ISO})|_(2))?\\.json$`).exec(fail);
  if (!m) return null;
  return { d1: m[1], d2: m[2] ?? null, teine: m[3] === "2" };
}

/** Tühikud normaliseeritud ja algusest OCR-leheküljenumber maha (nt "122    Tartu …"). */
export function voordleAlgus(s: string): string {
  return s.replace(/^\s*\d+\s+/, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Seob failid koosolekutega. Vead (viskab Error): failinimi ei vasta ühelegi CSV-kuupäevale,
 * kaks faili samale koosolekule, ülekirjutuse ID puudub CSV-s, kolm+ rida samal päeval.
 * `tekstiAlgused` (fail → teksti esimesed ~100 märki) on vabatahtlik lisakontroll (p 3).
 */
export function seoFailidKoosolekutega(
  failid: string[],
  koosolekud: VasteKoosolek[],
  ylekirjutused: Ylekirjutused = {},
  tekstiAlgused?: Map<string, string>
): VasteTulemus {
  const vasted = new Map<string, string | null>();
  const hoiatused: string[] = [];
  const markused = new Map<string, string[]>();
  const erinevaAlgusega: string[] = [];
  const idd = new Map(koosolekud.map((k) => [k.koosolek_id, k]));
  const paevati = new Map<string, VasteKoosolek[]>();
  for (const k of koosolekud) {
    const l = paevati.get(k.kuupaev) ?? [];
    l.push(k);
    paevati.set(k.kuupaev, l);
  }
  const markus = (fail: string, m: string) => {
    const l = markused.get(fail) ?? [];
    l.push(m);
    markused.set(fail, l);
  };

  for (const fail of [...failid].sort()) {
    // 4. käsitsi ülekirjutus võidab
    if (fail in ylekirjutused) {
      const id = ylekirjutused[fail];
      if (id !== null && !idd.has(id)) throw new Error(`ülekirjutus ${fail} → ${id}: koosolekut pole CSV-s`);
      vasted.set(fail, id);
      if (id !== null) markus(fail, "käsitsi vaste");
      continue;
    }
    const osad = parsiFailinimi(fail);
    if (!osad) throw new Error(`failinimi ei vasta mustrile KUUPÄEV[_KUUPÄEV|_2].json: ${fail}`);
    const read = (paevati.get(osad.d1) ?? []).sort((a, b) => a.koosolek_id.localeCompare(b.koosolek_id));
    if (read.length === 0) throw new Error(`failile ${fail} ei vasta ükski koosolekud.csv rida (kuupaev ${osad.d1})`);
    let rida: VasteKoosolek;
    if (read.length === 1) {
      rida = read[0];
      if (osad.teine) {
        hoiatused.push(`${fail}: sufiks _2, aga CSV-s on ${osad.d1} kohta ainult üks rida (${rida.koosolek_id})`);
      }
    } else if (read.length === 2) {
      // 3. sufiksita → väiksem ID, _2 → suurem
      rida = osad.teine ? read[1] : read[0];
    } else {
      throw new Error(`kuupäeval ${osad.d1} on CSV-s ${read.length} rida; vaste tuleb anda käsitsi (${fail})`);
    }
    // 2. kahepäevase lõpukuupäeva kontroll
    if (osad.d2 && rida.kuupaev_lopp !== osad.d2) {
      const h = `kuupaev_lopp erineb: ${rida.kuupaev_lopp || "(tühi)"} vs ${osad.d2}`;
      hoiatused.push(`${fail} → ${rida.koosolek_id}: ${h}`);
      markus(fail, h);
    }
    // 3. lisakontroll: teksti algus vs protokolli_algus_txt (ainult logitakse)
    const algus = tekstiAlgused?.get(fail);
    if (algus !== undefined && rida.protokolli_algus_txt) {
      const a = voordleAlgus(algus);
      const b = voordleAlgus(rida.protokolli_algus_txt);
      if (a !== b) {
        if (read.length === 2) {
          hoiatused.push(`${fail} → ${rida.koosolek_id}: sama päeva paar, teksti algus erineb protokolli_algus_txt-st ("${a.slice(0, 30)}…" vs "${b.slice(0, 30)}…")`);
          markus(fail, "sama päeva paar: algustekst erineb CSV-st");
        } else {
          erinevaAlgusega.push(`${fail} → ${rida.koosolek_id}`);
        }
      }
    }
    vasted.set(fail, rida.koosolek_id);
  }

  // 5. iga koosolek maksimaalselt üks fail
  const kasutatud = new Map<string, string>();
  for (const [fail, id] of vasted) {
    if (id === null) continue;
    const varem = kasutatud.get(id);
    if (varem) throw new Error(`kaks faili viitavad samale koosolekule ${id}: ${varem}, ${fail}`);
    kasutatud.set(id, fail);
  }
  return { vasted, hoiatused, markused, erinevaAlgusega };
}
