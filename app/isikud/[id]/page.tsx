import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import {
  isikuAadressidKoos, isikuKoosseisud, isikuValimisedKoos, juhatamiseStatistika, karjaariSegmendid,
  mainimisedProfiilile, osavotuStatistika, peamineNimekiri,
} from "@/lib/derive";
import { kuupaevEesti, kuupaevLyhike, taisnimi, wikidataQid } from "@/lib/format";
import { koosseisuVarv } from "@/lib/colors";
import { ABI } from "@/lib/abitekstid";
import KarjaarRiba from "@/components/KarjaarRiba";
import HelpTip from "@/components/HelpTip";
import ProfiilTegevused from "@/components/ProfiilTegevused";
import AsendusVork, { type VorguServ } from "@/components/AsendusVork";
import ValimisedKoos from "@/components/ValimisedKoos";
import type { Muutus } from "@/lib/types";
import type { ReactNode } from "react";

export function generateStaticParams() {
  return loeAndmestik().isikud.map((i) => ({ id: String(i.isik_id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const isik = loeAndmestik().isikud.find((i) => i.isik_id === Number(id));
  return { title: isik ? taisnimi(isik) : "Isik" };
}

function protokolliViide(m: Muutus): string {
  switch (m.liik) {
    case "liitumine": return m.liitus_prot;
    case "lahkumine": return m.lahkus_prot;
    case "liitumine&lahkumine":
      return [m.liitus_prot, m.lahkus_prot].filter(Boolean).join(" / ");
    case "rühmavahetus": return m.ryhmavahetus_prot;
    case "peatamine": return m.peatatud_prot;
    default: return "";
  }
}

export default async function IsikuProfiil({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const andmed = loeAndmestik();
  const isik = andmed.isikud.find((i) => i.isik_id === id);
  if (!isik) notFound();

  const nimiMap = new Map(andmed.isikud.map((i) => [i.isik_id, taisnimi(i)]));
  const koosseisud = isikuKoosseisud(andmed, id);
  const segmendid = karjaariSegmendid(andmed, id);
  const muutused = andmed.muutused
    .filter((m) => m.isik_id === id)
    .sort((a, b) => (a.kuupaev < b.kuupaev ? -1 : 1));
  const valimised = andmed.valimised
    .filter((v) => v.isik_id === id)
    .sort((a, b) => a.aasta - b.aasta);
  const valimisedKoos = isikuValimisedKoos(andmed, id);
  const aadressid = isikuAadressidKoos(andmed, id);
  const osavott = osavotuStatistika(andmed, id);
  const juhatamine = juhatamiseStatistika(andmed, id);
  const mainimised = mainimisedProfiilile(andmed, id);

  // Asendussuhete võrk (PR-11)
  const servaMap = new Map<string, VorguServ>();
  for (const m of andmed.muutused) {
    const lisa = (teineId: number | null, suhe: VorguServ["suhe"]) => {
      if (teineId === null || teineId === id) return;
      const nimi = nimiMap.get(teineId);
      if (!nimi) return;
      servaMap.set(`${teineId}|${suhe}`, { isik_id: teineId, nimi, suhe, kuupaev: m.kuupaev });
    };
    if (m.isik_id === id) {
      lisa(m.asendaja_ID, "asendaja");
      lisa(m.asendatav_ID, "asendatav");
    } else if (m.asendaja_ID === id && m.isik_id !== null) {
      lisa(m.isik_id, "asendatav");
    } else if (m.asendatav_ID === id && m.isik_id !== null) {
      lisa(m.isik_id, "asendaja");
    }
  }
  const servad = [...servaMap.values()];

  const profiilJSON = {
    isik_id: id,
    mainimised_protokollides: mainimised
      ? { protokolle: mainimised.protokolle, kordi: mainimised.kordi, toenaolisi: mainimised.toenaolisi, loetelu: mainimised.loetelu }
      : null,
    perenimi: isik.perenimi,
    eesnimi: isik.eesnimi,
    alt_perenimi: isik.alt_perenimi,
    alt_eesnimi: isik.alt_eesnimi,
    sugu: isik.sugu,
    synd_kuupaev: isik.synd_kuupaev,
    synd_tuletatud: isik.synd_tuletatud,
    surm_kuupaev: isik.surm_kuupaev,
    wikidata: isik.wikidata,
    wikidata_qid: wikidataQid(isik.wikidata),
    arhiiviviited: isik.arhiiviviited,
    koosseisud,
    peamine_nimekiri: peamineNimekiri(andmed, id),
    karjaar: segmendid,
    muutused: muutused.map((m) => ({
      kuupaev: m.kuupaev, liik: m.liik, koosseis_id: m.koosseis_id,
      protokolliviide: protokolliViide(m), nimekiri: m.nimekiri,
      asendaja_ID: m.asendaja_ID, asendatav_ID: m.asendatav_ID,
      tapsustus: m.tapsustus,
    })),
    valimised: valimised.map((v) => ({
      aasta: v.aasta, koosseis_id: v.koosseis_id, roll: v.roll,
      nimekiri_nr: v.nimekiri_nr, nimekiri_nimi: v.nimekiri_nimi,
      ringkond_nr: v.ringkond_nr, jrk_uld: v.jrk_uld,
      jrk_nimekiri: v.jrk_nimekiri, jrk_ringkond: v.jrk_ringkond,
      haaled_kokku: v.haaled_kokku, amet: v.amet,
    })),
    valimised_koos: valimisedKoos,
    aadressid: aadressid.map(({ tekst, aastad }) => ({ tekst, aastad })),
    osavotustatistika: osavott,
    juhatamine,
  };

  const altKujud = [isik.alt_eesnimi, isik.alt_perenimi].filter(Boolean).join(", ");
  const qid = wikidataQid(isik.wikidata);

  // UX-01: päise andmeplokk — ainult täidetud väljad (sugu, isanimi ja AKL ID ei kuvata)
  const paiseValjad: [string, ReactNode][] = [];
  if (isik.synd_kuupaev) {
    paiseValjad.push(["Sündinud", (
      <>
        {kuupaevEesti(isik.synd_kuupaev)}
        {isik.synd_tuletatud && <span className="text-xs text-stone-400"> (tuletatud)</span>}
      </>
    )]);
  }
  if (isik.surm_kuupaev) paiseValjad.push(["Surnud", kuupaevEesti(isik.surm_kuupaev)]);
  if (altKujud) paiseValjad.push(["Alternatiivkujud", altKujud]);
  if (qid) {
    paiseValjad.push(["Wikidata", (
      <a
        href={`https://www.wikidata.org/wiki/${qid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 underline"
        aria-label={`Wikidata: ${qid} (avaneb uues aknas)`}
      >
        {qid}<span aria-hidden> ↗</span>
      </a>
    )]);
  }
  if (isik.arhiiviviited) paiseValjad.push(["Arhiiviviited", isik.arhiiviviited]);
  const on1940 = koosseisud.includes("1940-1941");

  return (
    <div className="space-y-6">
      <nav aria-label="Asukoht" className="no-print text-sm text-stone-500">
        <Link href="/isikud/" className="hover:underline">← Kõik isikud</Link>
      </nav>

      {/* PR-01: päis */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{taisnimi(isik)}</h1>
          {paiseValjad.length > 0 && (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {paiseValjad.map(([silt, sisu]) => (
                <div key={silt} className="contents">
                  <dt className="font-medium text-stone-500">{silt}</dt>
                  <dd className="text-stone-800">{sisu}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <ProfiilTegevused profiil={profiilJSON} failinimi={`tlv-isik-${id}`} />
      </header>

      {on1940 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {ABI.linnavalitsusVolikoguYlesandeis}
        </p>
      )}

      {/* PR-02: karjääririba */}
      <section aria-labelledby="karjaar">
        <h2 id="karjaar" className="mb-2 text-xl font-semibold">
          Karjäär volikogus
          <HelpTip tekst={ABI.koosseis} />
        </h2>
        {segmendid.length > 0 ? (
          <KarjaarRiba segmendid={segmendid} />
        ) : (
          <p className="text-sm text-stone-500">
            Volikogu liikmeks olemise andmed puuduvad (oli kandidaat).
          </p>
        )}
      </section>

      {/* PR-04 / UX-03: valimised ühe kirjena aasta kohta */}
      {valimisedKoos.length > 0 && (
        <section aria-labelledby="valimised">
          <h2 id="valimised" className="mb-2 text-xl font-semibold">Valimised</h2>
          <ValimisedKoos kirjed={valimisedKoos} />
        </section>
      )}

      {/* PR-03: kronoloogilised sündmused */}
      {muutused.length > 0 && (
        <section aria-labelledby="syndmused">
          <h2 id="syndmused" className="mb-2 text-xl font-semibold">
            Liikmesmuutused
          </h2>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-max text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Kuupäev</th>
                  <th className="px-3 py-2 text-left font-semibold">Koosseis</th>
                  <th className="px-3 py-2 text-left font-semibold">Liik</th>
                  <th className="px-3 py-2 text-left font-semibold">Protokolliviide</th>
                  <th className="px-3 py-2 text-left font-semibold">Asendussuhe</th>
                  <th className="px-3 py-2 text-left font-semibold">Täpsustus</th>
                </tr>
              </thead>
              <tbody>
                {muutused.map((m) => (
                  <tr key={m.muutus_id} className="border-b border-stone-100">
                    <td className="px-3 py-1.5">{kuupaevLyhike(m.kuupaev)}</td>
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/koosseisud/${m.koosseis_id}/`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: koosseisuVarv(m.koosseis_id) }}
                          aria-hidden
                        />
                        {m.koosseis_id}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5">{m.liik}</td>
                    <td className="px-3 py-1.5">{protokolliViide(m) || "—"}</td>
                    <td className="px-3 py-1.5">
                      {m.asendaja_ID !== null && nimiMap.has(m.asendaja_ID) && (
                        <>
                          asendaja:{" "}
                          <Link href={`/isikud/${m.asendaja_ID}/`} className="text-blue-700 hover:underline">
                            {nimiMap.get(m.asendaja_ID)}
                          </Link>
                        </>
                      )}
                      {m.asendatav_ID !== null && nimiMap.has(m.asendatav_ID) && (
                        <>
                          {m.asendaja_ID !== null && "; "}
                          asendas:{" "}
                          <Link href={`/isikud/${m.asendatav_ID}/`} className="text-blue-700 hover:underline">
                            {nimiMap.get(m.asendatav_ID)}
                          </Link>
                        </>
                      )}
                      {m.asendaja_ID === null && m.asendatav_ID === null && "—"}
                    </td>
                    <td className="max-w-xs truncate px-3 py-1.5" title={m.tapsustus}>
                      {m.tapsustus || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PR-06: osavõtustatistika */}
      {(osavott.kohal > 0 || osavott.puudub > 0 || osavott.tuletatudKohal > 0) && (
        <section aria-labelledby="osavott">
          <h2 id="osavott" className="mb-2 text-xl font-semibold">
            Osavõtt koosolekutest
            <HelpTip tekst={ABI.tuletatudKohalolu} />
          </h2>
          <div className="grid max-w-lg grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <span className="block font-serif text-2xl font-bold">{osavott.kohal}</span>
              <span className="text-xs text-stone-600">protokollis kohalolijana</span>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <span className="block font-serif text-2xl font-bold">{osavott.puudub}</span>
              <span className="text-xs text-stone-600">protokollis puudujana</span>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <span className="block font-serif text-2xl font-bold">{osavott.tuletatudKohal}</span>
              <span className="text-xs text-stone-600">kohalolu (tuletatud)</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Arvestatud on ainult kõrge ja keskmise kindlusega seotud
            protokollikirjeid; tuletatud kohalolu põhineb liikmelisusel.
          </p>
        </section>
      )}

      {/* PR-12: mainimised protokollides */}
      {mainimised && (
        <section aria-labelledby="mainimised">
          <h2 id="mainimised" className="mb-2 text-xl font-semibold">
            Mainimised protokollides
            <HelpTip tekst={ABI.automaatmargendus} />
          </h2>
          <p className="text-sm text-stone-700">
            Nimetatud {mainimised.protokolle} protokollis ({mainimised.kordi} korda).
            {mainimised.toenaolisi > 0 && (
              <>
                {" "}Lisaks {mainimised.toenaolisi} tõenäolist mainimist ({mainimised.toenaolisiProtokolle} protokollis),
                kus sama nimekuju võib viidata ka teistele isikutele.
              </>
            )}
          </p>
          <p className="mb-2 mt-1 inline-block rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
            automaatne — nimeüksused ja isikuseosed on tuvastatud keelemudeliga
          </p>
          {(() => {
            const loend = (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {mainimised.loetelu.map((l) => (
                  <li key={l.koosolek_id} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: koosseisuVarv(l.koosseis_id) }}
                      aria-hidden
                    />
                    <Link href={`/protokollid/${l.koosolek_id}/?isik=${id}`} className="text-blue-700 hover:underline">
                      {kuupaevLyhike(l.kuupaev)}
                    </Link>
                    <span className="text-xs text-stone-500">
                      {l.kindlaid > 0 && `${l.kindlaid}×`}
                      {l.kindlaid > 0 && l.toenaolisi > 0 && " + "}
                      {l.toenaolisi > 0 && `${l.toenaolisi}× ?`}
                    </span>
                  </li>
                ))}
              </ul>
            );
            return mainimised.loetelu.length > 20 ? (
              <details>
                <summary className="cursor-pointer select-none text-sm text-blue-700">
                  Näita kõiki ({mainimised.loetelu.length} protokolli)
                </summary>
                <div className="mt-2">{loend}</div>
              </details>
            ) : (
              loend
            );
          })()}
        </section>
      )}

      {/* PR-08: juhatamine */}
      {juhatamine && (
        <section aria-labelledby="juhatamine">
          <h2 id="juhatamine" className="mb-2 text-xl font-semibold">
            Koosolekute juhatamine
          </h2>
          <p className="text-sm text-stone-700">
            Juhatas {juhatamine.arv} koosolekut vahemikus{" "}
            {kuupaevEesti(juhatamine.esimene)} – {kuupaevEesti(juhatamine.viimane)}.{" "}
            Vormide kaupa:{" "}
            {juhatamine.vormid.map(([vorm, arv]) => `${vorm} (${arv})`).join(", ")}.
          </p>
        </section>
      )}

      {/* PR-05 / UX-04: aadressid koondatuna */}
      {aadressid.length > 0 && (
        <section aria-labelledby="aadressid">
          <h2 id="aadressid" className="mb-2 text-xl font-semibold">
            Aadressid valimisnimekirjades
          </h2>
          {aadressid.length === 1 ? (
            <p className="text-sm text-stone-700">
              {aadressid[0].tekst} ({aadressid[0].aastad.join(", ")})
            </p>
          ) : (
            <ul className="list-inside list-disc text-sm text-stone-700">
              {aadressid.map((a) => (
                <li key={a.tekst}>
                  {a.tekst} ({a.aastad.join(", ")})
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-stone-500">
            Elukoht valimisnimekirjade ja -tulemuste järgi (1917–1939).
          </p>
        </section>
      )}

      {/* PR-11: asendussuhete võrk */}
      {servad.length > 0 && (
        <section aria-labelledby="vork">
          <h2 id="vork" className="mb-2 text-xl font-semibold">
            Asendussuhted
          </h2>
          <AsendusVork keskneNimi={taisnimi(isik)} servad={servad} />
          <p className="text-xs text-stone-500">
            <span className="mr-3 inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-700" aria-hidden />
              asendas teda
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-800" aria-hidden />
              tema asendas
            </span>
          </p>
        </section>
      )}
    </div>
  );
}
