"use client";

import Link from "next/link";
import { useState } from "react";
import type { Fakt } from "@/lib/faktid";

/** AV-05: huvitavate faktide karussell. */
export default function FaktiKarussell({ faktid }: { faktid: Fakt[] }) {
  const [idx, setIdx] = useState(0);
  if (faktid.length === 0) return null;
  const fakt = faktid[idx];
  return (
    <section
      aria-label="Huvitavad faktid"
      className="rounded-lg border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Eelmine fakt"
          onClick={() => setIdx((idx - 1 + faktid.length) % faktid.length)}
          className="shrink-0 rounded-full border border-stone-300 px-2.5 py-1 hover:bg-stone-100"
        >
          ←
        </button>
        <Link
          href={fakt.link}
          className="min-h-12 flex-1 text-center text-sm text-stone-700 hover:underline md:text-base"
        >
          {fakt.tekst}
        </Link>
        <button
          type="button"
          aria-label="Järgmine fakt"
          onClick={() => setIdx((idx + 1) % faktid.length)}
          className="shrink-0 rounded-full border border-stone-300 px-2.5 py-1 hover:bg-stone-100"
        >
          →
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {faktid.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Fakt ${i + 1}`}
            aria-current={i === idx}
            onClick={() => setIdx(i)}
            className={`h-2 w-2 rounded-full ${
              i === idx ? "bg-stone-700" : "bg-stone-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
