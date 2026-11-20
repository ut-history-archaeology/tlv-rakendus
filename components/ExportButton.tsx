"use client";

import { useEffect, useRef, useState } from "react";
import {
  ekspordiCSV, ekspordiJSON, ekspordiXLSX,
  type EkspordiMeta, type EkspordiRida, type EkspordiVeerg,
} from "@/lib/export";

interface Props {
  read: EkspordiRida[];
  veerud: EkspordiVeerg[];
  meta: EkspordiMeta;
  /** Kui true, lisatakse valikusse ka "Prindi / PDF" (window.print). */
  print?: boolean;
  /** Nupu tekst, kui samas kohas on mitu eksporti (vaikimisi "Lae alla"). */
  silt?: string;
  /** 5. etapp (IS5-04): nupu klassid (lihtsatel lehtedel väike hall link-nupp) ja menüü joondus. */
  nupuKlass?: string;
  menyyVasakul?: boolean;
}

/** Eksport-nupp tabeli parem-ülanurgas (EX-01). */
export default function ExportButton({
  read, veerud, meta, print, silt = "Lae alla", nupuKlass, menyyVasakul,
}: Props) {
  const [avatud, setAvatud] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klikk(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAvatud(false);
    }
    document.addEventListener("mousedown", klikk);
    return () => document.removeEventListener("mousedown", klikk);
  }, []);

  // DS-03: lihtsatel lehtedel menüüread ≥ 44 px
  const rida = `block w-full px-3 text-left text-sm hover:bg-stone-100 ${nupuKlass ? "min-h-11" : "py-1.5"}`;

  function vali(fn: () => void | Promise<void>) {
    setAvatud(false);
    void fn();
  }

  return (
    <div ref={ref} className="no-print relative inline-block">
      <button
        type="button"
        onClick={() => setAvatud((a) => !a)}
        aria-expanded={avatud}
        className={nupuKlass ?? "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"}
      >
        {nupuKlass ? silt : <>↓ {silt}</>}
      </button>
      {avatud && (
        <div className={`absolute ${menyyVasakul ? "left-0" : "right-0"} z-40 mt-1 w-44 rounded-md border border-stone-200 bg-white py-1 shadow-lg`}>
          <button
            type="button"
            className={rida}
            onClick={() => vali(() => ekspordiCSV(read, veerud, meta))}
          >
            CSV (Excel, semikoolon)
          </button>
          <button
            type="button"
            className={rida}
            onClick={() => vali(() => ekspordiXLSX(read, veerud, meta))}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className={rida}
            onClick={() => vali(() => ekspordiJSON(read, veerud, meta))}
          >
            JSON
          </button>
          {print && (
            <button
              type="button"
              className={rida}
              onClick={() => vali(() => window.print())}
            >
              Prindi / PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
