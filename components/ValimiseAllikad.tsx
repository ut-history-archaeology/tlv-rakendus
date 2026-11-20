import { Fragment, type ReactNode } from "react";
import { ALLIKA_NIMI, type Allikas, type Vaartus, type ValimineKoos } from "@/lib/derive";
import KontrollimiselMark from "./KontrollimiselMark";

const LINK = "text-hall underline decoration-raam underline-offset-2 hover:text-tekst";

/** Viite lühikuju (täiskuju title-s). */
function lyhike(viide: string): string {
  return viide.length > 40 ? viide.slice(0, 38).trimEnd() + "…" : viide;
}

/** VK-03: ühe allika viide — link, kui URL olemas; puudumisel VIIDE PUUDU. */
export function AllikaViide({ a, pikk = false }: { a: Allikas; pikk?: boolean }) {
  const nimi = ALLIKA_NIMI[a.allikas];
  if (!a.viide) {
    return (
      <strong className="font-semibold text-[#8a1c1c]" title={`${nimi}: viide puudub`}>
        VIIDE PUUDU
      </strong>
    );
  }
  const tekst = pikk ? a.viide : lyhike(a.viide);
  const title = `${nimi}: ${a.viide}`;
  return a.url ? (
    <a href={a.url} target="_blank" rel="noopener noreferrer" title={`${title} (avaneb uues aknas)`} className={LINK}>
      {tekst}
    </a>
  ) : (
    <span title={title}>{tekst}</span>
  );
}

function Viited({ allikad }: { allikad: Allikas[] }) {
  return (
    <span className="ml-1.5 text-hall">
      [
      {allikad.map((a, i) => (
        <Fragment key={i}>
          {i > 0 && "; "}
          <AllikaViide a={a} />
        </Fragment>
      ))}
      ]
    </span>
  );
}

/**
 * PR5-03 / VK-03…VK-04 täisvaade "allikad" all: iga väärtus koos oma viitega, erinevad väärtused
 * eraldi, nimekuju originaalkujul (ka kirillitsas). Aadressi ei kuvata (OTSUS PR5-01).
 */
export default function ValimiseAllikad({ k }: { k: ValimineKoos }) {
  const read: [string, ReactNode][] = [];
  if (k.nimekiri.length > 0) {
    read.push(["Nimekiri", k.nimekiri.map((n, i) => {
      const toorEri = n.toor.length > 0 && n.toor.join() !== n.nimi;
      return (
        <span key={i} className="block">
          {n.nr && <>nr {n.nr} — </>}
          {n.nimi}
          {toorEri && <span className="text-hall"> (allikas: {n.toor.join("; ")})</span>}
          {n.kontrollida && <KontrollimiselMark />}
          <Viited allikad={n.allikad} />
        </span>
      );
    })]);
  }
  const valjad: [string, Vaartus[]][] = [
    ["Nimekuju allikas", k.nimekuju],
    ["Koht nimekirjas", k.koht],
    ["Ringkond", k.ringkond],
    ["Hääled", k.haaled],
    ["Amet", k.amet],
    ["Vanus valimiste ajal", k.vanus],
    ["Sünniaeg", k.synniaeg],
    ["Märkused", k.markused],
  ];
  for (const [silt, v] of valjad) {
    if (v.length === 0) continue;
    read.push([silt, v.map((x, i) => (
      <span key={i} className="block">
        {x.vaartus}
        <Viited allikad={x.allikad} />
      </span>
    ))]);
  }
  if (read.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
      {read.map(([silt, sisu]) => (
        <div key={silt} className="contents">
          <dt className="text-hall">{silt}</dt>
          <dd className="mb-1 text-tekst-2 sm:mb-0">{sisu}</dd>
        </div>
      ))}
    </dl>
  );
}
