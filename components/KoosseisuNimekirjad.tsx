import type { KoosseisuNimekiriRida } from "@/lib/derive";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "./HelpTip";
import KontrollimiselMark from "./KontrollimiselMark";

function qid(url: string): string {
  return url.match(/Q\d+$/)?.[0] ?? url;
}

/** NK-03: koosseisu valimiste ametlikud nimekirjad (TLV_nimekirjad.xlsx Sheet1). */
export default function KoosseisuNimekirjad({ read, aasta }: { read: KoosseisuNimekiriRida[]; aasta: string }) {
  if (read.length === 0) return null;
  const onNr = read.some((r) => r.nr);
  const onHaaled = read.some((r) => r.haaled !== null);
  const onWikidata = read.some((r) => r.wikidata.length > 0);
  const onValituid = read.some((r) => r.valituid !== null);
  return (
    <section aria-labelledby="nimekirjad">
      <h2 id="nimekirjad" className="mb-2 text-xl font-semibold">
        {aasta}. aasta valimiste nimekirjad
        <HelpTip tekst="Ametlikud nimekirjad valimistulemuste allika järgi. Ühtlustatud nimi seob sama poliitilise rühma eri aastate nimekirjad. Valituid loetakse ühtlustatud nimekirja kaupa: kui sama rühm esines mitme alamnimekirjaga, on arv neil ühine." />
      </h2>
      <div className="overflow-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              {onNr && <th scope="col" className="px-3 py-2 text-right font-semibold">Nr</th>}
              <th scope="col" className="px-3 py-2 text-left font-semibold">Ametlik nimi</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                <span className="inline-flex items-center">
                  Ühtlustatud nimekiri
                  <HelpTip tekst={ABI.nimekiri} />
                </span>
              </th>
              {onHaaled && <th scope="col" className="px-3 py-2 text-right font-semibold">Hääled</th>}
              {onValituid && <th scope="col" className="px-3 py-2 text-right font-semibold">Valituid</th>}
              {onWikidata && <th scope="col" className="px-3 py-2 text-left font-semibold">Wikidata</th>}
            </tr>
          </thead>
          <tbody>
            {read.map((r, i) => (
              <tr key={i} className="border-b border-stone-100 align-top">
                {onNr && <td className="px-3 py-1.5 text-right tabular-nums">{r.nr || "—"}</td>}
                <td className="px-3 py-1.5">{r.nimi}</td>
                {r.ryhm > 0 && (
                  <td className="px-3 py-1.5" rowSpan={r.ryhm}>
                    {r.kanooniline || <span className="text-stone-400">—</span>}
                  </td>
                )}
                {onHaaled && (
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.haaled !== null ? r.haaled.toLocaleString("et-EE") : "—"}
                  </td>
                )}
                {onValituid && r.ryhm > 0 && (
                  <td className="px-3 py-1.5 text-right tabular-nums" rowSpan={r.ryhm}>
                    {r.valituid ?? "—"}
                    {r.kontrollida && <KontrollimiselMark />}
                  </td>
                )}
                {onWikidata && (
                  <td className="px-3 py-1.5">
                    {r.wikidata.map((w, j) => (
                      <a
                        key={j}
                        href={w}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-2 text-blue-700 underline"
                      >
                        {qid(w)}<span aria-hidden> ↗</span>
                      </a>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
