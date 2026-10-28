"use client";

import { useEffect, useRef, useState } from "react";
import { LIIGI_NIMI, LIIGI_VARV } from "@/lib/colors";
import { kuupaevEesti, kuupaevLyhike } from "@/lib/format";
import { paigutaMarkerid, utc } from "@/lib/ajatelg";

export interface AjateljePaev {
  kuupaev: string;
  /** sündmuste liigid sel päeval (kinnitamine = üks sündmus) */
  liigid: string[];
  /** tooltipi read, üks sündmuse kohta */
  kirjed: string[];
  /** sündmustes osalenud isikute arv */
  isikuid: number;
}

interface Props {
  algus: string;
  lopp: string;
  seeria: { kuupaev: string; arv: number }[];
  valitudArv: number;
  varv: string;
  paevad: AjateljePaev[];
  koosolekud: string[];
  valitudKuupaev: string | null;
  vali: (kuupaev: string) => void;
}

const KORGUS = 220;
const VASAK = 44;
const PAREM = 16;
const JOON_YLAL = 12;
const JOON_ALL = 128;
const RIDA_Y = [152, 172];
const TELG_Y = 190;
const MIN_LAIUS = 640;
const MAX_KIRJEID = 8;
const SEGA = "#78716c";

/** UX-07: liikmete arv ajas (astmeline joon) + sündmuste riba (üks marker kuupäeva kohta). */
export default function LiikmeteAjatelg({
  algus, lopp, seeria, valitudArv, varv, paevad, koosolekud, valitudKuupaev, vali,
}: Props) {
  const ymbris = useRef<HTMLDivElement>(null);
  const [laius, setLaius] = useState(960);
  const [aktiivne, setAktiivne] = useState<string | null>(null);

  useEffect(() => {
    const el = ymbris.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLaius(Math.max(MIN_LAIUS, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const a = utc(algus);
  const l = utc(lopp);
  if (!(l > a) || seeria.length === 0) return null;

  const x = (iso: string) => VASAK + ((utc(iso) - a) / (l - a)) * (laius - VASAK - PAREM);
  const arvud = [...seeria.map((s) => s.arv), valitudArv];
  const lo = Math.min(...arvud) - 1;
  const hi = Math.max(...arvud) + 1;
  const y = (n: number) => JOON_ALL - ((n - lo) / (hi - lo)) * (JOON_ALL - JOON_YLAL);

  // astmeline joon
  let tee = `M${x(seeria[0].kuupaev)},${y(seeria[0].arv)}`;
  for (let i = 1; i < seeria.length; i++) {
    tee += ` H${x(seeria[i].kuupaev)} V${y(seeria[i].arv)}`;
  }

  const yTikid = [...new Set([Math.min(...seeria.map((s) => s.arv)), valitudArv, Math.max(...seeria.map((s) => s.arv))])];
  const aastad: number[] = [];
  for (let aa = Number(algus.slice(0, 4)) + 1; aa <= Number(lopp.slice(0, 4)); aa++) aastad.push(aa);

  const paevMap = new Map(paevad.map((p) => [p.kuupaev, p]));
  const paigutus = paigutaMarkerid(paevad.map((p) => p.kuupaev), x, 14);

  // sr-only kirjeldus
  const minA = Math.min(...seeria.map((s) => s.arv));
  const maxA = Math.max(...seeria.map((s) => s.arv));
  const rohkeim = [...paevad].sort((p, q) => q.isikuid - p.isikuid || q.kirjed.length - p.kirjed.length)[0];
  const kirjeldus =
    `Liikmete arv muutus vahemikus ${minA}…${maxA}; valiti ${valitudArv} liiget.` +
    (rohkeim
      ? ` Kõige rohkem sündmusi ${kuupaevLyhike(rohkeim.kuupaev)} (${[...new Set(rohkeim.liigid)].map((x) => LIIGI_NIMI[x]).join(", ")}, ${rohkeim.isikuid} isikut).`
      : "");

  const aktiivnePaev = aktiivne ? paevMap.get(aktiivne) : undefined;
  const aktiivneX = aktiivne ? x(aktiivne) : 0;
  const liigidKokku = [...new Set(paevad.flatMap((p) => p.liigid))];

  return (
    <figure>
      <p className="sr-only">{kirjeldus}</p>
      <div ref={ymbris} className="overflow-x-auto">
        <div className="relative" style={{ width: laius, height: KORGUS }}>
          <svg width={laius} height={KORGUS} aria-hidden className="absolute inset-0">
            {/* y-telg */}
            {yTikid.map((n) => (
              <g key={n}>
                <line x1={VASAK} x2={laius - PAREM} y1={y(n)} y2={y(n)} stroke="#e7e5e4" />
                <text x={VASAK - 6} y={y(n) + 4} textAnchor="end" fontSize={11} fill="#78716c">{n}</text>
              </g>
            ))}
            <text x={4} y={JOON_YLAL - 2} fontSize={10} fill="#78716c">liikmeid</text>
            {/* valitute viitejoon */}
            <line
              x1={VASAK} x2={laius - PAREM} y1={y(valitudArv)} y2={y(valitudArv)}
              stroke={varv} strokeDasharray="4 3" strokeOpacity={0.6}
            />
            {/* liikmete arv */}
            <path d={tee} fill="none" stroke={varv} strokeWidth={2.5} />
            {/* sündmuste riba alus */}
            <line x1={VASAK} x2={laius - PAREM} y1={TELG_Y} y2={TELG_Y} stroke="#a8a29e" />
            {koosolekud.map((k) => (
              <line key={k} x1={x(k)} x2={x(k)} y1={TELG_Y} y2={TELG_Y + 5} stroke="#a8a29e">
                <title>{`koosolek ${kuupaevEesti(k)}`}</title>
              </line>
            ))}
            {aastad.map((aa) => {
              const iso = `${aa}-01-01`;
              if (utc(iso) <= a || utc(iso) >= l) return null;
              return (
                <g key={aa}>
                  <line x1={x(iso)} x2={x(iso)} y1={TELG_Y} y2={TELG_Y + 10} stroke="#57534e" />
                  <text x={x(iso)} y={TELG_Y + 22} textAnchor="middle" fontSize={11} fill="#57534e">{aa}</text>
                </g>
              );
            })}
          </svg>

          {paigutus.map((p) => {
            const paev = paevMap.get(p.kuupaev)!;
            const arv = paev.kirjed.length;
            const liigid = [...new Set(paev.liigid)];
            const sega = liigid.length > 1;
            const d = arv > 1 ? Math.min(20, 12 + arv * 2) : 12;
            const valitud = valitudKuupaev === p.kuupaev;
            return (
              <button
                key={p.kuupaev}
                type="button"
                onClick={() => vali(p.kuupaev)}
                onMouseEnter={() => setAktiivne(p.kuupaev)}
                onMouseLeave={() => setAktiivne(null)}
                onFocus={() => setAktiivne(p.kuupaev)}
                onBlur={() => setAktiivne(null)}
                aria-pressed={valitud}
                aria-label={`${kuupaevLyhike(p.kuupaev)}: ${arv} sündmus${arv > 1 ? "t" : ""} (${liigid.map((x) => LIIGI_NIMI[x]).join(", ")}). Filtreeri tabel sellele kuupäevale.`}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                  valitud ? "ring-2 ring-stone-900 ring-offset-1" : ""
                }`}
                style={{
                  left: p.x,
                  top: RIDA_Y[p.rida],
                  width: d,
                  height: d,
                  backgroundColor: sega ? "#fff" : LIIGI_VARV[liigid[0]],
                  border: sega ? `2.5px solid ${SEGA}` : "1.5px solid #fff",
                  color: sega ? "#44403c" : "#fff",
                }}
              >
                {arv > 1 ? arv : ""}
              </button>
            );
          })}

          {aktiivnePaev && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-20 w-64 rounded-md border border-stone-200 bg-white p-2 text-xs shadow-lg"
              style={{
                left: Math.min(Math.max(aktiivneX - 128, 0), laius - 256),
                bottom: KORGUS - RIDA_Y[0] + 16,
              }}
            >
              <strong>{kuupaevEesti(aktiivnePaev.kuupaev)}</strong>
              <ul className="mt-1 space-y-0.5">
                {aktiivnePaev.kirjed.slice(0, MAX_KIRJEID).map((k, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: LIIGI_VARV[aktiivnePaev.liigid[i]] }}
                      aria-hidden
                    />
                    {k}
                  </li>
                ))}
                {aktiivnePaev.kirjed.length > MAX_KIRJEID && <li>…</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: varv }} aria-hidden />
          joon = liikmete arv
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: varv }} aria-hidden />
          valitud liikmeid ({valitudArv})
        </span>
        {liigidKokku.map((liik) => (
          <span key={liik} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LIIGI_VARV[liik] }} aria-hidden />
            {LIIGI_NIMI[liik]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: SEGA }} aria-hidden />
          mitu liiki samal päeval
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-px bg-stone-400" aria-hidden />
          koosolek
        </span>
        <span className="text-stone-500">Number markeril = sündmuste arv sel päeval; klõps filtreerib tabeli.</span>
      </figcaption>
    </figure>
  );
}
