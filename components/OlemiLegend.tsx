"use client";

import { useEffect, useState } from "react";
import { OLEMI_NIMED, OLEMI_VARVID, type OlemiTyyp } from "@/lib/colors";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "./HelpTip";

const TYYBID: OlemiTyyp[] = ["PER", "ORG", "LOC", "MONEY", "POSITION"];

/**
 * PT-04 legend (5 tüüpi + seotud isik / mitmene / sidumata) ja lüliti "Peida märgendus".
 * Lüliti seab `data-margendus` atribuudi tekstikonteinerile; CSS peidab allajoonituse.
 */
export default function OlemiLegend({ konteinerId }: { konteinerId: string }) {
  const [peidetud, setPeidetud] = useState(false);
  useEffect(() => {
    const el = document.getElementById(konteinerId);
    if (!el) return;
    if (peidetud) el.setAttribute("data-margendus", "peidetud");
    else el.removeAttribute("data-margendus");
  }, [peidetud, konteinerId]);

  return (
    <div className="no-print rounded-md border border-stone-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Märgendus on automaatne
          <HelpTip tekst={ABI.automaatmargendus} />
        </p>
        <button
          type="button"
          onClick={() => setPeidetud((p) => !p)}
          aria-pressed={peidetud}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          {peidetud ? "Näita märgendust" : "Peida märgendus"}
        </button>
      </div>
      <details className="mt-2 md:open" open>
        <summary className="cursor-pointer select-none text-xs text-stone-500 md:hidden">Legend</summary>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
          {TYYBID.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className={`olem olem-${t} px-0.5`} style={{ color: OLEMI_VARVID[t] }}>
                {OLEMI_NIMED[t]}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="olem olem-PER olem-seotud px-0.5">seotud isik</span>
            <span className="text-xs text-stone-500">(link profiilile)</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="olem olem-PER px-0.5">
              mitmene<sup className="olem-kysimark">?</sup>
            </span>
            <span className="text-xs text-stone-500">(mitu võimalikku isikut)</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="olem olem-PER olem-sidumata px-0.5">sidumata</span>
            <span className="text-xs text-stone-500">(isikut ei tuvastatud)</span>
          </li>
        </ul>
      </details>
    </div>
  );
}
