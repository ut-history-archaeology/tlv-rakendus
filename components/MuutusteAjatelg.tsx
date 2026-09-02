import { kuupaevEesti, kuupaevLyhike } from "@/lib/format";

const LIIGI_VARV: Record<string, string> = {
  liitumine: "#16a34a",
  lahkumine: "#dc2626",
  "liitumine&lahkumine": "#ca8a04",
  rühmavahetus: "#7c3aed",
  peatamine: "#6b7280",
};

interface Props {
  algus: string;
  lopp: string;
  muutused: { kuupaev: string; liik: string }[];
  koosolekud: string[]; // kuupäevad
}

function protsent(iso: string, algus: number, lopp: number): number {
  const [a, k, p] = iso.split("-").map(Number);
  const t = Date.UTC(a, (k || 1) - 1, p || 1);
  return Math.max(0, Math.min(100, ((t - algus) / (lopp - algus)) * 100));
}

function utc(iso: string): number {
  const [a, k, p] = iso.split("-").map(Number);
  return Date.UTC(a, (k || 1) - 1, p || 1);
}

/** KS-05: muutuste ajatelg koosseisu kestuse peal, koosolekud vertikaaljoontena. */
export default function MuutusteAjatelg({ algus, lopp, muutused, koosolekud }: Props) {
  if (!algus || !lopp) return null;
  const a = utc(algus);
  const l = utc(lopp);
  if (l <= a) return null;

  // Kuhja samale päevale langevad muutused üksteise peale
  const paevad = new Map<string, { kuupaev: string; liik: string }[]>();
  for (const m of muutused) {
    if (!m.kuupaev) continue;
    const list = paevad.get(m.kuupaev) ?? [];
    list.push(m);
    paevad.set(m.kuupaev, list);
  }

  return (
    <figure>
      <div className="relative h-20 w-full rounded-md bg-stone-100">
        {koosolekud.map((k, i) => (
          <span
            key={i}
            title={`Koosolek: ${kuupaevEesti(k)}`}
            className="absolute top-0 h-full w-px bg-stone-300"
            style={{ left: `${protsent(k, a, l)}%` }}
            aria-hidden
          />
        ))}
        {[...paevad.entries()].map(([kuupaev, omad]) =>
          omad.map((m, j) => (
            <span
              key={kuupaev + j}
              title={`${kuupaevLyhike(kuupaev)}: ${m.liik}`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white"
              style={{
                left: `${protsent(kuupaev, a, l)}%`,
                top: `${8 + (j % 5) * 13}px`,
                backgroundColor: LIIGI_VARV[m.liik] ?? "#78716c",
              }}
            />
          ))
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-stone-500">
        <span>{kuupaevEesti(algus)}</span>
        <span>{kuupaevEesti(lopp)}</span>
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
        {Object.entries(LIIGI_VARV).map(([liik, varv]) => (
          <span key={liik} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: varv }}
              aria-hidden
            />
            {liik}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-px bg-stone-300" aria-hidden />
          koosolek
        </span>
      </figcaption>
    </figure>
  );
}
