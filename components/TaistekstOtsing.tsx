"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { kokkuvote, onKehtivParing, vajalikudAastad, OLEMI_BITID, OTSINGU_MIN_PIKKUS } from "@/lib/protokollid/otsing";
import { OLEMI_NIMED, type OlemiTyyp } from "@/lib/colors";
import type { OlemiTyyp as OlemiTyypT } from "@/lib/protokollid/types";
import { MitmikValik } from "./TabeliOsad";
import type { OtsinguParing, OtsinguVastus, TabamusKuva } from "@/lib/protokollid/otsing.worker";
import { kuupaevLyhike } from "@/lib/format";
import { useDebounce } from "@/lib/useTabeliSeis";
import ExportButton from "./ExportButton";
import { Paginatsioon } from "./TabeliOsad";

const LEHE_SUURUS = 50;

interface Props {
  q: string;
  setQ: (q: string) => void;
  algus: string;
  lopp: string;
  /** olemasolevad aastakillud (_meta.json) */
  killud: number[];
  /** PT-07: valitud nimeüksuste tüübid, komaga eraldatud (PER,ORG,…) */
  tyybid: string;
  setTyybid: (t: string) => void;
}

const TYYBID: OlemiTyyp[] = ["PER", "ORG", "LOC", "MONEY", "POSITION"];

export function tyybiMask(tyybid: string): number {
  return tyybid.split(",").filter(Boolean).reduce((m, t) => m | (OLEMI_BITID[t as OlemiTyypT] ?? 0), 0);
}

/**
 * PT-02 täistekstiotsing: kast (`?q=`, debounce 300 ms, min 3 märki), Web Worker, killud
 * laetakse ainult ajavahemiku aastate kohta (PT-06), tulemused protokollide kaupa
 * kronoloogiliselt, tabamus `<mark>`-iga, paginatsioon 50 tabamust, eksport.
 */
export default function TaistekstOtsing({ q, setQ, algus, lopp, killud, tyybid, setTyybid }: Props) {
  const mask = tyybiMask(tyybid);
  const valitudTyybid = tyybid.split(",").filter(Boolean);
  const paring = useDebounce(q, 300);
  const worker = useRef<Worker | null>(null);
  const paringId = useRef(0);
  const [laen, setLaen] = useState<{ aasta: number; laetud: number; kokku: number } | null>(null);
  const [tulemus, setTulemus] = useState<{ q: string; tabamused: TabamusKuva[]; kestus: number } | null>(null);
  const [viga, setViga] = useState<string | null>(null);
  const [leht, setLeht] = useState(1);
  const [kontekst, setKontekst] = useState(1);

  useEffect(() => {
    try {
      const k = Number(localStorage.getItem("tlv-otsing-kontekst"));
      if (k === 1 || k === 2 || k === -1) setKontekst(k);
    } catch {
      /* ignoreeri */
    }
  }, []);

  useEffect(() => {
    return () => worker.current?.terminate();
  }, []);

  useEffect(() => {
    const kehtiv = onKehtivParing(paring) || (mask > 0 && paring.trim() === "");
    if (!kehtiv) {
      setTulemus(null);
      setLaen(null);
      setViga(null);
      return;
    }
    if (!worker.current) {
      worker.current = new Worker(new URL("../lib/protokollid/otsing.worker.ts", import.meta.url));
    }
    const w = worker.current;
    const id = ++paringId.current;
    const algusAeg = performance.now();
    setViga(null);
    setLeht(1);
    function vastus(e: MessageEvent<OtsinguVastus>) {
      const v = e.data;
      if (v.id !== id) return;
      if (v.tyyp === "laen") setLaen({ aasta: v.aasta, laetud: v.laetud, kokku: v.kokku });
      else if (v.tyyp === "tulemus") {
        setLaen(null);
        setTulemus({ q: paring, tabamused: v.tabamused, kestus: performance.now() - algusAeg });
      } else {
        setLaen(null);
        setViga(v.sonum);
      }
    }
    w.addEventListener("message", vastus);
    const sonum: OtsinguParing = {
      tyyp: "otsi", id, q: paring, aastad: vajalikudAastad(killud, algus || undefined, lopp || undefined),
      mask, algus, lopp, kontekst,
    };
    w.postMessage(sonum);
    return () => w.removeEventListener("message", vastus);
  }, [paring, algus, lopp, killud, kontekst, mask]);

  const kokku = tulemus ? kokkuvote(tulemus.tabamused) : null;
  const lehti = tulemus ? Math.max(1, Math.ceil(tulemus.tabamused.length / LEHE_SUURUS)) : 1;
  const nahtavad = useMemo(() => {
    if (!tulemus) return [];
    const l = Math.min(leht, lehti);
    return tulemus.tabamused.slice((l - 1) * LEHE_SUURUS, l * LEHE_SUURUS);
  }, [tulemus, leht, lehti]);

  // grupeerimine protokollide kaupa (nähtava lehe piires)
  const grupid = useMemo(() => {
    const m = new Map<string, TabamusKuva[]>();
    for (const t of nahtavad) {
      const l = m.get(t.id) ?? [];
      l.push(t);
      m.set(t.id, l);
    }
    return [...m.entries()];
  }, [nahtavad]);

  const ekspordiRead = (tulemus?.tabamused ?? []).map((t) => ({
    protokoll: t.id,
    kuupaev: t.kuupaev,
    kuupaev_lopp: t.kuupaev_lopp,
    punkt: t.punkt,
    lause: t.lause_tekst,
    kontekst: t.kontekst_tekst,
  }));

  const lyhike = q.trim().length > 0 && !onKehtivParing(q);

  return (
    <section aria-labelledby="otsing-pealkiri" className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 id="otsing-pealkiri" className="sr-only">Täistekstiotsing protokollidest</h2>
      <p className="mb-2 text-xs text-stone-500">
        Tekst on OCR-i ja automaatse normaliseeringu tulemus; osa sõnu võib olla valesti loetud.
        Otsing on tõstu-, diakriitika- ja w/v-tundetu („walimine“ = „valimine“); tulemused kuvatakse
        normaliseeritud kirjakujus.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Otsi fraasi (vähemalt {OTSINGU_MIN_PIKKUS} märki)</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="nt walimine, raekojas, Lui Olesk"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
        </label>
        <div className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Nimeüksuse tüüp lauses</span>
          <MitmikValik
            silt="Tüüp"
            valikud={TYYBID.map((t) => ({ id: t, nimi: OLEMI_NIMED[t] }))}
            valitud={valitudTyybid}
            muuda={(uus) => setTyybid(TYYBID.filter((t) => uus.includes(t)).join(","))}
          />
        </div>
        <label className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Kontekst</span>
          <select
            value={kontekst}
            onChange={(e) => {
              const k = Number(e.target.value);
              setKontekst(k);
              try {
                localStorage.setItem("tlv-otsing-kontekst", String(k));
              } catch {
                /* ignoreeri */
              }
            }}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value={1}>1 lause (±1)</option>
            <option value={2}>laiem kontekst (±2 lauset)</option>
            <option value={-1}>kogu päevakorrapunkt</option>
          </select>
        </label>
        {tulemus && tulemus.tabamused.length > 0 && (
          <ExportButton
            read={ekspordiRead}
            veerud={[
              { key: "protokoll", pealkiri: "Protokoll (koosolek_id)" },
              { key: "kuupaev", pealkiri: "Kuupäev" },
              { key: "kuupaev_lopp", pealkiri: "Lõppkuupäev" },
              { key: "punkt", pealkiri: "Päevakorrapunkt" },
              { key: "lause", pealkiri: "Lause" },
              { key: "kontekst", pealkiri: "Kontekst" },
            ]}
            meta={{
              failinimi: `tlv-protokollid-otsing-${(tulemus.q || tyybid).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}`,
              filtrid: {
                paring: tulemus.q, ...(tyybid ? { tyybid } : {}),
                ...(algus ? { alates: algus } : {}), ...(lopp ? { kuni: lopp } : {}),
              },
            }}
          />
        )}
      </div>

      <div aria-live="polite" className="mt-3 text-sm">
        {lyhike && mask === 0 && <p className="text-stone-500">Sisesta vähemalt {OTSINGU_MIN_PIKKUS} märki.</p>}
        {mask > 0 && (
          <p className="text-xs text-stone-500">
            Tüübifilter: {valitudTyybid.map((t) => OLEMI_NIMED[t as OlemiTyyp]).join(", ")} — {paring.trim() ? "tabamused ainult lausetes, kus tüüp esineb" : "kõik laused, kus tüüp esineb"} (automaatmärgendus).
          </p>
        )}
        {laen && (
          <p className="text-stone-600">
            Laen {laen.aasta}… ({laen.laetud + 1}/{laen.kokku})
          </p>
        )}
        {viga && <p className="text-red-700">{viga}</p>}
        {tulemus && kokku && !laen && (
          <p className="font-medium">
            {kokku.tabamusi === 0
              ? `${tulemus.q.trim() ? `„${tulemus.q}“: ` : ""}tabamusi ei leitud${algus || lopp ? " valitud ajavahemikus" : ""}.`
              : `${kokku.tabamusi} tabamust ${kokku.protokolle} protokollis`}
            <span className="ml-2 text-xs font-normal text-stone-400">({Math.round(tulemus.kestus)} ms)</span>
          </p>
        )}
      </div>

      {tulemus && grupid.length > 0 && (
        <ol className="mt-3 space-y-4">
          {grupid.map(([id, tabamused]) => {
            const t0 = tabamused[0];
            return (
              <li key={id}>
                <h3 className="mb-1 font-semibold">
                  <Link href={`/protokollid/${id}/?q=${encodeURIComponent(tulemus.q)}`} className="hover:underline">
                    Protokoll {kuupaevLyhike(t0.kuupaev)}
                    {t0.kuupaev_lopp && <>–{kuupaevLyhike(t0.kuupaev_lopp)}</>}
                  </Link>
                  <span className="ml-2 text-xs font-normal text-stone-500">{tabamused.length} tabamust sellel lehel</span>
                </h3>
                <ul className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                  {tabamused.map((t, i) => (
                    <li key={i} className="text-sm">
                      <Link
                        href={`/protokollid/${id}/?q=${encodeURIComponent(tulemus.q)}#${t.ankur}`}
                        className="mr-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 hover:bg-stone-200"
                        title="Ava protokoll selles kohas"
                      >
                        {t.punkt !== null ? `p. ${t.punkt}` : t.ankur === "sissejuhatus" ? "sissejuhatus" : t.ankur === "lopuosa" ? "lõpuosa / lisa" : "tekst"}
                      </Link>
                      <span className="text-stone-700">
                        {t.kontekst_tekst.slice(0, t.vaste_algus)}
                        <mark className="otsing-vaste">{t.kontekst_tekst.slice(t.vaste_algus, t.vaste_algus + t.vaste_pikkus)}</mark>
                        {t.kontekst_tekst.slice(t.vaste_algus + t.vaste_pikkus)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
      {tulemus && tulemus.tabamused.length > LEHE_SUURUS && (
        <Paginatsioon leht={Math.min(leht, lehti)} lehti={lehti} setLeht={setLeht} kokku={tulemus.tabamused.length} />
      )}
    </section>
  );
}
