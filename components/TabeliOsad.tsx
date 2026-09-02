"use client";

import type { ReactNode } from "react";
import type { SortVeerg } from "@/lib/useTabeliSeis";

/** Sorteeritav veerupäis (UN-05, UN-06): klõps = sort, Shift+klõps = teisene. */
export function SortPais({
  veerg, pealkiri, sort, sordi, klass,
}: {
  veerg: string;
  pealkiri: string;
  sort: SortVeerg[];
  sordi: (key: string, shift: boolean) => void;
  klass?: string;
}) {
  const idx = sort.findIndex((s) => s.key === veerg);
  const aktiivne = idx >= 0 ? sort[idx] : null;
  return (
    <th
      scope="col"
      aria-sort={
        aktiivne ? (aktiivne.desc ? "descending" : "ascending") : undefined
      }
      className={`whitespace-nowrap px-3 py-2 text-left font-semibold ${klass ?? ""}`}
    >
      <button
        type="button"
        onClick={(e) => sordi(veerg, e.shiftKey)}
        title="Klõps: sorteeri; Shift+klõps: teisene sorteerimisveerg"
        className="inline-flex items-center gap-1 hover:text-stone-900"
      >
        {pealkiri}
        {aktiivne && (
          <span aria-hidden className="text-stone-500">
            {aktiivne.desc ? "▼" : "▲"}
            {sort.length > 1 && (
              <sup className="ml-0.5 text-[10px]">{idx + 1}</sup>
            )}
          </span>
        )}
      </button>
    </th>
  );
}

/** Aktiivsete filtrite kiibid (UN-02) + "Tühjenda kõik" (UN-03). */
export function FiltriKiibid({
  kiibid, tyhjenda,
}: {
  kiibid: { key: string; silt: string; eemalda: () => void }[];
  tyhjenda: () => void;
}) {
  if (kiibid.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {kiibid.map((k) => (
        <span
          key={k.key}
          className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-3 py-1 text-xs text-stone-800"
        >
          {k.silt}
          <button
            type="button"
            aria-label={`Eemalda filter: ${k.silt}`}
            onClick={k.eemalda}
            className="ml-0.5 rounded-full px-1 font-bold hover:bg-stone-300"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={tyhjenda}
        className="text-xs text-stone-600 underline hover:text-stone-900"
      >
        Tühjenda kõik filtrid
      </button>
    </div>
  );
}

/** Paginatsioon (UN-07). */
export function Paginatsioon({
  leht, lehti, setLeht, kokku,
}: {
  leht: number;
  lehti: number;
  setLeht: (l: number) => void;
  kokku: number;
}) {
  if (lehti <= 1) {
    return (
      <p className="mt-3 text-sm text-stone-600">{kokku} kirjet</p>
    );
  }
  return (
    <nav
      aria-label="Lehekülgede vahel liikumine"
      className="mt-3 flex flex-wrap items-center gap-2 text-sm"
    >
      <button
        type="button"
        disabled={leht <= 1}
        onClick={() => setLeht(leht - 1)}
        className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-40"
      >
        ← Eelmine
      </button>
      <span className="text-stone-600">
        Leht {leht} / {lehti} ({kokku} kirjet)
      </span>
      <button
        type="button"
        disabled={leht >= lehti}
        onClick={() => setLeht(leht + 1)}
        className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-40"
      >
        Järgmine →
      </button>
    </nav>
  );
}

/** Mitmikvaliku ripploend (checkbox-listiga). */
export function MitmikValik({
  silt, valikud, valitud, muuda, hoiatus,
}: {
  silt: string;
  valikud: { id: string; nimi: string; arv?: number }[];
  valitud: string[];
  muuda: (uus: string[]) => void;
  hoiatus?: string;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer select-none rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50">
        {silt}
        {valitud.length > 0 && (
          <span className="ml-1 rounded-full bg-stone-800 px-1.5 text-xs text-white">
            {valitud.length}
          </span>
        )}
      </summary>
      <div className="absolute z-30 mt-1 max-h-72 w-80 overflow-auto rounded-md border border-stone-200 bg-white p-2 shadow-lg">
        {hoiatus && (
          <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
            ⚠ {hoiatus}
          </p>
        )}
        {valikud.map((v) => (
          <label
            key={v.id}
            className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-stone-50"
          >
            <input
              type="checkbox"
              checked={valitud.includes(v.id)}
              onChange={(e) =>
                muuda(
                  e.target.checked
                    ? [...valitud, v.id]
                    : valitud.filter((x) => x !== v.id)
                )
              }
              className="mt-0.5"
            />
            <span>
              {v.nimi}
              {v.arv !== undefined && (
                <span className="ml-1 text-xs text-stone-400">({v.arv})</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

/** Tabeli ümbris horisontaalse kerimisega kitsal ekraanil. */
export function TabeliYmbris({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

/** "Minu vaade" nupud (UN-08). */
export function MinuVaade({
  salvesta, ava, olemas,
}: {
  salvesta: () => void;
  ava: () => void;
  olemas: boolean;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        onClick={salvesta}
        title="Salvesta praegused filtrid ja sorteerimine brauserisse"
        className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-600 hover:bg-stone-50"
      >
        ☆ Salvesta vaade
      </button>
      {olemas && (
        <button
          type="button"
          onClick={ava}
          title="Ava salvestatud vaade"
          className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-600 hover:bg-stone-50"
        >
          ★ Minu vaade
        </button>
      )}
    </div>
  );
}
