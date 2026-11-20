import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AjaluguKirje, Syndmus } from "@/lib/derive";
import { kuupaevLyhike, kuupaevadLyhike } from "@/lib/format";
import { arhiiviUrl } from "@/lib/viited";
import ValimiseAllikad, { AllikaViide } from "./ValimiseAllikad";

const HALL_LINK = "text-hall underline decoration-raam underline-offset-2 hover:text-tekst";
const AMETI_PIIR = 80;

/** Asendaja/asendatav nimega lingina isiku lehele. */
function Isik({ id, nimed }: { id: number | null; nimed: Record<number, string> }) {
  if (id === null || !nimed[id]) return <>(isik teadmata)</>;
  return (
    <Link href={`/isikud/${id}/`} className="underline decoration-raam underline-offset-2">
      {nimed[id]}
    </Link>
  );
}

/** 1. rida sündmuse kohta isiku vaatest (PR5-03 tabel). */
function SyndmuseTekst({ s, isikId, nimed }: { s: Syndmus; isikId: number; nimed: Record<number, string> }) {
  switch (s.liik) {
    case "kinnitamine":
      return <>Kinnitati volikogu liikmeks</>;
    case "vahetus":
      return s.lahkuja === isikId ? (
        <>Lahkus, asemele <Isik id={s.asendaja} nimed={nimed} /></>
      ) : (
        <>
          Asendas <Isik id={s.lahkuja} nimed={nimed} />
          {s.liitumiseKuupaev && s.liitumiseKuupaev !== s.lahkumiseKuupaev && (
            <> (liitus {kuupaevLyhike(s.liitumiseKuupaev)})</>
          )}
        </>
      );
    case "lahkumine":
      return s.asendaja !== null ? <>Lahkus, asemele <Isik id={s.asendaja} nimed={nimed} /></> : <>Lahkus</>;
    case "liitumine":
      return s.asendatav !== null ? <>Asendas <Isik id={s.asendatav} nimed={nimed} /></> : <>Liitus volikoguga</>;
    case "liitumine&lahkumine":
      // PA-08: ühe kuupäevaga
      return (
        <>
          Liitus ja lahkus samal päeval
          {s.asendatav !== null && <> (asendas <Isik id={s.asendatav} nimed={nimed} />)</>}
          {s.asendaja !== null && <>, asemele <Isik id={s.asendaja} nimed={nimed} /></>}
        </>
      );
    case "rühmavahetus":
      return <>Vahetas rühma{s.nimekiri && <>: {s.nimekiri}</>}</>;
    case "peatamine":
      return <>Volitused peatati</>;
  }
}

/** 2. rida: koosoleku link (PA-07) · arhiiviviide lingina (PA-10). */
function SyndmuseAllikad({ s }: { s: Syndmus }): ReactNode[] {
  const osad: ReactNode[] = [];
  const kv = s.koosolekuViited ?? [];
  const naidatud = new Set<string>();
  s.allikaviited.forEach((v, i) => {
    const k = kv[i];
    // sama koosoleku mitu kaadrit → koosoleku link üks kord
    if (k && !naidatud.has(k.koosolek_id)) {
      naidatud.add(k.koosolek_id);
      osad.push(
        <Link key={`k${i}`} href={`/koosolekud/${k.koosolek_id}/`} className={HALL_LINK}>
          koosolek {kuupaevLyhike(k.kuupaev)}
        </Link>
      );
    }
    const url = arhiiviUrl(v);
    osad.push(
      url ? (
        <a key={`a${i}`} href={url} target="_blank" rel="noopener noreferrer" className={HALL_LINK}
          title="Ava Rahvusarhiivis (avaneb uues aknas)">
          {v}
        </a>
      ) : <span key={`a${i}`}>{v}</span>
    );
  });
  // koosolekut ei leitud üheselt → protokolliviide tekstina, nagu allikas
  if (!kv.every(Boolean) || s.allikaviited.length === 0) {
    if (s.protokollid.length) osad.push(<span key="p">prot. {s.protokollid.join(", ")}</span>);
  }
  if (s.eiValitud) osad.push(<span key="e">ei olnud valimistulemustes</span>);
  return osad;
}

function Eraldatud({ osad }: { osad: ReactNode[] }) {
  return (
    <>
      {osad.map((o, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          {o}
        </Fragment>
      ))}
    </>
  );
}

function Rida({ kuupaev, pealkiri, all }: { kuupaev: string; pealkiri: ReactNode; all: ReactNode }) {
  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-joon py-[18px] sm:grid-cols-[132px_minmax(0,1fr)]">
      <span className="text-[15px] tabular-nums text-tekst-2">{kuupaev || "—"}</span>
      <div className="min-w-0">
        <div className="text-base">{pealkiri}</div>
        <div className="mt-0.5 text-[13px] text-hall">{all}</div>
      </div>
    </li>
  );
}

/** PR5-03: valimised ja liikmesmuutused ühes kronoloogilises loendis. */
export default function IsikuAjalugu({
  kirjed, isikId, nimed,
}: {
  kirjed: AjaluguKirje[];
  isikId: number;
  nimed: Record<number, string>;
}) {
  return (
    <ol className="border-b border-joon">
      {kirjed.map((k, i) => {
        if (k.liik === "syndmus") {
          return (
            <Rida
              key={k.syndmus.id}
              kuupaev={kuupaevLyhike(k.kuupaev)}
              pealkiri={<SyndmuseTekst s={k.syndmus} isikId={isikId} nimed={nimed} />}
              all={<Eraldatud osad={SyndmuseAllikad({ s: k.syndmus })} />}
            />
          );
        }
        const amet = k.amet.length > AMETI_PIIR
          ? <span title={k.amet}>{k.amet.slice(0, AMETI_PIIR).trimEnd()}…</span>
          : k.amet;
        const osad: ReactNode[] = [
          ...(k.koht ? [k.koht] : []),
          ...(k.amet ? [amet] : []),
          <AllikaViide key="v" a={k.allikas} pikk />,
        ];
        return (
          <Rida
            key={`v${k.kirje.aasta}-${i}`}
            kuupaev={kuupaevadLyhike(k.kuupaevad)}
            pealkiri={<>{k.valitud ? "Valiti" : "Kandideeris"}{k.nimekiri && <>, {k.nimekiri}</>}</>}
            all={
              <>
                <Eraldatud osad={osad} />
                {" · "}
                <details className="inline">
                  <summary className="inline cursor-pointer list-none underline decoration-raam underline-offset-2 hover:text-tekst [&::-webkit-details-marker]:hidden">
                    allikad
                  </summary>
                  <div className="mt-3 rounded-lg bg-pind p-4 text-[13px] leading-relaxed">
                    <ValimiseAllikad k={k.kirje} />
                  </div>
                </details>
              </>
            }
          />
        );
      })}
    </ol>
  );
}
