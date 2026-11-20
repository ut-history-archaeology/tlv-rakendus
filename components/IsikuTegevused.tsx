"use client";

import { useState } from "react";
import { isikuViide } from "@/lib/isikuviide";

const NUPP =
  "inline-flex min-h-11 items-center text-hall underline decoration-raam underline-offset-2 hover:text-tekst";

/**
 * PR5-05: Kopeeri viide (isiku tsitaat), Lae alla (PDF) = brauseri print, Lae alla (JSON) = profiil
 * (sisu nagu PR-09, + isanimi ja AKL ID).
 */
export default function IsikuTegevused({
  nimi, profiil, failinimi,
}: {
  nimi: string;
  profiil: unknown;
  failinimi: string;
}) {
  const [kopeeritud, setKopeeritud] = useState(false);

  async function kopeeri() {
    const tekst = isikuViide({ nimi, leheUrl: window.location.href.split("#")[0] });
    try {
      await navigator.clipboard.writeText(tekst);
      setKopeeritud(true);
      setTimeout(() => setKopeeritud(false), 2500);
    } catch {
      window.prompt("Kopeeri viide:", tekst);
    }
  }

  function laadiJSON() {
    const sisu = {
      meta: {
        allikas: "Tartu Linnavolikogu andmestik, 2026",
        eksporditud: new Date().toISOString(),
        url: window.location.href,
      },
      profiil,
    };
    const blob = new Blob([JSON.stringify(sisu, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${failinimi}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <span className="no-print flex flex-wrap gap-x-5">
      <button type="button" onClick={kopeeri} className={NUPP}>
        {kopeeritud ? "Viide kopeeritud" : "Kopeeri viide"}
      </button>
      <button type="button" onClick={() => window.print()} className={NUPP}>
        Lae alla (PDF)
      </button>
      <button type="button" onClick={laadiJSON} className={NUPP}>
        Lae alla (JSON)
      </button>
      <span className="sr-only" aria-live="polite">{kopeeritud ? "Viide kopeeritud" : ""}</span>
    </span>
  );
}
