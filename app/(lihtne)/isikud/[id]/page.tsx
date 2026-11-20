import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import {
  isikuAadressidKoos, isikuAjalugu, isikuAastad, isikuKoosseisud, isikuValimisedKoos, juhatamiseStatistika,
  karjaariSegmendid, koosseisuRibaLoigud, LIIKMEKIRJE_PUUDUB, allikaviiteKoosolek, liikmekirjePuudub,
  mainimisedProfiilile, nimekirjaNimed, osalemine, osavotuStatistika, peamineNimekiri,
} from "@/lib/derive";
import { kuupaevLyhike, taisnimi, wikidataQid } from "@/lib/format";
import { arhiiviLingid } from "@/lib/viited";
import { ABI } from "@/lib/abitekstid";
import type { Muutus } from "@/lib/types";
import LihtneLeht from "@/components/LihtneLeht";
import KoosseisuRiba from "@/components/KoosseisuRiba";
import IsikuAjalugu from "@/components/IsikuAjalugu";
import IsikuTegevused from "@/components/IsikuTegevused";

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
      // PA-08: võrdsed kuupäevad üks kord
      return [...new Set([m.liitus_prot, m.lahkus_prot].filter(Boolean))].join(" / ");
    case "rühmavahetus": return m.ryhmavahetus_prot;
    case "peatamine": return m.peatatud_prot;
    default: return "";
  }
}

const HALL_LINK = "text-hall underline decoration-raam underline-offset-2 hover:text-tekst";

/** PR5-01…PR5-05: päis, koosseisuriba, ajalugu, protokollides, jalus. */
export default async function IsikuProfiil({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const andmed = loeAndmestik();
  const isik = andmed.isikud.find((i) => i.isik_id === id);
  if (!isik) notFound();

  const nimed = Object.fromEntries(andmed.isikud.map((i) => [i.isik_id, taisnimi(i)]));
  const koosseisud = isikuKoosseisud(andmed, id);
  const segmendid = karjaariSegmendid(andmed, id);
  const aastad = isikuAastad(segmendid);
  const loigud = koosseisuRibaLoigud(andmed, id);
  const ajalugu = isikuAjalugu(andmed, id);
  const liikmekirje = liikmekirjePuudub(andmed, id, koosseisud);
  const mainimised = mainimisedProfiilile(andmed, id);
  const juhatamine = juhatamiseStatistika(andmed, id);
  const osa = osalemine(andmed, id);

  // Profiili JSON (PR-09): sisu muutmata; lisaks isanimi ja AKL ID (omaniku otsus 20.11.2026).
  const muutused = andmed.muutused
    .filter((m) => m.isik_id === id)
    .sort((a, b) => (a.kuupaev < b.kuupaev ? -1 : 1));
  const valimised = andmed.valimised
    .filter((v) => v.isik_id === id)
    .sort((a, b) => a.aasta - b.aasta);
  const profiilJSON = {
    isik_id: id,
    mainimised_protokollides: mainimised
      ? { protokolle: mainimised.protokolle, kordi: mainimised.kordi, toenaolisi: mainimised.toenaolisi, loetelu: mainimised.loetelu }
      : null,
    perenimi: isik.perenimi,
    eesnimi: isik.eesnimi,
    alt_perenimi: isik.alt_perenimi,
    alt_eesnimi: isik.alt_eesnimi,
    isanimi: isik.isanimi,
    sugu: isik.sugu,
    synd_kuupaev: isik.synd_kuupaev,
    synd_tuletatud: isik.synd_tuletatud,
    surm_kuupaev: isik.surm_kuupaev,
    wikidata: isik.wikidata,
    wikidata_qid: wikidataQid(isik.wikidata),
    AKL_ID: isik.AKL_ID,
    arhiiviviited: isik.arhiiviviited,
    koosseisud,
    peamine_nimekiri: peamineNimekiri(andmed, id),
    liikmekirje_puudub: liikmekirje ? liikmekirje.tekst : null,
    karjaar: segmendid,
    muutused: muutused.map((m) => ({
      kuupaev: m.kuupaev, liik: m.liik, koosseis_id: m.koosseis_id,
      protokolliviide: protokolliViide(m), nimekiri: m.nimekiri,
      allikaviide: m.allikaviide,
      koosolek_id: allikaviiteKoosolek(andmed, m.allikaviide, [m.kuupaev])?.koosolek_id ?? null,
      asendaja_ID: m.asendaja_ID, asendatav_ID: m.asendatav_ID,
      tapsustus: m.tapsustus,
    })),
    valimised: valimised.map((v) => ({
      aasta: v.aasta, koosseis_id: v.koosseis_id, roll: v.roll,
      nimekiri_nr: v.nimekiri_nr, nimekiri_nimi: v.nimekiri_nimi,
      nimekiri_id: v.nimekiri_id, nimekiri_kanooniline: v.nimekiri_id !== null ? nimekirjaNimed(andmed).get(v.nimekiri_id) ?? "" : "",
      nimekiri_kontrollida: v.nimekiri_kontrollida,
      ringkond_nr: v.ringkond_nr, jrk_uld: v.jrk_uld,
      jrk_nimekiri: v.jrk_nimekiri, jrk_ringkond: v.jrk_ringkond,
      haaled_kokku: v.haaled_kokku, amet: v.amet,
    })),
    valimised_koos: isikuValimisedKoos(andmed, id),
    aadressid: isikuAadressidKoos(andmed, id).map(({ tekst, aastad }) => ({ tekst, aastad })),
    osavotustatistika: osavotuStatistika(andmed, id),
    juhatamine,
  };

  // PR5-01: eluaastad (osaline kuupäev nagu andmetes) ja üks hall rida
  const eluaastad = isik.synd_kuupaev || isik.surm_kuupaev
    ? `${kuupaevLyhike(isik.synd_kuupaev) || "?"} – ${kuupaevLyhike(isik.surm_kuupaev) || "?"}`
    : "";
  const altKujud = [isik.alt_eesnimi, isik.alt_perenimi]
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean)
    .join(", ");
  const qid = wikidataQid(isik.wikidata);
  const halliRida = [
    ...(altKujud ? [<span key="alt">ka {altKujud}</span>] : []),
    ...(qid
      ? [
          <a key="wd" href={`https://www.wikidata.org/wiki/${qid}`} target="_blank" rel="noopener noreferrer" title={qid} className={HALL_LINK}>
            Wikidata<span aria-hidden> ↗</span>
          </a>,
        ]
      : []),
  ];

  // PR5-04
  const kindladMainimised = mainimised?.loetelu.filter((l) => l.kindlaid > 0) ?? [];
  const juhatamiseAastad = juhatamine
    ? isikuAastad([{ algus: juhatamine.esimene, lopp: juhatamine.viimane }])
    : null;
  const protokollides = kindladMainimised.length > 0 || juhatamine || osa.liige > 0;
  const viited = arhiiviLingid(isik.arhiiviviited);

  return (
    <LihtneLeht tagasi={{ href: "/isikud/", tekst: "Volinikud" }}>
      <main className="flex flex-col gap-12 pb-12 pt-8">
        {/* PR5-01: päis */}
        <header className="flex flex-col gap-3.5">
          <h1 className="text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]">{taisnimi(isik)}</h1>
          {eluaastad && (
            <p className="text-lg text-tekst-2">
              {eluaastad}
              {isik.synd_tuletatud && <span className="text-hall"> (tuletatud)</span>}
            </p>
          )}
          {halliRida.length > 0 && (
            <p className="text-[15px] leading-relaxed text-hall">
              {halliRida.map((o, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {o}
                </span>
              ))}
            </p>
          )}
        </header>

        {/* PR5-02: koosseisuriba */}
        <section aria-labelledby="koosseisud" className="flex flex-col gap-1">
          <h2 id="koosseisud" className="sr-only">Koosseisud</h2>
          {liikmekirje ? (
            <div className="text-[17px]">
              <p>{LIIKMEKIRJE_PUUDUB}.</p>
              <p className="mt-1 text-sm text-hall">
                Andmetes on siiski tõendeid, et isik oli volikogu liige
                {liikmekirje.koosseisud.length > 0 && <> (koosseis {liikmekirje.koosseisud.join(", ")})</>}:{" "}
                {[
                  ...liikmekirje.muutused.map((m) => `${m.liik} ${kuupaevLyhike(m.kuupaev)} (muutus #${m.muutus_id})`),
                  ...(liikmekirje.osavotuKordi > 0 ? [`protokollides (osavõtus) nimetatud ${liikmekirje.osavotuKordi} korda`] : []),
                ].join("; ")}.
                {" "}Liikmelisust ei ole tuletatud (README „Lahtised andmeküsimused“ L-06).
              </p>
            </div>
          ) : koosseisud.length > 0 ? (
            <p className="text-[17px]">
              Linnavolikogus <strong className="font-semibold">{koosseisud.length} koosseisus</strong>
              {aastad && <>, {aastad}</>}
            </p>
          ) : (
            <p className="text-[17px]">Volikogu liikmeks olemise andmed puuduvad (oli kandidaat).</p>
          )}
          <KoosseisuRiba loigud={loigud} />
          {koosseisud.includes("1940-1941") && (
            <p className="text-sm text-hall">{ABI.linnavalitsusVolikoguYlesandeis}</p>
          )}
        </section>

        {/* PR5-03: ajalugu */}
        {ajalugu.length > 0 && (
          <section aria-labelledby="ajalugu">
            <h2 id="ajalugu" className="mb-2 text-[26px]">Ajalugu</h2>
            <IsikuAjalugu kirjed={ajalugu} isikId={id} nimed={nimed} />
          </section>
        )}

        {/* PR5-04: protokollides */}
        {protokollides && (
          <section aria-labelledby="protokollides" className="flex flex-col gap-2.5">
            <h2 id="protokollides" className="text-[26px]">Protokollides</h2>
            {kindladMainimised.length > 0 && (
              <details className="text-base text-tekst-2">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  Nimetatud {kindladMainimised.length} koosolekul.{" "}
                  <span className="text-link underline underline-offset-2">Vaata mainimisi</span>
                </summary>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {kindladMainimised.map((l) => (
                    <li key={l.koosolek_id}>
                      <Link href={`/protokollid/${l.koosolek_id}/?isik=${id}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                        {kuupaevLyhike(l.kuupaev)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {juhatamine && (
              <p className="text-base text-tekst-2">
                Juhatas {juhatamine.arv} koosolekut{juhatamiseAastad && <> ({juhatamiseAastad})</>}.
              </p>
            )}
            {osa.liige > 0 && (
              <p className="text-base text-tekst-2">
                Osales {osa.osales} koosolekul {osa.liige}-st, mil oli liige.{" "}
                <span className="text-hall">(tuletatud)</span>
              </p>
            )}
          </section>
        )}
      </main>

      {/* PR5-05: jalus */}
      <footer className="mb-16 flex flex-col gap-3 border-t border-joon pt-6 text-sm text-hall">
        {viited.length > 0 && (
          <p>
            Arhiiviviited:{" "}
            {viited.map((v, i) => (
              <span key={i}>
                {i > 0 && ", "}
                {v.url ? (
                  <a href={v.url} target="_blank" rel="noopener noreferrer" title="Ava Rahvusarhiivis (avaneb uues aknas)" className={HALL_LINK}>
                    {v.tekst}
                  </a>
                ) : v.tekst}
              </span>
            ))}
          </p>
        )}
        <IsikuTegevused nimi={taisnimi(isik)} profiil={profiilJSON} failinimi={`tlv-isik-${id}`} />
      </footer>
    </LihtneLeht>
  );
}
