import Link from "next/link";
import type { ReactNode } from "react";
import type { Koosolek, KoosolekJuhataja } from "@/lib/types";
import type { ProtokolliRida } from "@/lib/protokollid/types";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti, kuupaevLyhike } from "@/lib/format";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "./HelpTip";
import ProtokolliSakid from "./ProtokolliSakid";

interface Naaber {
  koosolek_id: string;
  kuupaev: string;
}

interface Props {
  koosolek: Koosolek;
  juhatajad: KoosolekJuhataja[];
  /** protokollid.csv rida (arhiiviviide, Transkribus); null, kui protokolli faili ei ole */
  protokoll: ProtokolliRida | null;
  aktiivne: "koosolek" | "protokoll";
  eelmine: Naaber | null;
  jargmine: Naaber | null;
  /** lehe-spetsiifilised dl-read (kohalolu, statistika …) */
  lisaRead?: ReactNode;
  /** paremal: eksport/viide */
  tegevused?: ReactNode;
  /** täpsem arhiiviviide (protokollilehel lehekülgede vahemikuga) */
  arhiiviviide?: ReactNode;
}

/** UX-10: koosoleku ja protokolli lehe ühine päis + sakid + eelmine/järgmine. */
export default function KoosolekuPais({
  koosolek, juhatajad, protokoll, aktiivne, eelmine, jargmine, lisaRead, tegevused, arhiiviviide,
}: Props) {
  const tee = aktiivne === "koosolek" ? "koosolekud" : "protokollid";
  const pealkiri = (
    <>
      Koosolek {kuupaevEesti(koosolek.kuupaev)}
      {koosolek.kuupaev_lopp && <>–{kuupaevEesti(koosolek.kuupaev_lopp)}</>}
      {aktiivne === "protokoll" && " — protokoll"}
    </>
  );

  return (
    <div className="space-y-4">
      <nav aria-label="Asukoht" className="no-print flex flex-wrap items-center justify-between gap-2 text-sm text-stone-500">
        <Link href="/koosolekud/" className="hover:underline">← Koosolekud ja protokollid</Link>
        <span className="flex gap-3">
          {eelmine ? (
            <Link href={`/${tee}/${eelmine.koosolek_id}/`} prefetch={false} className="hover:underline" rel="prev">
              ← eelmine ({kuupaevLyhike(eelmine.kuupaev)})
            </Link>
          ) : (
            <span className="text-stone-300">← eelmine</span>
          )}
          {jargmine ? (
            <Link href={`/${tee}/${jargmine.koosolek_id}/`} prefetch={false} className="hover:underline" rel="next">
              järgmine ({kuupaevLyhike(jargmine.kuupaev)}) →
            </Link>
          ) : (
            <span className="text-stone-300">järgmine →</span>
          )}
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{pealkiri}</h1>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Vorm: </dt>
              <dd className="inline">
                {koosolek.vorm}
                {koosolek.vorm === "erakorraline" && <HelpTip tekst={ABI.erakorraline} />}
                {koosolek.vorm === "linnavalitsus linnavolikogu ülesandeis" && (
                  <HelpTip tekst={ABI.linnavalitsusVolikoguYlesandeis} />
                )}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Koosseis: </dt>
              <dd className="inline">
                <Link
                  href={`/koosseisud/${koosolek.koosseis_id}/`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: koosseisuVarv(koosolek.koosseis_id) }}
                    aria-hidden
                  />
                  {koosolek.koosseis_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Juhataja: </dt>
              <dd className="inline">
                {juhatajad.length === 0 && (koosolek.juhataja || "—")}
                {juhatajad.map((j, i) => (
                  <span key={i}>
                    {i > 0 && "; "}
                    {j.isik_id !== null ? (
                      <Link href={`/isikud/${j.isik_id}/`} className="text-blue-700 hover:underline">
                        {j.juhataja_nimi}
                      </Link>
                    ) : (
                      j.juhataja_nimi
                    )}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Nädalapäev: </dt>
              <dd className="inline">{koosolek.nadalapaev}</dd>
            </div>
            {protokoll && (
              <div className="sm:col-span-2">
                <dt className="inline font-medium">Arhiiviviide: </dt>
                <dd className="inline">
                  {arhiiviviide ?? <>Rahvusarhiiv, {protokoll.arhiiviviide}</>}
                  {protokoll.transkribus_url && (
                    <>
                      {" · "}
                      <a
                        href={protokoll.transkribus_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        Ava Transkribuses ↗
                      </a>
                    </>
                  )}
                </dd>
              </div>
            )}
            {lisaRead}
          </dl>
        </div>
        {tegevused}
      </header>

      <ProtokolliSakid id={koosolek.koosolek_id} aktiivne={aktiivne} protokollOlemas={!!protokoll} />
    </div>
  );
}
