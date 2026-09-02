import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import {
  isikuAadressid, isikuKoosseisud, juhatamiseStatistika, karjaariSegmendid,
  osavotuStatistika, peamineNimekiri,
} from "@/lib/derive";
import { eluaastad, kuupaevEesti, kuupaevLyhike, taisnimi } from "@/lib/format";
import { koosseisuVarv } from "@/lib/colors";
import { ABI } from "@/lib/abitekstid";
import KarjaarRiba from "@/components/KarjaarRiba";
import HelpTip from "@/components/HelpTip";
import ProfiilTegevused from "@/components/ProfiilTegevused";
import AsendusVork, { type VorguServ } from "@/components/AsendusVork";
import type { Muutus } from "@/lib/types";

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
  const aadressid = isikuAadressid(andmed, id);
  const osavott = osavotuStatistika(andmed, id);
  const juhatamine = juhatamiseStatistika(andmed, id);

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
    perenimi: isik.perenimi,
    eesnimi: isik.eesnimi,
    alt_perenimi: isik.alt_perenimi,
    alt_eesnimi: isik.alt_eesnimi,
    sugu: isik.sugu,
    isanimi: isik.isanimi,
    synd_kuupaev: isik.synd_kuupaev,
    synd_tuletatud: isik.synd_tuletatud,
    surm_kuupaev: isik.surm_kuupaev,
    wikidata: isik.wikidata,
    arhiiviviited: isik.arhiiviviited,
    AKL_ID: isik.AKL_ID,
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
    aadressid,
    osavotustatistika: osavott,
    juhatamine,
  };

  const altKujud = [isik.alt_eesnimi, isik.alt_perenimi].filter(Boolean).join(", ");
  const on1940 = koosseisud.includes("1940-1941");

  return (
    <div className="space-y-8">
      <nav aria-label="Asukoht" className="no-print text-sm text-stone-500">
        <Link href="/isikud/" className="hover:underline">← Kõik isikud</Link>
      </nav>

      {/* PR-01: päis */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{taisnimi(isik)}</h1>
          <p className="mt-1 text-stone-600">
            {eluaastad(isik.synd_kuupaev, isik.surm_kuupaev) && (
              <>
                {isik.synd_kuupaev ? kuupaevEesti(isik.synd_kuupaev) : "?"}
                {isik.synd_tuletatud && (
                  <span className="text-xs text-stone-400"> (tuletatud)</span>
                )}
                {" – "}
                {isik.surm_kuupaev ? kuupaevEesti(isik.surm_kuupaev) : "?"}
              </>
            )}
            {isik.isanimi && <> · isanimi: {isik.isanimi}</>}
          </p>
          {altKujud && (
            <p className="mt-1 text-sm text-stone-500">
              Alternatiivkujud: {altKujud}
            </p>
          )}
          <p className="mt-1 flex flex-wrap gap-3 text-sm">
            {isik.wikidata && (
              <a
                href={`https://www.wikidata.org/wiki/${isik.wikidata}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                Wikidata: {isik.wikidata}
              </a>
            )}
            {isik.arhiiviviited && (
              <span className="text-stone-500">
                Arhiiviviited: {isik.arhiiviviited}
              </span>
            )}
          </p>
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

      {/* PR-04: valimised */}
      {valimised.length > 0 && (
        <section aria-labelledby="valimised">
          <h2 id="valimised" className="mb-2 text-xl font-semibold">
            Valimised
            <HelpTip tekst={ABI.nimekiri} />
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {valimised.map((v, i) => (
              <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{v.aasta}. aasta valimised</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.roll === "valitud"
                        ? "bg-green-100 text-green-800"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {v.roll === "valitud" ? "valitud" : "kandidaat"}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  <div>
                    <dt className="inline font-medium">Koosseis: </dt>
                    <dd className="inline">
                      <Link href={`/koosseisud/${v.koosseis_id}/`} className="hover:underline">
                        {v.koosseis_id}
                      </Link>
                    </dd>
                  </div>
                  {v.nimekiri_nimi && (
                    <div>
                      <dt className="inline font-medium">Nimekiri: </dt>
                      <dd className="inline">
                        {v.nimekiri_nr && <>nr {v.nimekiri_nr} — </>}
                        {v.nimekiri_nimi}
                      </dd>
                    </div>
                  )}
                  {(v.jrk_nimekiri || v.jrk_uld) && (
                    <div>
                      <dt className="inline font-medium">Koht nimekirjas: </dt>
                      <dd className="inline">
                        {v.jrk_nimekiri || v.jrk_uld}
                        {v.jrk_uld && v.jrk_nimekiri && ` (üldjärjestuses ${v.jrk_uld})`}
                      </dd>
                    </div>
                  )}
                  {v.aasta === 1939 && (
                    <>
                      {v.ringkond_nr && (
                        <div>
                          <dt className="inline font-medium">Ringkond: </dt>
                          <dd className="inline">{v.ringkond_nr}</dd>
                        </div>
                      )}
                      {v.haaled_kokku !== null && (
                        <div>
                          <dt className="inline font-medium">Hääli kokku: </dt>
                          <dd className="inline">{v.haaled_kokku}</dd>
                        </div>
                      )}
                    </>
                  )}
                  {v.amet && (
                    <div>
                      <dt className="inline font-medium">Amet: </dt>
                      <dd className="inline">{v.amet}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PR-05: aadressid tekstina */}
      {aadressid.length > 0 && (
        <section aria-labelledby="aadressid">
          <h2 id="aadressid" className="mb-2 text-xl font-semibold">
            Teadaolevad aadressid
          </h2>
          <ul className="list-inside list-disc text-sm text-stone-700">
            {aadressid.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-stone-500">
            Valimisnimekirjade elukohaandmed (peamiselt 1926, 1929 ja 1934).
          </p>
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
