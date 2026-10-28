"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { IsikuRida } from "@/lib/types";
import { eluaastad, normalizeOtsing } from "@/lib/format";
import { multiSort, useDebounce, useTabeliSeis } from "@/lib/useTabeliSeis";
import {
  FiltriKiibid, MinuVaade, MitmikValik, Paginatsioon, SortPais, TabeliYmbris,
} from "./TabeliOsad";
import ExportButton from "./ExportButton";
import HelpTip from "./HelpTip";
import { ABI } from "@/lib/abitekstid";
import type { EkspordiVeerg } from "@/lib/export";

const LEHE_SUURUS = 50;

interface Props {
  read: IsikuRida[];
  koosseisud: string[];
  /** Kui antud, on tabel eelfiltreeritud sellele koosseisule (koosseisu leht). */
  eelKoosseis?: string;
  /** Kuva aadressiveerg (koosseisu lehel, KS-04). */
  naitaAadressi?: boolean;
  /** Väline filter (nt KS-03 segmendiklõps): lubatud isikud + kiibi silt. */
  valisFilter?: { silt: string; isikud: number[] } | null;
  eemaldaValisFilter?: () => void;
  storageKey?: string;
}

const EKSPORDI_VEERUD: EkspordiVeerg[] = [
  { key: "isik_id", pealkiri: "isik_id" },
  { key: "perenimi", pealkiri: "Perenimi" },
  { key: "eesnimi", pealkiri: "Eesnimi" },
  { key: "alt_perenimi", pealkiri: "Alt. perenimi" },
  { key: "alt_eesnimi", pealkiri: "Alt. eesnimi" },
  { key: "sugu", pealkiri: "Sugu" },
  { key: "isanimi", pealkiri: "Isanimi" },
  { key: "synd_kuupaev", pealkiri: "Sünniaeg" },
  { key: "synd_tuletatud", pealkiri: "Sünniaeg tuletatud" },
  { key: "surm_kuupaev", pealkiri: "Surmaaeg" },
  { key: "koosseise", pealkiri: "Koosseisude arv" },
  { key: "koosseisud", pealkiri: "Koosseisud" },
  { key: "esimene_koosseis", pealkiri: "Esimene koosseis" },
  { key: "viimane_koosseis", pealkiri: "Viimane koosseis" },
  { key: "peamine_nimekiri", pealkiri: "Peamine nimekiri (toorkuju)" },
  { key: "oli_juhataja", pealkiri: "Oli juhataja" },
  { key: "aadressid", pealkiri: "Teadaolevad aadressid" },
  { key: "wikidata", pealkiri: "Wikidata" },
  { key: "arhiiviviited", pealkiri: "Arhiiviviited" },
  { key: "AKL_ID", pealkiri: "AKL_ID" },
];

function ekspordiRida(r: IsikuRida) {
  return {
    isik_id: r.isik_id,
    perenimi: r.perenimi,
    eesnimi: r.eesnimi,
    alt_perenimi: r.alt_perenimi,
    alt_eesnimi: r.alt_eesnimi,
    sugu: r.sugu,
    isanimi: r.isanimi,
    synd_kuupaev: r.synd_kuupaev,
    synd_tuletatud: r.synd_tuletatud,
    surm_kuupaev: r.surm_kuupaev,
    koosseise: r.koosseise,
    koosseisud: r.koosseisud.join(", "),
    esimene_koosseis: r.esimene_koosseis,
    viimane_koosseis: r.viimane_koosseis,
    peamine_nimekiri: r.peamine_nimekiri,
    oli_juhataja: r.oli_juhataja ? "jah" : "ei",
    aadressid: r.aadressid.join(" | "),
    wikidata: r.wikidata,
    arhiiviviited: r.arhiiviviited,
    AKL_ID: r.AKL_ID,
  };
}

export default function IsikudTabel({
  read, koosseisud, eelKoosseis, naitaAadressi,
  valisFilter, eemaldaValisFilter, storageKey,
}: Props) {
  const seis = useTabeliSeis(
    { q: "", koosseisud: "", nimekirjad: "", juhataja: "" },
    storageKey ?? (eelKoosseis ? `tlv-vaade-liikmed-${eelKoosseis}` : "tlv-vaade-isikud")
  );
  const [hover, setHover] = useState<number | null>(null);
  // UX-01: isanime veerg vaikimisi peidus
  const [naitaIsanime, setNaitaIsanime] = useState(false);
  const otsing = useDebounce(seis.filtrid.q);

  const nimekirjad = useMemo(() => {
    const loend = new Map<string, number>();
    for (const r of read) {
      if (r.peamine_nimekiri) {
        loend.set(r.peamine_nimekiri, (loend.get(r.peamine_nimekiri) ?? 0) + 1);
      }
    }
    return [...loend.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nimi, arv]) => ({ id: nimi, nimi, arv }));
  }, [read]);

  const valitudKoosseisud = seis.filtrid.koosseisud
    ? seis.filtrid.koosseisud.split(",")
    : [];
  const valitudNimekirjad = seis.filtrid.nimekirjad
    ? seis.filtrid.nimekirjad.split("|")
    : [];

  const filtreeritud = useMemo(() => {
    const q = normalizeOtsing(otsing.trim());
    return read.filter((r) => {
      if (q) {
        const nimi = normalizeOtsing(
          `${r.perenimi} ${r.eesnimi} ${r.alt_perenimi} ${r.alt_eesnimi}`
        );
        if (!nimi.includes(q)) return false;
      }
      if (
        valitudKoosseisud.length > 0 &&
        !r.koosseisud.some((k) => valitudKoosseisud.includes(k))
      ) {
        return false;
      }
      if (
        valitudNimekirjad.length > 0 &&
        !valitudNimekirjad.includes(r.peamine_nimekiri)
      ) {
        return false;
      }
      if (valisFilter && !valisFilter.isikud.includes(r.isik_id)) return false;
      if (seis.filtrid.juhataja === "1" && !r.oli_juhataja) return false;
      return true;
    });
  }, [read, otsing, seis.filtrid.juhataja, valitudKoosseisud.join(","), valitudNimekirjad.join("|"), valisFilter]);

  const sorditud = useMemo(
    () =>
      multiSort(filtreeritud, seis.sort.length ? seis.sort : [{ key: "perenimi", desc: false }], (r, key) => {
        switch (key) {
          case "perenimi": return r.perenimi;
          case "eesnimi": return r.eesnimi;
          case "isanimi": return r.isanimi || null;
          case "koosseise": return r.koosseise;
          case "esimene_koosseis": return r.esimene_koosseis || null;
          case "viimane_koosseis": return r.viimane_koosseis || null;
          case "peamine_nimekiri": return r.peamine_nimekiri || null;
          case "aadress": return r.aadressid[0] ?? null;
          default: return null;
        }
      }),
    [filtreeritud, seis.sort]
  );

  const lehti = Math.max(1, Math.ceil(sorditud.length / LEHE_SUURUS));
  const leht = Math.min(seis.leht, lehti);
  const nahtavad = sorditud.slice((leht - 1) * LEHE_SUURUS, leht * LEHE_SUURUS);

  const kiibid = [
    ...(otsing.trim()
      ? [{ key: "q", silt: `Otsing: ${otsing.trim()}`, eemalda: () => seis.setFilter("q", "") }]
      : []),
    ...valitudKoosseisud.map((k) => ({
      key: "k" + k,
      silt: `Koosseis ${k}`,
      eemalda: () =>
        seis.setFilter("koosseisud", valitudKoosseisud.filter((x) => x !== k).join(",")),
    })),
    ...valitudNimekirjad.map((n) => ({
      key: "n" + n,
      silt: `Nimekiri: ${n.length > 40 ? n.slice(0, 40) + "…" : n}`,
      eemalda: () =>
        seis.setFilter("nimekirjad", valitudNimekirjad.filter((x) => x !== n).join("|")),
    })),
    ...(valisFilter && eemaldaValisFilter
      ? [{
          key: "vn",
          silt: valisFilter.silt.length > 50 ? valisFilter.silt.slice(0, 50) + "…" : valisFilter.silt,
          eemalda: eemaldaValisFilter,
        }]
      : []),
    ...(seis.filtrid.juhataja === "1"
      ? [{ key: "j", silt: "Oli juhataja", eemalda: () => seis.setFilter("juhataja", "") }]
      : []),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={seis.filtrid.q}
          onChange={(e) => seis.setFilter("q", e.target.value)}
          placeholder="Otsi nime järgi…"
          aria-label="Otsi isikut nime järgi"
          className="w-56 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
        />
        {!eelKoosseis && (
          <MitmikValik
            silt="Koosseis"
            valikud={koosseisud.map((k) => ({ id: k, nimi: k }))}
            valitud={valitudKoosseisud}
            muuda={(uus) => seis.setFilter("koosseisud", uus.join(","))}
          />
        )}
        <MitmikValik
          silt="Nimekiri"
          valikud={nimekirjad}
          valitud={valitudNimekirjad}
          muuda={(uus) => seis.setFilter("nimekirjad", uus.join("|"))}
          hoiatus={ABI.nimekirjaHoiatus}
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={seis.filtrid.juhataja === "1"}
            onChange={(e) => seis.setFilter("juhataja", e.target.checked ? "1" : "")}
          />
          Oli juhataja
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={naitaIsanime}
            onChange={(e) => setNaitaIsanime(e.target.checked)}
          />
          Näita isanime
        </label>
        <div className="ml-auto flex items-center gap-2">
          <MinuVaade
            salvesta={seis.salvestaVaade}
            ava={seis.avaSalvestatudVaade}
            olemas={seis.salvestatudOlemas}
          />
          <ExportButton
            read={sorditud.map(ekspordiRida)}
            veerud={EKSPORDI_VEERUD}
            meta={{
              failinimi: eelKoosseis
                ? `tlv-isikud-koosseis-${eelKoosseis}`
                : "tlv-isikud",
              filtrid: Object.fromEntries(kiibid.map((k) => [k.key, k.silt])),
            }}
          />
        </div>
      </div>

      <FiltriKiibid kiibid={kiibid} tyhjenda={() => {
        seis.tyhjendaFiltrid();
        eemaldaValisFilter?.();
      }} />

      <TabeliYmbris>
        <thead className="border-b border-stone-200 bg-stone-50">
          <tr>
            <SortPais veerg="perenimi" pealkiri="Perenimi" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="eesnimi" pealkiri="Eesnimi" sort={seis.sort} sordi={seis.sordi} />
            {naitaIsanime && (
              <SortPais veerg="isanimi" pealkiri="Isanimi" sort={seis.sort} sordi={seis.sordi} />
            )}
            <SortPais veerg="koosseise" pealkiri="Koosseise" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="esimene_koosseis" pealkiri="Esimene koosseis" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="viimane_koosseis" pealkiri="Viimane koosseis" sort={seis.sort} sordi={seis.sordi} />
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              <span className="inline-flex items-center">
                <SortPaisSisu veerg="peamine_nimekiri" pealkiri="Peamine nimekiri" seis={seis} />
                <HelpTip tekst={ABI.nimekiri} />
              </span>
            </th>
            {naitaAadressi && (
              <SortPais veerg="aadress" pealkiri="Aadress" sort={seis.sort} sordi={seis.sordi} />
            )}
          </tr>
        </thead>
        <tbody>
          {nahtavad.map((r) => (
            <tr
              key={r.isik_id}
              onMouseEnter={() => setHover(r.isik_id)}
              onMouseLeave={() => setHover(null)}
              className="relative border-b border-stone-100 hover:bg-stone-50"
            >
              <td className="px-3 py-1.5 font-medium">
                <Link href={`/isikud/${r.isik_id}/`} className="hover:underline">
                  {r.perenimi || "—"}
                </Link>
                {hover === r.isik_id && (
                  <span className="pointer-events-none absolute left-8 top-full z-30 mt-0.5 w-max max-w-xs rounded-md border border-stone-200 bg-white p-2 text-xs shadow-lg">
                    <strong>{r.eesnimi} {r.perenimi}</strong>
                    {eluaastad(r.synd_kuupaev, r.surm_kuupaev) && (
                      <> · {eluaastad(r.synd_kuupaev, r.surm_kuupaev)}</>
                    )}
                    {r.isanimi && (
                      <>
                        <br />
                        Isanimi: {r.isanimi}
                      </>
                    )}
                    <br />
                    Koosseisud: {r.koosseisud.join(", ") || "—"}
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5">
                <Link href={`/isikud/${r.isik_id}/`} className="hover:underline">
                  {r.eesnimi || "—"}
                </Link>
              </td>
              {naitaIsanime && <td className="px-3 py-1.5">{r.isanimi || "—"}</td>}
              <td className="px-3 py-1.5 text-center">{r.koosseise}</td>
              <td className="px-3 py-1.5">{r.esimene_koosseis || "—"}</td>
              <td className="px-3 py-1.5">{r.viimane_koosseis || "—"}</td>
              <td className="max-w-xs truncate px-3 py-1.5" title={r.peamine_nimekiri}>
                {r.peamine_nimekiri || "—"}
              </td>
              {naitaAadressi && (
                <td className="max-w-xs truncate px-3 py-1.5" title={r.aadressid.join("; ")}>
                  {r.aadressid.join("; ") || "—"}
                </td>
              )}
            </tr>
          ))}
          {nahtavad.length === 0 && (
            <tr>
              <td colSpan={6 + (naitaAadressi ? 1 : 0) + (naitaIsanime ? 1 : 0)} className="px-3 py-6 text-center text-stone-500">
                Filtritele vastavaid isikuid ei leitud.
              </td>
            </tr>
          )}
        </tbody>
      </TabeliYmbris>

      <Paginatsioon leht={leht} lehti={lehti} setLeht={seis.setLeht} kokku={sorditud.length} />
    </div>
  );
}

/** Sordi-nupp ilma <th>-ta (kasutamiseks koos abiikooniga samas päises). */
function SortPaisSisu({
  veerg, pealkiri, seis,
}: {
  veerg: string;
  pealkiri: string;
  seis: { sort: { key: string; desc: boolean }[]; sordi: (k: string, s: boolean) => void };
}) {
  const idx = seis.sort.findIndex((s) => s.key === veerg);
  const aktiivne = idx >= 0 ? seis.sort[idx] : null;
  return (
    <button
      type="button"
      onClick={(e) => seis.sordi(veerg, e.shiftKey)}
      title="Klõps: sorteeri; Shift+klõps: teisene sorteerimisveerg"
      className="inline-flex items-center gap-1 hover:text-stone-900"
    >
      {pealkiri}
      {aktiivne && (
        <span aria-hidden className="text-stone-500">
          {aktiivne.desc ? "▼" : "▲"}
          {seis.sort.length > 1 && <sup className="ml-0.5 text-[10px]">{idx + 1}</sup>}
        </span>
      )}
    </button>
  );
}
