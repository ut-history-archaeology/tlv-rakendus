"use client";

import { useState } from "react";

/** Kategooriate värvipalett jaotusdiagrammile (nimekirjad/ringkonnad). */
const PALETT = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#7c3aed", "#db2777",
  "#0e7490", "#9a3412", "#4d7c0f", "#6b7280", "#0f766e", "#b91c1c",
];

export interface JaotuseSegment {
  nimi: string;
  arv: number;
}

/** KS-03: poliitilise jaotuse 100% lintdiagramm. Klõps segmendil filtreerib
 * liikmete tabelit (juhitud vanemkomponendist). */
export default function JaotusRiba({
  segmendid, valitud, vali,
}: {
  segmendid: JaotuseSegment[];
  valitud: string | null;
  vali: (nimi: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const kokku = segmendid.reduce((s, x) => s + x.arv, 0);
  if (kokku === 0) return null;
  const hoverSeg = segmendid.find((s) => s.nimi === hover);
  return (
    <div>
      <div
        className="flex h-10 w-full overflow-hidden rounded-md"
        role="img"
        aria-label={`Jaotus: ${segmendid
          .map((s) => `${s.nimi} ${s.arv} (${Math.round((s.arv / kokku) * 100)}%)`)
          .join("; ")}`}
      >
        {segmendid.map((s, i) => (
          <button
            key={s.nimi}
            type="button"
            onClick={() => vali(valitud === s.nimi ? null : s.nimi)}
            onMouseEnter={() => setHover(s.nimi)}
            onMouseLeave={() => setHover(null)}
            title={`${s.nimi}: ${s.arv} (${((s.arv / kokku) * 100).toFixed(1)}%)`}
            aria-pressed={valitud === s.nimi}
            className={`h-full transition-opacity ${
              valitud && valitud !== s.nimi ? "opacity-30" : ""
            } ${valitud === s.nimi ? "relative z-10 outline outline-[3px] -outline-offset-[3px] outline-stone-900" : ""}`}
            style={{
              width: `${(s.arv / kokku) * 100}%`,
              backgroundColor: PALETT[i % PALETT.length],
            }}
          />
        ))}
      </div>
      <p className="mt-1 min-h-5 text-xs text-stone-600">
        {hoverSeg
          ? `${hoverSeg.nimi}: ${hoverSeg.arv} liiget (${((hoverSeg.arv / kokku) * 100).toFixed(1)}%)`
          : "Liigu hiirega segmendile või klõpsa, et filtreerida liikmete tabelit."}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-stone-700">
        {segmendid.map((s, i) => (
          <li key={s.nimi}>
            <button
              type="button"
              onClick={() => vali(valitud === s.nimi ? null : s.nimi)}
              className={`inline-flex items-start gap-1.5 text-left hover:underline ${
                valitud === s.nimi ? "font-semibold" : ""
              }`}
            >
              <span
                className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PALETT[i % PALETT.length] }}
                aria-hidden
              />
              {s.nimi} — {s.arv} ({((s.arv / kokku) * 100).toFixed(1)}%)
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
