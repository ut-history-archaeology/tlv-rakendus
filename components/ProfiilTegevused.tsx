"use client";

/** PR-09: profiili eksport (JSON) + prindi/PDF nupud. */
export default function ProfiilTegevused({
  profiil, failinimi,
}: {
  profiil: unknown;
  failinimi: string;
}) {
  function laadiJSON() {
    const sisu = {
      meta: {
        allikas: "Tartu Linnavolikogu andmestik, 2026",
        eksporditud: new Date().toISOString(),
        url: window.location.href,
      },
      profiil,
    };
    const blob = new Blob([JSON.stringify(sisu, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${failinimi}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print flex gap-2">
      <button
        type="button"
        onClick={laadiJSON}
        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        ↓ JSON
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        Prindi / PDF
      </button>
    </div>
  );
}
