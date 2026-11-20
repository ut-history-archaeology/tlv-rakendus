import Link from "next/link";
import type { Koosseis } from "@/lib/types";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti } from "@/lib/format";

const ALGUS = Date.UTC(1917, 0, 1);
const LOPP = Date.UTC(1941, 11, 31);

function protsent(iso: string): number {
  const [a, k, p] = iso.split("-").map(Number);
  const t = Date.UTC(a, (k || 1) - 1, p || 1);
  return Math.max(0, Math.min(100, ((t - ALGUS) / (LOPP - ALGUS)) * 100));
}

/** AV-02: horisontaalne ajatelg 1917–1941, koosseisud värviribadena,
 * valimispäevad vertikaaljoontena. */
export default function Ajatelg({ koosseisud }: { koosseisud: Koosseis[] }) {
  const aastad = [1917, 1920, 1925, 1930, 1935, 1940];
  return (
    <figure aria-label="Koosseisude ajatelg 1917–1941">
      <div className="relative h-16 w-full rounded-md bg-stone-100">
        {koosseisud.map((k) => {
          const algus = k.valimised_algus || k.esimene_koosolek;
          const lopp = k.viimane_koosolek || k.valimised_lopp;
          if (!algus || !lopp) return null;
          const vasak = protsent(algus);
          const laius = Math.max(protsent(lopp) - vasak, 0.8);
          return (
            <Link
              key={k.koosseis_id}
              href={`/koosseisud/${k.koosseis_id}/`}
              title={`Koosseis ${k.koosseis_id} (${kuupaevEesti(algus)} – ${kuupaevEesti(lopp)})`}
              className="group absolute top-2 block h-8 rounded-sm transition-transform hover:scale-y-110 focus:outline-2 focus:outline-offset-2"
              style={{
                left: `${vasak}%`,
                width: `${laius}%`,
                backgroundColor: koosseisuVarv(k.koosseis_id),
              }}
            >
              <span className="sr-only">Koosseis {k.koosseis_id}</span>
              <span className="pointer-events-none absolute left-1/2 top-9 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {k.koosseis_id}
              </span>
            </Link>
          );
        })}
        {koosseisud.map((k) =>
          k.valimised_algus ? (
            <span
              key={"v" + k.koosseis_id}
              title={`Valimised: ${kuupaevEesti(k.valimised_algus)}`}
              className="absolute top-0 h-full w-px bg-stone-800/60"
              style={{ left: `${protsent(k.valimised_algus)}%` }}
              aria-hidden
            />
          ) : null
        )}
      </div>
      <div className="relative mt-1 h-5 w-full text-xs text-stone-500">
        {aastad.map((a) => (
          <span
            key={a}
            className="absolute -translate-x-1/2"
            style={{ left: `${protsent(String(a))}%` }}
          >
            {a}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {koosseisud.map((k) => (
          <Link
            key={k.koosseis_id}
            href={`/koosseisud/${k.koosseis_id}/`}
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: koosseisuVarv(k.koosseis_id) }}
              aria-hidden
            />
            {k.koosseis_id}
          </Link>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-stone-800/60" aria-hidden />
          valimispäev
        </span>
      </figcaption>
    </figure>
  );
}
