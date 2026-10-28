"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Syndmus } from "@/lib/derive";
import LiikmeteAjatelg, { type AjateljePaev } from "./LiikmeteAjatelg";
import SyndmusteTabel from "./SyndmusteTabel";

interface Props {
  syndmused: Syndmus[];
  nimed: Record<number, string>;
  algus: string;
  lopp: string;
  seeria: { kuupaev: string; arv: number }[];
  valitudArv: number;
  varv: string;
  koosolekud: string[];
  failinimi: string;
  toorEksport: ReactNode;
  muutusteRidu: number;
}

/** Sündmus tooltipi reana. */
function tooltipTekst(s: Syndmus, nimed: Record<number, string>): string {
  const n = (id: number | null) => (id !== null && nimed[id]) || "isik teadmata";
  switch (s.liik) {
    case "kinnitamine": return `kinnitati ${s.isikud.length} valitud liiget`;
    case "vahetus": return `${n(s.lahkuja)} → ${n(s.asendaja)}`;
    case "lahkumine": return `lahkus ${n(s.isik)}`;
    case "liitumine": return `liitus ${n(s.isik)}`;
    case "liitumine&lahkumine": return `${n(s.isik)} liitus ja lahkus`;
    case "rühmavahetus": return `rühmavahetus: ${n(s.isik)}`;
    case "peatamine": return `peatati: ${n(s.isik)}`;
  }
}

/** UX-07 + UX-06: ajatelg ja sündmuste tabel ühise kuupäevafiltriga. */
export default function KoosseisuMuutused({
  syndmused, nimed, algus, lopp, seeria, valitudArv, varv, koosolekud, failinimi, toorEksport, muutusteRidu,
}: Props) {
  const [kuupaev, setKuupaev] = useState<string | null>(null);

  const paevad = useMemo(() => {
    const map = new Map<string, AjateljePaev>();
    for (const s of syndmused) {
      if (!s.kuupaev) continue;
      const p = map.get(s.kuupaev) ?? { kuupaev: s.kuupaev, liigid: [], kirjed: [], isikuid: 0 };
      p.liigid.push(s.liik);
      p.kirjed.push(tooltipTekst(s, nimed));
      p.isikuid += s.liik === "kinnitamine" ? s.isikud.length : s.liik === "vahetus" ? 2 : 1;
      map.set(s.kuupaev, p);
    }
    return [...map.values()];
  }, [syndmused, nimed]);

  function vali(k: string) {
    setKuupaev((eelmine) => (eelmine === k ? null : k));
    document.getElementById("muutused")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section aria-labelledby="muutuste-ajatelg">
        <h2 id="muutuste-ajatelg" className="mb-2 text-xl font-semibold">
          Liikmete arv ja muutused ajateljel
        </h2>
        <LiikmeteAjatelg
          algus={algus}
          lopp={lopp}
          seeria={seeria}
          valitudArv={valitudArv}
          varv={varv}
          paevad={paevad}
          koosolekud={koosolekud}
          valitudKuupaev={kuupaev}
          vali={vali}
        />
      </section>

      <section aria-labelledby="muutused" className="scroll-mt-20">
        <h2 id="muutused" className="mb-2 scroll-mt-20 text-xl font-semibold">Liikmesmuutused</h2>
        <SyndmusteTabel
          syndmused={syndmused}
          nimed={nimed}
          failinimi={failinimi}
          kuupaev={kuupaev}
          eemaldaKuupaev={() => setKuupaev(null)}
          lisaTegevused={toorEksport}
        />
        <p className="mt-1 text-xs text-stone-500">
          {muutusteRidu} muutuste rida on koondatud {syndmused.length} sündmuseks.
          „Toorread“ laeb alla andmestiku read muutmata kujul.
        </p>
      </section>
    </>
  );
}
