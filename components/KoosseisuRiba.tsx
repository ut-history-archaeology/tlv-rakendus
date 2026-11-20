import Link from "next/link";
import type { RibaLoik } from "@/lib/derive";

/**
 * PR5-02: õhuke koosseisuriba — 9 võrdset lõiku, täidetud osa = liikmepäevad (#22211E), tühi #E2DFD8.
 * DS-03 / omaniku otsus 20.11.2026: role="group" kokkuvõtva aria-label'iga (mitte role="img",
 * mis peidaks lingid), iga lõik on oma sildiga link koosseisu lehele. Puutepind 44 px.
 */
export default function KoosseisuRiba({ loigud }: { loigud: RibaLoik[] }) {
  const liikmena = loigud.filter((l) => l.taidetud > 0).length;
  return (
    <div>
      <div
        role="group"
        aria-label={`Koosseisuriba 1917–1941: ${
          liikmena > 0 ? `liige ${liikmena} koosseisus ${loigud.length}-st` : "teadaolevaid liikmeperioode pole"
        }`}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${loigud.length}, minmax(0, 1fr))` }}
      >
        {loigud.map((l) => (
          <Link
            key={l.koosseis_id}
            href={`/koosseisud/${l.koosseis_id}/`}
            aria-label={l.silt}
            title={l.silt}
            className="group block py-[18px]"
          >
            <span className="relative block h-2 overflow-hidden rounded-[2px] bg-joon group-hover:outline group-hover:outline-1 group-hover:outline-hall">
              {l.osad.map((o, i) => (
                <span
                  key={i}
                  className="absolute inset-y-0 bg-tekst"
                  style={{ left: `${o.vasak * 100}%`, width: `max(${o.laius * 100}%, 2px)` }}
                />
              ))}
            </span>
          </Link>
        ))}
      </div>
      <div className="-mt-3 flex justify-between text-xs text-hall" aria-hidden>
        <span>1917</span>
        <span>1941</span>
      </div>
    </div>
  );
}
