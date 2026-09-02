import Link from "next/link";

export interface VorguServ {
  isik_id: number;
  nimi: string;
  /** "asendas" = tema asendas keskset isikut; "asendatud" = keskne isik asendas teda */
  suhe: "asendaja" | "asendatav";
  kuupaev: string;
}

/** PR-11: väike võrguvisualisatsioon — isik keskel, asendussuhted servadena. */
export default function AsendusVork({
  keskneNimi, servad,
}: {
  keskneNimi: string;
  servad: VorguServ[];
}) {
  if (servad.length === 0) return null;
  const W = 560;
  const H = Math.max(220, 90 + servad.length * 26);
  const cx = W / 2;
  const cy = H / 2;
  const raadius = Math.min(H / 2 - 40, 170);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Asendussuhete võrk: ${keskneNimi} on seotud ${servad.length} isikuga`}
      className="w-full max-w-xl"
    >
      {servad.map((s, i) => {
        const nurk = (2 * Math.PI * i) / servad.length - Math.PI / 2;
        const x = cx + raadius * Math.cos(nurk);
        const y = cy + raadius * Math.sin(nurk);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#d6d3d1" strokeWidth={1.5} />
            <Link href={`/isikud/${s.isik_id}/`}>
              <circle cx={x} cy={y} r={7} fill={s.suhe === "asendaja" ? "#0e7490" : "#9a3412"} />
              <text
                x={x}
                y={y + (y > cy ? 22 : -14)}
                textAnchor="middle"
                className="fill-stone-700 text-[11px] underline"
              >
                {s.nimi}
              </text>
            </Link>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={10} fill="#1c1917" />
      <text x={cx} y={cy - 16} textAnchor="middle" className="fill-stone-900 text-[12px] font-bold">
        {keskneNimi}
      </text>
    </svg>
  );
}
