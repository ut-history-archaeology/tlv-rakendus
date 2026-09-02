import Link from "next/link";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti } from "@/lib/format";

const ALGUS = Date.UTC(1917, 0, 1);
const LOPP = Date.UTC(1941, 11, 31);

function protsent(iso: string): number {
  const [a, k, p] = iso.split("-").map(Number);
  const t = Date.UTC(a, (k || 1) - 1, p || 1);
  return Math.max(0, Math.min(100, ((t - ALGUS) / (LOPP - ALGUS)) * 100));
}

export interface KarjaariSegment {
  koosseis_id: string;
  algus: string;
  lopp: string;
}

/** PR-02: isiku karjääririba — Gantt-laadne ajatelg 1917–1941. */
export default function KarjaarRiba({ segmendid }: { segmendid: KarjaariSegment[] }) {
  const aastad = [1917, 1920, 1925, 1930, 1935, 1940];
  return (
    <figure aria-label="Karjäär ajateljel 1917–1941">
      <div className="relative h-10 w-full rounded-md bg-stone-100">
        {segmendid.map((s, i) => {
          const vasak = protsent(s.algus);
          const laius = Math.max(protsent(s.lopp) - vasak, 0.8);
          return (
            <Link
              key={i}
              href={`/koosseisud/${s.koosseis_id}/`}
              title={`${s.koosseis_id}: ${kuupaevEesti(s.algus)} – ${kuupaevEesti(s.lopp)}`}
              className="absolute top-1.5 block h-7 rounded-sm hover:opacity-80"
              style={{
                left: `${vasak}%`,
                width: `${laius}%`,
                backgroundColor: koosseisuVarv(s.koosseis_id),
              }}
            >
              <span className="sr-only">
                Koosseis {s.koosseis_id}: {kuupaevEesti(s.algus)} – {kuupaevEesti(s.lopp)}
              </span>
            </Link>
          );
        })}
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
    </figure>
  );
}
