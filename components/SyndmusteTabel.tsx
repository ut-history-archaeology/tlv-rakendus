"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { Syndmus, SyndmuseLiik } from "@/lib/derive";
import { syndmuseIsikud } from "@/lib/derive";
import { LIIGI_NIMI, LIIGI_VARV, koosseisuVarv } from "@/lib/colors";
import { kuupaevLyhike } from "@/lib/format";
import { ABI } from "@/lib/abitekstid";
import ExportButton from "./ExportButton";
import HelpTip from "./HelpTip";
import { FiltriKiibid } from "./TabeliOsad";

interface Props {
  syndmused: Syndmus[];
  /** isik_id → nimi (ainult sündmustes esinevad isikud) */
  nimed: Record<number, string>;
  /** isiku leht: kinnitamine kuvatakse isiku vaatest, lisandub koosseisu veerg */
  isikId?: number;
  /** UX-07: ajatelje markeri klõps filtreerib kuupäevale */
  kuupaev?: string | null;
  eemaldaKuupaev?: () => void;
  failinimi?: string;
  /** toorridade eksport (senine, KS-08) — kuvatakse sündmuste ekspordi kõrval */
  lisaTegevused?: ReactNode;
}

const LIIGID: SyndmuseLiik[] = [
  "kinnitamine", "vahetus", "liitumine", "lahkumine", "liitumine&lahkumine", "rühmavahetus", "peatamine",
];

function IsikuLink({ id, nimed }: { id: number | null; nimed: Record<number, string> }) {
  if (id === null || !nimed[id]) return <span className="text-stone-400">(isik teadmata)</span>;
  return (
    <Link href={`/isikud/${id}/`} className="text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-700">
      {nimed[id]}
    </Link>
  );
}

/** Sündmuse kirjeldus lausena (UX-06). */
function Kirjeldus({ s, nimed, isikId }: { s: Syndmus; nimed: Record<number, string>; isikId?: number }) {
  switch (s.liik) {
    case "kinnitamine":
      if (isikId !== undefined) return <>Valitud liikmena kinnitatud</>;
      return (
        <details>
          <summary className="cursor-pointer select-none">
            Kinnitati {s.isikud.length} valitud liiget
          </summary>
          <ul className="mt-1 columns-1 gap-4 text-xs sm:columns-2 lg:columns-3">
            {s.isikud
              .map((id) => ({ id, nimi: nimed[id] ?? "" }))
              .sort((a, b) => a.nimi.localeCompare(b.nimi, "et"))
              .map(({ id }) => (
                <li key={id}>
                  <IsikuLink id={id} nimed={nimed} />
                </li>
              ))}
          </ul>
        </details>
      );
    case "vahetus":
      return (
        <>
          <strong>Lahkus</strong> <IsikuLink id={s.lahkuja} nimed={nimed} /> →{" "}
          <strong>asemele</strong> <IsikuLink id={s.asendaja} nimed={nimed} />
          {s.liitumiseKuupaev && s.liitumiseKuupaev !== s.lahkumiseKuupaev && (
            <span className="text-stone-500"> (liitus {kuupaevLyhike(s.liitumiseKuupaev)})</span>
          )}
        </>
      );
    case "lahkumine":
      return (
        <>
          <strong>Lahkus</strong> <IsikuLink id={s.isik} nimed={nimed} />
          {s.asendaja !== null ? (
            <> → asendajaks märgitud <IsikuLink id={s.asendaja} nimed={nimed} /></>
          ) : (
            <span className="text-stone-500"> (asendajat ei nimetata)</span>
          )}
        </>
      );
    case "liitumine":
      return (
        <>
          <strong>Liitus</strong> <IsikuLink id={s.isik} nimed={nimed} />
          {s.asendatav !== null && <> (asemel: <IsikuLink id={s.asendatav} nimed={nimed} />)</>}
        </>
      );
    case "liitumine&lahkumine":
      return (
        <>
          <IsikuLink id={s.isik} nimed={nimed} /> <strong>liitus ja lahkus</strong> samal päeval
          {s.asendatav !== null && <> (asemel: <IsikuLink id={s.asendatav} nimed={nimed} />)</>}
          {s.asendaja !== null && <>; asendajaks <IsikuLink id={s.asendaja} nimed={nimed} /></>}
        </>
      );
    case "rühmavahetus":
      return (
        <>
          <strong>Rühmavahetus:</strong> <IsikuLink id={s.isik} nimed={nimed} />
          {s.nimekiri && <> → {s.nimekiri}</>}
        </>
      );
    case "peatamine":
      return (
        <>
          <strong>Volitused peatatud:</strong> <IsikuLink id={s.isik} nimed={nimed} />
        </>
      );
  }
}

function ekspordiRida(s: Syndmus, nimed: Record<number, string>) {
  const isikud = syndmuseIsikud(s);
  return {
    kuupaev: s.kuupaev,
    koosseis_id: s.koosseis_id,
    liik: s.liik,
    isikud: isikud.map((id) => nimed[id] ?? String(id)).join("; "),
    isik_idd: isikud.join("; "),
    nimekiri: "nimekiri" in s ? s.nimekiri : "",
    protokollid: s.protokollid.join("; "),
    allikaviited: s.allikaviited.join("; "),
    tapsustus: "tapsustus" in s ? s.tapsustus : "",
    markus: [
      s.eiValitud ? "ei olnud valimistulemustes" : "",
      s.liik === "lahkumine" && s.asendajaPuudub ? "asendajat ei nimetata" : "",
      s.liik === "vahetus" && s.liitumiseKuupaev !== s.lahkumiseKuupaev ? `liitus ${s.liitumiseKuupaev}` : "",
    ].filter(Boolean).join("; "),
    muutus_idd: s.muutus_idd.join("; "),
  };
}

const EKSPORDI_VEERUD = [
  { key: "kuupaev", pealkiri: "Kuupäev" },
  { key: "koosseis_id", pealkiri: "Koosseis" },
  { key: "liik", pealkiri: "Sündmus" },
  { key: "isikud", pealkiri: "Isikud" },
  { key: "isik_idd", pealkiri: "isik_id-d" },
  { key: "nimekiri", pealkiri: "Nimekiri" },
  { key: "protokollid", pealkiri: "Protokolliviited" },
  { key: "allikaviited", pealkiri: "Allikaviited" },
  { key: "tapsustus", pealkiri: "Täpsustus" },
  { key: "markus", pealkiri: "Märkus" },
  { key: "muutus_idd", pealkiri: "muutus_id-d" },
];

/** UX-06: liikmesmuutuste sündmuste tabel liigifiltriga. */
export default function SyndmusteTabel({
  syndmused, nimed, isikId, kuupaev, eemaldaKuupaev, failinimi, lisaTegevused,
}: Props) {
  const olemas = LIIGID.filter((l) => syndmused.some((s) => s.liik === l));
  const [peidetud, setPeidetud] = useState<Set<SyndmuseLiik>>(new Set());

  const nahtavad = useMemo(
    () => syndmused.filter((s) => !peidetud.has(s.liik) && (!kuupaev || s.kuupaev === kuupaev)),
    [syndmused, peidetud, kuupaev]
  );

  const lylita = (l: SyndmuseLiik) =>
    setPeidetud((p) => {
      const uus = new Set(p);
      if (uus.has(l)) uus.delete(l);
      else uus.add(l);
      return uus;
    });

  const kiibid = [
    ...(kuupaev && eemaldaKuupaev
      ? [{ key: "kp", silt: `Kuupäev: ${kuupaevLyhike(kuupaev)}`, eemalda: eemaldaKuupaev }]
      : []),
    ...[...peidetud].map((l) => ({ key: "l" + l, silt: `Peidetud: ${LIIGI_NIMI[l]}`, eemalda: () => lylita(l) })),
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {olemas.length > 1 && (
          <div role="group" aria-label="Sündmuste liigid" className="flex flex-wrap gap-1.5">
            {olemas.map((l) => {
              const arv = syndmused.filter((s) => s.liik === l).length;
              const sees = !peidetud.has(l);
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={sees}
                  onClick={() => lylita(l)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                    sees ? "border-stone-300 bg-white text-stone-800" : "border-stone-200 bg-stone-100 text-stone-400 line-through"
                  }`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LIIGI_VARV[l] }} aria-hidden />
                  {LIIGI_NIMI[l]} ({arv})
                </button>
              );
            })}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {lisaTegevused}
          <ExportButton
            read={nahtavad.map((s) => ekspordiRida(s, nimed))}
            veerud={EKSPORDI_VEERUD}
            meta={{
              failinimi: failinimi ?? "tlv-syndmused",
              filtrid: Object.fromEntries(kiibid.map((k) => [k.key, k.silt])),
            }}
          />
        </div>
      </div>
      <FiltriKiibid
        kiibid={kiibid}
        tyhjenda={() => {
          setPeidetud(new Set());
          eemaldaKuupaev?.();
        }}
      />
      <div className="max-h-[36rem] overflow-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-max text-sm">
          <thead className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Kuupäev</th>
              {isikId !== undefined && <th scope="col" className="px-3 py-2 text-left font-semibold">Koosseis</th>}
              <th scope="col" className="px-3 py-2 text-left font-semibold">Sündmus</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Isik(ud)</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Nimekiri</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Allikaviide</th>
            </tr>
          </thead>
          <tbody>
            {nahtavad.map((s) => (
              <tr key={s.id} className="border-b border-stone-100 align-top">
                <td className="whitespace-nowrap px-3 py-1.5">{kuupaevLyhike(s.kuupaev) || "—"}</td>
                {isikId !== undefined && (
                  <td className="px-3 py-1.5">
                    <Link href={`/koosseisud/${s.koosseis_id}/`} className="inline-flex items-center gap-1.5 hover:underline">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: koosseisuVarv(s.koosseis_id) }} aria-hidden />
                      {s.koosseis_id}
                    </Link>
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LIIGI_VARV[s.liik] }} aria-hidden />
                    {LIIGI_NIMI[s.liik]}
                    {s.liik === "kinnitamine" && <HelpTip tekst={ABI.kinnitamine} />}
                    {s.liik === "vahetus" && <HelpTip tekst={ABI.vahetus} />}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <Kirjeldus s={s} nimed={nimed} isikId={isikId} />
                  {s.eiValitud && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
                      ei olnud valimistulemustes
                    </span>
                  )}
                  {"tapsustus" in s && s.tapsustus && (
                    <span className="block max-w-md truncate text-xs text-stone-500" title={s.tapsustus}>
                      {s.tapsustus}
                    </span>
                  )}
                </td>
                <td className="max-w-[16rem] truncate px-3 py-1.5" title={"nimekiri" in s ? s.nimekiri : ""}>
                  {("nimekiri" in s && s.nimekiri) || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                  {s.allikaviited.join("; ") || "—"}
                  {s.protokollid.length > 0 && (
                    <span className="block text-stone-500">prot. {s.protokollid.join(", ")}</span>
                  )}
                </td>
              </tr>
            ))}
            {nahtavad.length === 0 && (
              <tr>
                <td colSpan={isikId !== undefined ? 6 : 5} className="px-3 py-6 text-center text-stone-500">
                  Valitud filtritele vastavaid sündmusi ei ole.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
