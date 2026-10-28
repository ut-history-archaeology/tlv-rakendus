"use client";

import { useState } from "react";
import type { IsikuRida } from "@/lib/types";
import JaotusRiba, { type JaotuseSegment } from "./JaotusRiba";
import IsikudTabel from "./IsikudTabel";
import HelpTip from "./HelpTip";
import { ABI } from "@/lib/abitekstid";

interface Props {
  koosseisId: string;
  read: IsikuRida[];
  /** Jaotus + iga segmendi liikmete ID-d (nimekiri või ringkond). */
  jaotus: (JaotuseSegment & { isikud: number[] })[];
  /** "nimekiri" või "ringkond" — pealkirja ja siltide jaoks. */
  jaotuseAlus: "nimekiri" | "ringkond";
  jaotuseSelgitus?: string;
  staatus?: Record<number, { tekst: string; voti: string }>;
}

/** KS-03 + KS-04: jaotusdiagramm, mille segmendiklõps filtreerib liikmete tabelit. */
export default function KoosseisuSisu({
  koosseisId, read, jaotus, jaotuseAlus, jaotuseSelgitus, staatus,
}: Props) {
  const [valitud, setValitud] = useState<string | null>(null);
  const valitudSegment = jaotus.find((j) => j.nimi === valitud);

  return (
    <div className="space-y-8">
      {jaotus.length > 0 && (
        <section aria-labelledby="jaotus">
          <h2 id="jaotus" className="mb-2 text-xl font-semibold">
            {jaotuseAlus === "nimekiri"
              ? "Poliitiline jaotus valimistulemuste järgi"
              : "Valitute jaotus ringkondade kaupa"}
            <HelpTip
              tekst={
                jaotuseAlus === "nimekiri"
                  ? ABI.nimekiri
                  : "1939. aasta valimistel nimekirju ei olnud; valimised toimusid nelja ringkonna kaupa."
              }
            />
          </h2>
          {jaotuseSelgitus && (
            <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
              ⚠ {jaotuseSelgitus}
            </p>
          )}
          <JaotusRiba
            segmendid={jaotus}
            valitud={valitud}
            vali={setValitud}
          />
        </section>
      )}

      <section aria-labelledby="liikmed">
        <h2 id="liikmed" className="mb-2 text-xl font-semibold">
          Liikmed
        </h2>
        <IsikudTabel
          read={read}
          koosseisud={[]}
          eelKoosseis={koosseisId}
          naitaAadressi
          staatus={staatus}
          valisFilter={
            valitudSegment
              ? {
                  silt: `${jaotuseAlus === "nimekiri" ? "Nimekiri" : "Ringkond"}: ${valitudSegment.nimi}`,
                  isikud: valitudSegment.isikud,
                }
              : null
          }
          eemaldaValisFilter={() => setValitud(null)}
        />
      </section>
    </div>
  );
}
