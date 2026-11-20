"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { IsikuRida } from "@/lib/types";
import { multiSort, useDebounce, useTabeliSeis } from "@/lib/useTabeliSeis";
import {
  ISIKUTE_ALIASED, ISIKUTE_EKSPORDI_VEERUD, VAIKE_SORT,
  filtreeriIsikud, isikuEkspordiRida, isikuFiltrid, isikuSortVaartus, koosseiseTekst,
} from "@/lib/isikuloend";
import { LIIKMEKIRJE_PUUDUB } from "@/lib/derive";
import ExportButton from "./ExportButton";

const LEHE_SUURUS = 50;
const MITU = "__mitu";

/** "1927-1929" → "1927–1929" */
const koosseisuNimi = (id: string) => id.replace("-", "–");

/**
 * IS5-02…IS5-04: isikute nimekiri — suur otsing, kaks üksikvalikut, loend (kogu rida = link),
 * "Näita veel" ja allalaadimine. `juhataja` ja `sort` URL-ist rakendatakse, UI-s neid pole (E5-04).
 */
export default function IsikudLoend({ read, koosseisud }: { read: IsikuRida[]; koosseisud: string[] }) {
  const seis = useTabeliSeis(
    { q: "", koosseisud: "", nimekirjad: "", juhataja: "" },
    "tlv-vaade-isikud",
    [],
    ISIKUTE_ALIASED
  );
  const otsing = useDebounce(seis.filtrid.q);
  const f = isikuFiltrid({ ...seis.filtrid, q: otsing });

  // NK-03: kanoonilised nimekirjad (ainult need, mis on mõne isiku peamine nimekiri)
  const nimekirjad = useMemo(() => {
    const loend = new Map<string, string>();
    for (const r of read) {
      if (r.peamine_nimekiri_id !== null) loend.set(String(r.peamine_nimekiri_id), r.peamine_nimekiri);
    }
    return [...loend.entries()]
      .map(([id, nimi]) => ({ id, nimi }))
      .sort((a, b) => a.nimi.localeCompare(b.nimi, "et"));
  }, [read]);

  const filtreeritud = useMemo(
    () => filtreeriIsikud(read, f),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [read, otsing, seis.filtrid.koosseisud, seis.filtrid.nimekirjad, seis.filtrid.juhataja]
  );
  const sorditud = useMemo(
    () => multiSort(filtreeritud, seis.sort.length ? seis.sort : VAIKE_SORT, isikuSortVaartus),
    [filtreeritud, seis.sort]
  );

  // "Näita veel": `leht` = mitu 50-st plokki on näha (senine parameeter jääb URL-is toimima)
  const nahtavad = sorditud.slice(0, seis.leht * LEHE_SUURUS);
  const onVeel = sorditud.length > nahtavad.length;

  const valikuVaartus = (v: string[]) => (v.length > 1 ? MITU : v[0] ?? "");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <label className="flex min-h-16 items-center gap-3 rounded-xl border border-raam bg-pind px-5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-link">
          <span className="sr-only">Otsi nime järgi</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0 text-hall">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            type="search"
            value={seis.filtrid.q}
            onChange={(e) => seis.setFilter("q", e.target.value)}
            placeholder="Otsi nime järgi, nt Allik"
            className="min-w-0 flex-1 bg-transparent text-[20px] text-tekst placeholder:text-hall focus:outline-none focus-visible:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px]">
          <label className="flex items-center gap-2">
            <span className="text-hall">Koosseis</span>
            <select
              value={valikuVaartus(f.koosseisud)}
              onChange={(e) => seis.setFilter("koosseisud", e.target.value)}
              className="min-h-11 border-b border-raam bg-transparent py-2 pr-6 text-tekst"
            >
              <option value="">kõik</option>
              {f.koosseisud.length > 1 && <option value={MITU} disabled>mitu valitud</option>}
              {koosseisud.map((k) => (
                <option key={k} value={k}>{koosseisuNimi(k)}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 items-center gap-2">
            <span className="text-hall">Nimekiri</span>
            <select
              value={valikuVaartus(f.nimekirjad)}
              onChange={(e) => seis.setFilter("nimekirjad", e.target.value)}
              className="min-h-11 w-full max-w-[16rem] border-b border-raam bg-transparent py-2 pr-6 text-tekst sm:max-w-[20rem]"
            >
              <option value="">kõik</option>
              {f.nimekirjad.length > 1 && <option value={MITU} disabled>mitu valitud</option>}
              {nimekirjad.map((n) => (
                <option key={n.id} value={n.id}>{n.nimi}</option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-sm text-hall" aria-live="polite">
            {sorditud.length} {sorditud.length === 1 ? "nimi" : "nime"}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {nahtavad.length > 0 ? (
          <ul className="border-b border-joon">
            {nahtavad.map((r) => (
              <li key={r.isik_id}>
                <IsikuRidaLink r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-t border-joon py-6 text-tekst-2">
            <p>Ühtegi nime ei leitud.</p>
            <button
              type="button"
              onClick={seis.tyhjendaFiltrid}
              className="mt-1 inline-flex min-h-11 items-center text-link underline underline-offset-2 hover:text-link-hover"
            >
              Tühjenda otsing
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
          {onVeel ? (
            <button
              type="button"
              onClick={() => seis.setLeht(seis.leht + 1)}
              className="inline-flex min-h-11 items-center text-link underline underline-offset-2 hover:text-link-hover"
            >
              Näita veel
            </button>
          ) : <span />}
          <ExportButton
            read={sorditud.map(isikuEkspordiRida)}
            veerud={ISIKUTE_EKSPORDI_VEERUD}
            meta={{
              failinimi: "tlv-isikud",
              filtrid: Object.fromEntries([
                ...(f.q.trim() ? [["q", `Otsing: ${f.q.trim()}`]] : []),
                ...f.koosseisud.map((k) => ["k" + k, `Koosseis ${k}`]),
                ...f.nimekirjad.map((n) => ["n" + n, `Nimekiri: ${nimekirjad.find((x) => x.id === n)?.nimi ?? n}`]),
                ...(f.juhataja ? [["j", "Oli juhataja"]] : []),
              ]),
            }}
            silt="Lae nimekiri alla"
            nupuKlass="inline-flex min-h-11 items-center text-sm text-hall underline decoration-raam underline-offset-2 hover:text-tekst"
          />
        </div>
      </div>
    </div>
  );
}

/** IS5-03: kogu rida on üks link. */
function IsikuRidaLink({ r }: { r: IsikuRida }) {
  const puudub = r.liikmekirje_puudub ? `${LIIKMEKIRJE_PUUDUB}. Tõendid: ${r.liikmekirje_puudub}` : "";
  const meta = [
    puudub ? "koosseis teadmata" : koosseiseTekst(r.koosseise),
    r.peamine_nimekiri,
  ].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/isikud/${r.isik_id}/`}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 border-t border-joon py-[18px] text-tekst hover:text-tekst"
    >
      <span className="font-pealkiri text-[22px] font-medium leading-snug group-hover:text-link">
        {[r.perenimi, r.eesnimi].filter(Boolean).join(", ") || "—"}
      </span>
      <span className="text-sm tabular-nums text-hall" title={puudub || undefined}>
        {puudub ? "?" : r.aastad ?? ""}
      </span>
      <span className="col-span-2 text-sm text-hall" title={puudub || undefined}>
        {meta}
      </span>
    </Link>
  );
}
