"use client";

import { useState } from "react";
import { ekspordiFailinimi, koostaJsonMeta, koostaMarkdown, koostaTxt, type Kirjakuju } from "@/lib/protokollid/eksport";
import { laeProtokollAndmed } from "@/lib/protokollid/laadi";
import { aktiivnePunkt, kopeeriViide, leheUrl, teade, type ViiteBaas } from "@/lib/protokollid/viide-klient";

/**
 * PT-09: protokolli eksport (JSON / TXT / Markdown), print/PDF ja "Kopeeri viide".
 * Protokolliandmed laetakse alles nupuvajutusel public/protokollid/<id>.json-ist (leht ise jääb kergeks).
 */
export default function ProtokollTegevused({ id, kuupaev, viide }: { id: string; kuupaev: string; viide: ViiteBaas }) {
  const [laadin, setLaadin] = useState<string | null>(null);

  function kirjakuju(): Kirjakuju {
    try {
      return localStorage.getItem("tlv-kirjakuju") === "mod" ? "moderniseeritud" : "ajalooline";
    } catch {
      return "ajalooline";
    }
  }

  function laeAlla(sisu: string, mime: string, laiend: string) {
    const blob = new Blob([sisu], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ekspordiFailinimi(id, kuupaev, laiend, new Date().toISOString().slice(0, 10));
    a.click();
    URL.revokeObjectURL(url);
  }

  async function ekspordi(vorming: "json" | "txt" | "md") {
    setLaadin(vorming);
    try {
      const p = await laeProtokollAndmed(id);
      const k = { kuupaevad: viide.kuupaevad, url: leheUrl(), kirjakuju: kirjakuju() };
      if (vorming === "json") {
        laeAlla(JSON.stringify({ meta: koostaJsonMeta(p, k), protokoll: p }, null, 2), "application/json", "json");
      } else if (vorming === "txt") {
        laeAlla(koostaTxt(p, k), "text/plain", "txt");
      } else {
        laeAlla(koostaMarkdown(p, k), "text/markdown", "md");
      }
    } catch (e) {
      teade(e instanceof Error ? e.message : "Eksport ebaõnnestus");
    } finally {
      setLaadin(null);
    }
  }

  const nupp = "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50";
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" onClick={() => ekspordi("json")} disabled={laadin !== null} className={nupp}>
        ↓ JSON
      </button>
      <button type="button" onClick={() => ekspordi("txt")} disabled={laadin !== null} className={nupp}>
        ↓ TXT
      </button>
      <button type="button" onClick={() => ekspordi("md")} disabled={laadin !== null} className={nupp}>
        ↓ Markdown
      </button>
      <button type="button" onClick={() => window.print()} className={nupp}>
        Prindi / PDF
      </button>
      <button type="button" onClick={() => void kopeeriViide(viide, aktiivnePunkt())} className={nupp}>
        Kopeeri viide
      </button>
    </div>
  );
}
