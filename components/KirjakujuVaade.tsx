"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ABI } from "@/lib/abitekstid";
import { moderniseeri } from "@/lib/protokollid/kirjakuju";
import { laeProtokollAndmed } from "@/lib/protokollid/laadi";
import type { ProtokollAndmed } from "@/lib/protokollid/types";
import HelpTip from "./HelpTip";
import ProtokollTekst from "./ProtokollTekst";

/**
 * PT-08 kirjakuju-lüliti "Ajalooline ↔ Moderniseeritud". Ajalooline kuju on serveris renderdatud
 * (`children`); moderniseeritud kuju jaoks laetakse protokolli JSON ja renderdatakse tekst kliendis
 * uuesti (`moderniseeri()` nihutab kõik vahemikud). Seis: localStorage `tlv-kirjakuju` ("mod") ja URL `?kuju=mod`.
 */
export default function KirjakujuVaade({
  id, nimed, sonu, children,
}: {
  id: string;
  /** isik_id → kanooniline nimi (ainult selles protokollis esinevad) */
  nimed: Record<string, string>;
  sonu: number;
  children: ReactNode;
}) {
  const [mod, setMod] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [andmed, setAndmed] = useState<(ProtokollAndmed & { asendusi: number }) | null>(null);
  const [laen, setLaen] = useState(false);
  const [viga, setViga] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const p = new URLSearchParams(window.location.search);
    let m = p.get("kuju") === "mod";
    if (!p.has("kuju")) {
      try {
        m = localStorage.getItem("tlv-kirjakuju") === "mod";
      } catch {
        /* ignoreeri */
      }
    }
    setMod(m);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("tlv-kirjakuju", mod ? "mod" : "ajalooline");
    } catch {
      /* ignoreeri */
    }
    const p = new URLSearchParams(window.location.search);
    if (mod) p.set("kuju", "mod");
    else p.delete("kuju");
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? "?" + qs : ""}${window.location.hash}`);
  }, [mod, mounted]);

  useEffect(() => {
    if (!mod || andmed) return;
    setLaen(true);
    laeProtokollAndmed(id)
      .then((p) => setAndmed(moderniseeri(p)))
      .catch((e) => setViga(e instanceof Error ? e.message : "Laadimine ebaõnnestus"))
      .finally(() => setLaen(false));
  }, [mod, andmed, id]);

  const nimedMap = new Map(Object.entries(nimed).map(([k, v]) => [Number(k), v]));
  const naitaMod = !!(mod && andmed && !viga);

  // tekst renderdati ümber (kliendis või tagasi serveri omale) → ProtokollJuht rakendab #p, ?q, ?isik uuesti
  const eelmineKuju = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (eelmineKuju.current !== null && eelmineKuju.current !== naitaMod) {
      window.dispatchEvent(new Event("tlv-tekst-uuendatud"));
    }
    eelmineKuju.current = naitaMod;
  }, [naitaMod, mounted]);

  return (
    <div className="space-y-2">
      <div className="no-print flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-stone-500">Kirjakuju:</span>
        <div role="group" aria-label="Kirjakuju" className="inline-flex rounded-md border border-stone-300 bg-white text-xs">
          <button
            type="button"
            aria-pressed={!mod}
            onClick={() => setMod(false)}
            className={`rounded-l-md px-2.5 py-1 ${!mod ? "bg-stone-800 text-white" : "text-stone-700 hover:bg-stone-50"}`}
          >
            Ajalooline
          </button>
          <button
            type="button"
            aria-pressed={mod}
            onClick={() => setMod(true)}
            className={`rounded-r-md px-2.5 py-1 ${mod ? "bg-stone-800 text-white" : "text-stone-700 hover:bg-stone-50"}`}
          >
            Moderniseeritud
          </button>
        </div>
        <HelpTip tekst={ABI.kirjakuju} />
        {laen && <span className="text-xs text-stone-500">Laen…</span>}
        {viga && <span className="text-xs text-red-700">{viga}</span>}
        {naitaMod && (
          <span className="text-xs text-stone-500">
            {andmed.asendusi.toLocaleString("et")} sõna {sonu.toLocaleString("et")}-st moderniseeritud (automaatne)
          </span>
        )}
      </div>
      {naitaMod ? <ProtokollTekst p={andmed} nimed={nimedMap} /> : children}
    </div>
  );
}
