"use client";

import { useId, useState } from "react";

/** Kontekstuaalne abi: "?" ikoon, mis avab selgituse (klaviatuuriga ligipääsetav). */
export default function HelpTip({ tekst }: { tekst: string }) {
  const [avatud, setAvatud] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label="Selgitus"
        aria-expanded={avatud}
        aria-describedby={avatud ? id : undefined}
        onClick={() => setAvatud((a) => !a)}
        onBlur={() => setAvatud(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-400 text-[10px] font-bold text-stone-500 hover:bg-stone-100"
      >
        ?
      </button>
      {avatud && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 rounded-md border border-stone-200 bg-white p-2 text-xs font-normal normal-case leading-snug text-stone-700 shadow-lg"
        >
          {tekst}
        </span>
      )}
    </span>
  );
}
