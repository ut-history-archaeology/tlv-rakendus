"use client";

import { useEffect, useRef } from "react";
import { BASE_PATH } from "@/lib/protokollid/laadi";
import { pildiUrl } from "@/lib/protokollid/lehed";
import type { Leht } from "@/lib/protokollid/types";

/** PT-05 eelvaadete riba: 300-PNG-d `loading="lazy"`, aktiivne raamiga, keritakse aktiivse juurde. */
export default function LehtedeRiba({
  lehed, aktiivne, vali, kuupaev,
}: {
  lehed: Leht[];
  aktiivne: string;
  vali: (lk: string) => void;
  kuupaev: string;
}) {
  const riba = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = riba.current;
    const el = r?.querySelector<HTMLElement>(`[data-lk="${CSS.escape(aktiivne)}"]`);
    if (!r || !el) return;
    const siht = el.offsetLeft - r.clientWidth / 2 + el.offsetWidth / 2;
    r.scrollTo({ left: Math.max(0, siht), behavior: "smooth" });
  }, [aktiivne]);

  return (
    <div ref={riba} className="flex gap-1.5 overflow-x-auto py-1" role="listbox" aria-label="Protokolli leheküljed">
      {lehed.map((l) => {
        const on = l.lk === aktiivne;
        return (
          <button
            key={l.jrk}
            type="button"
            role="option"
            aria-selected={on}
            data-lk={l.lk}
            onClick={() => vali(l.lk)}
            title={`lk ${l.lk}${l.tekstita ? " (tekstita leht)" : ""}`}
            className={`shrink-0 rounded border-2 bg-white p-0.5 text-[10px] leading-tight text-stone-600 ${
              on ? "border-amber-500" : "border-transparent hover:border-stone-300"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pildiUrl(BASE_PATH, 300, l.pilt)}
              alt={`Protokolli ${kuupaev} originaal, lk ${l.lk}, eelvaade`}
              loading="lazy"
              width={56}
              height={80}
              className="h-20 w-14 object-cover object-top"
            />
            <span className="block">{l.lk}</span>
          </button>
        );
      })}
    </div>
  );
}
