import { utc } from "@/lib/ajatelg";
import { kuupaevLyhike } from "@/lib/format";

interface Props {
  algus: string;
  lopp: string;
  /** tuletatud liikmete arv (astmeline joon, `liikmeteArvuSeeria`) */
  seeria: { kuupaev: string; arv: number }[];
  /** koosolekud, kus protokoll ütleb volikogu suuruse */
  punktid: { koosolek_id: string; kuupaev: string; protokoll: number; tuletatud: number }[];
  /** volikogu suurus astmelise viitejoonena (AN-04); tühi, kui teadmata */
  suurus?: { alates: string; arv: number }[];
  varv: string;
}

const L = 720;
const K = 170;
const VASAK = 36;
const PAREM = 10;
const YLAL = 10;
const ALL = 140;

/** KT-01: tuletatud liikmete arv vs protokollis kirjas olev suurus; erinevused punasega. */
export default function KontrollJoonis({ algus, lopp, seeria, punktid, suurus = [], varv }: Props) {
  const a = utc(algus);
  const l = utc(lopp);
  if (!(l > a) || seeria.length === 0) return null;
  const x = (iso: string) => VASAK + ((utc(iso) - a) / (l - a)) * (L - VASAK - PAREM);
  const arvud = [...seeria.map((s) => s.arv), ...punktid.map((p) => p.protokoll), ...suurus.map((s) => s.arv)];
  const lo = Math.min(...arvud) - 2;
  const hi = Math.max(...arvud) + 2;
  const y = (n: number) => ALL - ((n - lo) / (hi - lo)) * (ALL - YLAL);

  let tee = `M${x(seeria[0].kuupaev)},${y(seeria[0].arv)}`;
  for (let i = 1; i < seeria.length; i++) tee += ` H${x(seeria[i].kuupaev)} V${y(seeria[i].arv)}`;
  tee += ` H${x(lopp)}`;

  let suuruseTee = "";
  suurus.forEach((s, i) => {
    const x0 = x(s.alates < algus ? algus : s.alates);
    suuruseTee += i === 0 ? `M${x0},${y(s.arv)}` : ` H${x0} V${y(s.arv)}`;
  });
  if (suuruseTee) suuruseTee += ` H${x(lopp)}`;

  const tikid = [...new Set([Math.min(...arvud), Math.max(...arvud)])];
  const aastad: number[] = [];
  for (let aa = Number(algus.slice(0, 4)) + 1; aa <= Number(lopp.slice(0, 4)); aa++) aastad.push(aa);
  const erinevusi = punktid.filter((p) => p.protokoll !== p.tuletatud).length;

  return (
    <figure>
      <svg viewBox={`0 0 ${L} ${K}`} className="h-auto w-full max-w-3xl" role="img"
        aria-label={`Tuletatud liikmete arv ${Math.min(...seeria.map((s) => s.arv))}…${Math.max(...seeria.map((s) => s.arv))}; ${punktid.length} koosolekut protokollis kirjas oleva suurusega, neist ${erinevusi} erineb.`}>
        {tikid.map((n) => (
          <g key={n}>
            <line x1={VASAK} x2={L - PAREM} y1={y(n)} y2={y(n)} stroke="#e7e5e4" />
            <text x={VASAK - 4} y={y(n) + 4} textAnchor="end" fontSize={10} fill="#78716c">{n}</text>
          </g>
        ))}
        {aastad.map((aa) => {
          const iso = `${aa}-01-01`;
          if (utc(iso) <= a || utc(iso) >= l) return null;
          return (
            <g key={aa}>
              <line x1={x(iso)} x2={x(iso)} y1={ALL} y2={ALL + 6} stroke="#57534e" />
              <text x={x(iso)} y={ALL + 18} textAnchor="middle" fontSize={10} fill="#57534e">{aa}</text>
            </g>
          );
        })}
        <line x1={VASAK} x2={L - PAREM} y1={ALL} y2={ALL} stroke="#a8a29e" />
        {suuruseTee && <path d={suuruseTee} fill="none" stroke="#57534e" strokeDasharray="5 3" />}
        <path d={tee} fill="none" stroke={varv} strokeWidth={2} />
        {punktid.map((p) => {
          const vale = p.protokoll !== p.tuletatud;
          return (
            <circle key={p.koosolek_id} cx={x(p.kuupaev)} cy={y(p.protokoll)} r={vale ? 4 : 2.5}
              fill={vale ? "#dc2626" : "#fff"} stroke={vale ? "#dc2626" : "#57534e"} strokeWidth={1}>
              <title>{`${p.koosolek_id} ${kuupaevLyhike(p.kuupaev)}: protokoll ${p.protokoll}, tuletatud ${p.tuletatud}`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: varv }} aria-hidden /> tuletatud liikmete arv (reegel 1)
        </span>
        {suuruseTee && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-stone-600" aria-hidden /> volikogu suurus
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border border-stone-600 bg-white" aria-hidden /> protokollis kirjas (koosseis_arv)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-600" aria-hidden /> erineb tuletatust
        </span>
      </figcaption>
    </figure>
  );
}
