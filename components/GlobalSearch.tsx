"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { OtsinguIndeks } from "@/lib/search-index";
import { kuupaevLyhike, normalizeOtsing } from "@/lib/format";

/** Globaalne otsing: isikud (nimi) ja koosolekud (kuupäev) kategooriate kaupa. */
export default function GlobalSearch({ indeks }: { indeks: OtsinguIndeks }) {
  const [otsing, setOtsing] = useState("");
  const [avatud, setAvatud] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klikk(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAvatud(false);
      }
    }
    document.addEventListener("mousedown", klikk);
    return () => document.removeEventListener("mousedown", klikk);
  }, []);

  const tulemused = useMemo(() => {
    const q = normalizeOtsing(otsing.trim());
    if (q.length < 2) return { isikud: [], koosolekud: [] };
    const isikud = indeks.isikud
      .filter((i) => normalizeOtsing(i.nimi + " " + i.alt).includes(q))
      .slice(0, 8);
    const koosolekud = indeks.koosolekud
      .filter((k) => {
        const kujud = [
          k.kuupaev,
          kuupaevLyhike(k.kuupaev),
          k.kuupaev_lopp,
          kuupaevLyhike(k.kuupaev_lopp),
        ].join(" ");
        return kujud.includes(otsing.trim());
      })
      .slice(0, 8);
    return { isikud, koosolekud };
  }, [otsing, indeks]);

  const onTulemusi = tulemused.isikud.length > 0 || tulemused.koosolekud.length > 0;

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <input
        type="search"
        value={otsing}
        onChange={(e) => {
          setOtsing(e.target.value);
          setAvatud(true);
        }}
        onFocus={() => setAvatud(true)}
        placeholder="Otsi isikut või koosolekut…"
        aria-label="Globaalne otsing: isiku nimi või koosoleku kuupäev"
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
      />
      {avatud && otsing.trim().length >= 2 && (
        <div className="absolute right-0 z-50 mt-1 max-h-96 w-80 overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {!onTulemusi && (
            <p className="px-3 py-2 text-sm text-stone-500">
              Isikuid ega koosolekuid ei leitud. Isikuid otsi nime, koosolekuid kuupäeva järgi
              (nt 11.01.1918 või 1918-01-11).
            </p>
          )}
          {otsing.trim().length >= 3 && (
            <div>
              <p className="border-b border-stone-100 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Protokollide täistekst
              </p>
              <Link
                href={`/koosolekud/?q=${encodeURIComponent(otsing.trim())}#otsing`}
                onClick={() => setAvatud(false)}
                className="block px-3 py-1.5 text-sm hover:bg-stone-100"
              >
                Otsi protokollide täistekstist: „{otsing.trim()}“ →
              </Link>
            </div>
          )}
          {tulemused.isikud.length > 0 && (
            <div>
              <p className="border-b border-stone-100 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Isikud
              </p>
              {tulemused.isikud.map((i) => (
                <Link
                  key={i.id}
                  href={`/isikud/${i.id}/`}
                  onClick={() => setAvatud(false)}
                  className="block px-3 py-1.5 text-sm hover:bg-stone-100"
                >
                  {i.nimi}
                  {i.aastad && (
                    <span className="ml-2 text-xs text-stone-500">{i.aastad}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          {tulemused.koosolekud.length > 0 && (
            <div>
              <p className="border-b border-stone-100 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Koosolekud
              </p>
              {tulemused.koosolekud.map((k) => (
                <Link
                  key={k.id}
                  href={`/koosolekud/${k.id}/`}
                  onClick={() => setAvatud(false)}
                  className="block px-3 py-1.5 text-sm hover:bg-stone-100"
                >
                  {kuupaevLyhike(k.kuupaev)}
                  {k.kuupaev_lopp && `–${kuupaevLyhike(k.kuupaev_lopp)}`}
                  <span className="ml-2 text-xs text-stone-500">
                    {k.vorm} · {k.koosseis_id}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
