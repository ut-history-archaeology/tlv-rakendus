"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { KoosolekuRida } from "@/lib/types";
import type { ProtokolliRida } from "@/lib/protokollid/types";
import { VORMI_VARVID } from "@/lib/colors";
import { kuupaevLyhike } from "@/lib/format";
import { multiSort, useTabeliSeis } from "@/lib/useTabeliSeis";
import {
  FiltriKiibid, MinuVaade, Paginatsioon, SortPais, TabeliYmbris,
} from "./TabeliOsad";
import ExportButton from "./ExportButton";
import HelpTip from "./HelpTip";
import TaistekstOtsing from "./TaistekstOtsing";
import { ABI } from "@/lib/abitekstid";

const LEHE_SUURUS = 50;
const VORMID = Object.keys(VORMI_VARVID);
const NADALAPAEVAD = [
  "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev",
];

interface JuhatajaValik {
  id: string; // isik_id või nimi (Sinka)
  nimi: string;
  isik_id: number | null;
}

interface Props {
  read: KoosolekuRida[];
  juhatajaValikud: JuhatajaValik[];
  /** Ekspordi lisaväljad (kuupaev_txt, protokolli algus) koosoleku ID järgi. */
  ekstra: Record<string, { kuupaev_txt: string; protokolli_algus_txt: string }>;
  /** data/protokollid.csv read koosoleku ID järgi (IN-03 veerg; PT-01 lisaveerud ja eksport). */
  protokollid?: Record<string, ProtokolliRida>;
  /**
   * "koosolekud" (vaikimisi): KO-01 diagramm, rida → /koosolekud/<id>/.
   * "protokollid" (PT-01): diagrammita, täistekstiotsing tabeli kohal, veerud Päevakorrapunkte + Sõnu,
   * rida → /protokollid/<id>/, eksport kõigi protokollid.csv veergudega, "Minu vaade" tlv-vaade-protokollid.
   */
  variant?: "koosolekud" | "protokollid";
  /** olemasolevad otsingukillud (aastad) — variant "protokollid" */
  killud?: number[];
}

const PROTOKOLLI_VEERUD: { key: keyof ProtokolliRida; pealkiri: string }[] = [
  { key: "fail", pealkiri: "Korpuse fail" },
  { key: "transkribus_url", pealkiri: "Transkribus" },
  { key: "arhiiviviide", pealkiri: "Arhiiviviide" },
  { key: "esimene_lk", pealkiri: "Esimene lk" },
  { key: "viimane_lk", pealkiri: "Viimane lk" },
  { key: "lehekylgi", pealkiri: "Lehekülgi" },
  { key: "lehekylgi_tekstita", pealkiri: "Lehekülgi tekstita" },
  { key: "sonu", pealkiri: "Sõnu" },
  { key: "lauseid", pealkiri: "Lauseid" },
  { key: "paevakorrapunkte", pealkiri: "Päevakorrapunkte" },
  { key: "olemeid", pealkiri: "Nimeüksusi" },
  { key: "olemeid_PER", pealkiri: "Isikunimesid" },
  { key: "seotud_isikuid", pealkiri: "Seotud isikuid" },
  { key: "konesid", pealkiri: "Kõnesid" },
  { key: "tekst_kb", pealkiri: "Teksti maht (kB)" },
  { key: "lisasid", pealkiri: "Lisasid" },
  { key: "tabeleid", pealkiri: "Tabeleid" },
  { key: "markus", pealkiri: "Märkus" },
];

export default function KoosolekudVaade({
  read, juhatajaValikud, ekstra, protokollid = {}, variant = "koosolekud", killud = [],
}: Props) {
  const onProtokollid = variant === "protokollid";
  const seis = useTabeliSeis(
    onProtokollid
      ? { q: "", aasta: "", algus: "", lopp: "", juhataja: "", vorm: "" }
      : { aasta: "", algus: "", lopp: "", juhataja: "", vorm: "" },
    onProtokollid ? "tlv-vaade-protokollid" : "tlv-vaade-koosolekud"
  );
  const reaLink = (id: string) => (onProtokollid ? `/protokollid/${id}/` : `/koosolekud/${id}/`);

  const filtreeritud = useMemo(() => {
    return read.filter((r) => {
      if (seis.filtrid.aasta && !r.kuupaev.startsWith(seis.filtrid.aasta)) return false;
      if (seis.filtrid.algus && r.kuupaev < seis.filtrid.algus) return false;
      if (seis.filtrid.lopp && r.kuupaev > seis.filtrid.lopp) return false;
      if (seis.filtrid.vorm && r.vorm !== seis.filtrid.vorm) return false;
      if (seis.filtrid.juhataja) {
        const j = seis.filtrid.juhataja;
        const klapib = r.juhatajad.some(
          (x) => String(x.isik_id ?? "") === j || x.nimi === j
        );
        if (!klapib) return false;
      }
      return true;
    });
  }, [read, seis.filtrid]);

  // KO-01: sagedusdiagramm aastate kaupa, vormi kaupa värvitud
  const diagramm = useMemo(() => {
    const aastad = new Map<string, Record<string, number>>();
    for (let a = 1918; a <= 1941; a++) aastad.set(String(a), {});
    for (const r of read) {
      const a = r.kuupaev.slice(0, 4);
      const rec = aastad.get(a);
      if (rec) rec[r.vorm] = (rec[r.vorm] ?? 0) + 1;
    }
    return [...aastad.entries()].map(([aasta, vormid]) => ({ aasta, ...vormid }));
  }, [read]);

  const sorditud = useMemo(
    () =>
      multiSort(
        filtreeritud,
        seis.sort.length ? seis.sort : [{ key: "kuupaev", desc: false }],
        (r, key) => {
          switch (key) {
            case "kuupaev": return r.kuupaev;
            case "nadalapaev": {
              const i = NADALAPAEVAD.indexOf(r.nadalapaev);
              return i < 0 ? null : i;
            }
            case "vorm": return r.vorm;
            case "juhataja": return r.juhatajad[0]?.nimi ?? null;
            case "kohal_arv": return r.kohal_arv;
            case "koosseis_arv": return r.koosseis_arv;
            case "paevakorrapunkte": return protokollid[r.koosolek_id]?.paevakorrapunkte ?? null;
            case "sonu": return protokollid[r.koosolek_id]?.sonu ?? null;
            case "protokoll": return protokollid[r.koosolek_id]?.fail ? 1 : 0;
            default: return null;
          }
        }
      ),
    [filtreeritud, seis.sort, protokollid]
  );

  const lehti = Math.max(1, Math.ceil(sorditud.length / LEHE_SUURUS));
  const leht = Math.min(seis.leht, lehti);
  const nahtavad = sorditud.slice((leht - 1) * LEHE_SUURUS, leht * LEHE_SUURUS);

  const valitudJuhataja = juhatajaValikud.find(
    (j) => j.id === seis.filtrid.juhataja
  );

  const kiibid = [
    ...(seis.filtrid.aasta
      ? [{ key: "a", silt: `Aasta: ${seis.filtrid.aasta}`, eemalda: () => seis.setFilter("aasta", "") }]
      : []),
    ...(seis.filtrid.algus
      ? [{ key: "al", silt: `Alates: ${kuupaevLyhike(seis.filtrid.algus)}`, eemalda: () => seis.setFilter("algus", "") }]
      : []),
    ...(seis.filtrid.lopp
      ? [{ key: "lo", silt: `Kuni: ${kuupaevLyhike(seis.filtrid.lopp)}`, eemalda: () => seis.setFilter("lopp", "") }]
      : []),
    ...(seis.filtrid.vorm
      ? [{ key: "v", silt: `Vorm: ${seis.filtrid.vorm}`, eemalda: () => seis.setFilter("vorm", "") }]
      : []),
    ...(valitudJuhataja
      ? [{ key: "j", silt: `Juhataja: ${valitudJuhataja.nimi}`, eemalda: () => seis.setFilter("juhataja", "") }]
      : []),
  ];

  const ekspordiRead = sorditud.map((r) => ({
    ...(onProtokollid
      ? Object.fromEntries(PROTOKOLLI_VEERUD.map((v) => [v.key, protokollid[r.koosolek_id]?.[v.key] ?? null]))
      : { protokoll_olemas: protokollid[r.koosolek_id]?.fail ? "jah" : "ei" }),
    koosolek_id: r.koosolek_id,
    kuupaev: r.kuupaev,
    kuupaev_lopp: r.kuupaev_lopp,
    nadalapaev: r.nadalapaev,
    vorm: r.vorm,
    koosseis_id: r.koosseis_id,
    juhatajad: r.juhatajad.map((j) => j.nimi).join("; "),
    koosseis_arv: r.koosseis_arv,
    kohal_arv: r.kohal_arv,
    kohal_arv_2paev: r.kohal_arv_2paev,
    kuupaev_txt: ekstra[r.koosolek_id]?.kuupaev_txt ?? "",
    protokolli_algus_txt: ekstra[r.koosolek_id]?.protokolli_algus_txt ?? "",
  }));

  return (
    <div>
      {onProtokollid && (
        <TaistekstOtsing
          q={seis.filtrid.q}
          setQ={(q) => seis.setFilter("q", q)}
          algus={seis.filtrid.algus}
          lopp={seis.filtrid.lopp}
          killud={killud}
        />
      )}
      {/* KO-01 */}
      {!onProtokollid && (
      <section aria-labelledby="sagedus" className="mb-6">
        <h2 id="sagedus" className="mb-1 text-lg font-semibold">
          Koosolekute sagedus aastate kaupa
          <HelpTip tekst={ABI.erakorraline} />
        </h2>
        <p className="mb-2 text-xs text-stone-500">
          Klõps tulbal filtreerib all olevat tabelit vastava aasta järgi.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart
              data={diagramm}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              onClick={(e) => {
                const a = e?.activeLabel;
                if (typeof a === "string" && a) {
                  seis.setFilter("aasta", seis.filtrid.aasta === a ? "" : a);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="aasta" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {VORMID.map((v) => (
                <Bar
                  key={v}
                  dataKey={v}
                  stackId="a"
                  fill={VORMI_VARVID[v]}
                  cursor="pointer"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="sr-only">
          Tulpdiagramm: koosolekute arv aastate 1918–1941 kaupa, jaotatuna
          vormidesse (korraline, erakorraline, linnavalitsus linnavolikogu
          ülesandeis, pidulik, määramata). Sama info on all olevas tabelis.
        </p>
      </section>
      )}

      {/* KO-03 + KO-05 filtrid */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Alates</span>
          <input
            type="date"
            min="1918-01-01"
            max="1941-12-31"
            value={seis.filtrid.algus}
            onChange={(e) => seis.setFilter("algus", e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Kuni</span>
          <input
            type="date"
            min="1918-01-01"
            max="1941-12-31"
            value={seis.filtrid.lopp}
            onChange={(e) => seis.setFilter("lopp", e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">Juhataja</span>
          <select
            value={seis.filtrid.juhataja}
            onChange={(e) => seis.setFilter("juhataja", e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— kõik —</option>
            {juhatajaValikud.map((j) => (
              <option key={j.id} value={j.id}>{j.nimi}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-0.5 block text-xs text-stone-500">
            Vorm
          </span>
          <select
            value={seis.filtrid.vorm}
            onChange={(e) => seis.setFilter("vorm", e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— kõik —</option>
            {VORMID.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <MinuVaade
            salvesta={seis.salvestaVaade}
            ava={seis.avaSalvestatudVaade}
            olemas={seis.salvestatudOlemas}
          />
          <ExportButton
            read={ekspordiRead}
            veerud={[
              { key: "koosolek_id", pealkiri: "koosolek_id" },
              ...(onProtokollid ? [] : [{ key: "protokoll_olemas", pealkiri: "Protokolli täistekst olemas" }]),
              { key: "kuupaev", pealkiri: "Kuupäev" },
              { key: "kuupaev_lopp", pealkiri: "Lõppkuupäev" },
              { key: "nadalapaev", pealkiri: "Nädalapäev" },
              { key: "vorm", pealkiri: "Vorm" },
              { key: "koosseis_id", pealkiri: "Koosseis" },
              { key: "juhatajad", pealkiri: "Juhatajad" },
              { key: "koosseis_arv", pealkiri: "Koosseisu suurus" },
              { key: "kohal_arv", pealkiri: "Kohal" },
              { key: "kohal_arv_2paev", pealkiri: "Kohal (2. päev)" },
              { key: "kuupaev_txt", pealkiri: "Kuupäev (protokolli tekst)" },
              { key: "protokolli_algus_txt", pealkiri: "Protokolli algus (OCR)" },
              ...(onProtokollid ? PROTOKOLLI_VEERUD.map((v) => ({ key: v.key, pealkiri: v.pealkiri })) : []),
            ]}
            meta={{
              failinimi: onProtokollid ? "tlv-protokollid" : "tlv-koosolekud",
              filtrid: Object.fromEntries(kiibid.map((k) => [k.key, k.silt])),
            }}
          />
        </div>
      </div>

      <FiltriKiibid kiibid={kiibid} tyhjenda={seis.tyhjendaFiltrid} />

      {/* KO-02 */}
      <TabeliYmbris>
        <thead className="border-b border-stone-200 bg-stone-50">
          <tr>
            <SortPais veerg="kuupaev" pealkiri="Kuupäev" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="nadalapaev" pealkiri="Nädalapäev" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="vorm" pealkiri="Vorm" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="juhataja" pealkiri="Juhataja" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="kohal_arv" pealkiri="Kohalolnud" sort={seis.sort} sordi={seis.sordi} />
            <SortPais veerg="koosseis_arv" pealkiri="Koosseisu suurus" sort={seis.sort} sordi={seis.sordi} />
            {onProtokollid ? (
              <>
                <SortPais veerg="paevakorrapunkte" pealkiri="Päevakorrapunkte" sort={seis.sort} sordi={seis.sordi} />
                <SortPais veerg="sonu" pealkiri="Sõnu" sort={seis.sort} sordi={seis.sordi} />
              </>
            ) : (
              <SortPais veerg="protokoll" pealkiri="Protokoll" sort={seis.sort} sordi={seis.sordi} />
            )}
          </tr>
        </thead>
        <tbody>
          {nahtavad.map((r) => (
            <tr key={r.koosolek_id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                <Link href={reaLink(r.koosolek_id)} className="hover:underline">
                  {kuupaevLyhike(r.kuupaev)}
                  {r.kuupaev_lopp && <>–{kuupaevLyhike(r.kuupaev_lopp)}</>}
                </Link>
              </td>
              <td className="px-3 py-1.5">{r.nadalapaev}</td>
              <td className="px-3 py-1.5">
                <span
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                  style={{ backgroundColor: VORMI_VARVID[r.vorm] ?? "#cbd5e1" }}
                  aria-hidden
                />
                {r.vorm}
              </td>
              <td className="px-3 py-1.5">
                {r.juhatajad.length === 0 && "—"}
                {r.juhatajad.map((j, i) => (
                  <span key={i}>
                    {i > 0 && "; "}
                    {j.isik_id !== null ? (
                      <Link href={`/isikud/${j.isik_id}/`} className="text-blue-700 hover:underline">
                        {j.nimi}
                      </Link>
                    ) : (
                      j.nimi
                    )}
                  </span>
                ))}
              </td>
              <td className="px-3 py-1.5 text-center">
                {r.kohal_arv ?? "—"}
                {r.kohal_arv_2paev !== null && ` / ${r.kohal_arv_2paev}`}
              </td>
              <td className="px-3 py-1.5 text-center">{r.koosseis_arv ?? "—"}</td>
              {onProtokollid ? (
                <>
                  <td className="px-3 py-1.5 text-center">{protokollid[r.koosolek_id]?.paevakorrapunkte ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {protokollid[r.koosolek_id]?.sonu?.toLocaleString("et") ?? "—"}
                  </td>
                </>
              ) : (
                <td className="px-3 py-1.5 text-center">
                  {protokollid[r.koosolek_id]?.fail ? (
                    <Link href={`/protokollid/${r.koosolek_id}/`} className="text-blue-700 hover:underline" title="Protokolli täistekst">
                      täistekst →
                    </Link>
                  ) : (
                    <span className="text-stone-400" title="Protokolli täistekst puudub">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
          {nahtavad.length === 0 && (
            <tr>
              <td colSpan={onProtokollid ? 8 : 7} className="px-3 py-6 text-center text-stone-500">
                Filtritele vastavaid {onProtokollid ? "protokolle" : "koosolekuid"} ei leitud.
              </td>
            </tr>
          )}
        </tbody>
      </TabeliYmbris>

      <Paginatsioon leht={leht} lehti={lehti} setLeht={seis.setLeht} kokku={sorditud.length} />
    </div>
  );
}
