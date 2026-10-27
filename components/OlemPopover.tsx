"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * PT-04: mitmese isikuolemi (2–3 kandidaati) klõps avab väikese popoveri kandidaatide linkidega.
 * Renderdatakse inline `<span>`-i sees; nupp on fookustatav, tooltip (data-tip) tuleb CSS-ist.
 */
export default function OlemPopover({
  tekst,
  tip,
  kandidaadid,
  className,
}: {
  tekst: string;
  tip: string;
  kandidaadid: { id: number; nimi: string }[];
  className: string;
}) {
  const [avatud, setAvatud] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!avatud) return;
    function klikk(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAvatud(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAvatud(false);
    }
    document.addEventListener("mousedown", klikk);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", klikk);
      document.removeEventListener("keydown", esc);
    };
  }, [avatud]);

  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        className={`${className} olem-nupp`}
        data-tip={tip}
        aria-expanded={avatud}
        aria-controls={id}
        onClick={() => setAvatud((a) => !a)}
      >
        {tekst}
        <sup className="olem-kysimark" aria-label="mitmene vaste">?</sup>
      </button>
      {avatud && (
        <span
          id={id}
          role="dialog"
          aria-label="Võimalikud isikud"
          className="no-print absolute left-0 top-full z-50 mt-1 block w-max min-w-44 max-w-xs rounded-md border border-stone-200 bg-white p-2 text-sm font-normal shadow-lg"
        >
          <span className="mb-1 block text-xs text-stone-500">Võimalikud isikud (automaatne):</span>
          <ul className="space-y-0.5">
            {kandidaadid.map((k) => (
              <li key={k.id}>
                <Link href={`/isikud/${k.id}/`} className="text-blue-700 hover:underline">
                  {k.nimi}
                </Link>
              </li>
            ))}
          </ul>
        </span>
      )}
    </span>
  );
}
