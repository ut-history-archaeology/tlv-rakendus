import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import { isikuRead, koosseisuLiikmedKokku, koosseisuSyndmused, syndmuseIsikud } from "@/lib/derive";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti, kuupaevLyhike, taisnimi } from "@/lib/format";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "@/components/HelpTip";
import KoosseisuSisu from "@/components/KoosseisuSisu";
import MuutusteAjatelg from "@/components/MuutusteAjatelg";
import RingkonnaDiagramm from "@/components/RingkonnaDiagramm";
import ExportButton from "@/components/ExportButton";
import SyndmusteTabel from "@/components/SyndmusteTabel";
import type { JaotuseSegment } from "@/components/JaotusRiba";

const MUUTUSTE_VEERUD = [
  { key: "muutus_id", pealkiri: "muutus_id" },
  { key: "kuupaev", pealkiri: "Kuupäev" },
  { key: "isik_id", pealkiri: "isik_id" },
  { key: "isik", pealkiri: "Isik" },
  { key: "liik", pealkiri: "Liik" },
  { key: "nimekiri", pealkiri: "Nimekiri" },
  { key: "liitus_prot", pealkiri: "Liitumise protokoll" },
  { key: "lahkus_prot", pealkiri: "Lahkumise protokoll" },
  { key: "ryhmavahetus_prot", pealkiri: "Rühmavahetuse protokoll" },
  { key: "peatatud_prot", pealkiri: "Peatamise protokoll" },
  { key: "asendaja", pealkiri: "Asendaja" },
  { key: "asendatav", pealkiri: "Asendatav" },
  { key: "allikaviide", pealkiri: "Allikaviide" },
  { key: "tapsustus", pealkiri: "Täpsustus" },
];

export function generateStaticParams() {
  return loeAndmestik().koosseisud.map((k) => ({ id: k.koosseis_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Koosseis ${id}` };
}

export default async function KoosseisuLeht({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const andmed = loeAndmestik();
  const koosseis = andmed.koosseisud.find((k) => k.koosseis_id === id);
  if (!koosseis) notFound();

  const on1940 = id === "1940-1941";
  const nimiMap = new Map(andmed.isikud.map((i) => [i.isik_id, taisnimi(i)]));

  const liikmeIdd = koosseisuLiikmedKokku(andmed.valimised, andmed.muutused, id);
  const liikmeRead = isikuRead(andmed).filter((r) => liikmeIdd.has(r.isik_id));

  // KS-03: jaotus valimistulemuste (roll=valitud) põhjal
  const valitudRead = andmed.valimised.filter(
    (v) => v.koosseis_id === id && v.roll === "valitud"
  );
  const onNimekirjad = valitudRead.some((v) => v.nimekiri_nimi);
  const onRingkonnad = valitudRead.some((v) => v.ringkond_nr);
  let jaotus: (JaotuseSegment & { isikud: number[] })[] = [];
  let jaotuseAlus: "nimekiri" | "ringkond" = "nimekiri";
  if (onNimekirjad) {
    const grupid = new Map<string, number[]>();
    for (const v of valitudRead) {
      const nimi = v.nimekiri_nimi || "(nimekiri teadmata)";
      grupid.set(nimi, [...(grupid.get(nimi) ?? []), v.isik_id]);
    }
    jaotus = [...grupid.entries()]
      .map(([nimi, isikud]) => ({ nimi, arv: isikud.length, isikud }))
      .sort((a, b) => b.arv - a.arv);
  } else if (onRingkonnad) {
    jaotuseAlus = "ringkond";
    const grupid = new Map<string, number[]>();
    for (const v of valitudRead) {
      const nimi = `Ringkond ${v.ringkond_nr || "?"}`;
      grupid.set(nimi, [...(grupid.get(nimi) ?? []), v.isik_id]);
    }
    jaotus = [...grupid.entries()]
      .map(([nimi, isikud]) => ({ nimi, arv: isikud.length, isikud }))
      .sort((a, b) => a.nimi.localeCompare(b.nimi, "et"));
  }

  // KS-05/KS-08: muutused ja koosolekud
  const muutused = andmed.muutused
    .filter((m) => m.koosseis_id === id)
    .sort((a, b) => (a.kuupaev < b.kuupaev ? -1 : a.kuupaev > b.kuupaev ? 1 : a.muutus_id - b.muutus_id));
  const koosolekud = andmed.koosolekud
    .filter((k) => k.koosseis_id === id)
    .sort((a, b) => (a.kuupaev < b.kuupaev ? -1 : 1));
  const juhatajadKoosolekuti = new Map<string, string[]>();
  for (const j of andmed.juhatajad) {
    juhatajadKoosolekuti.set(j.koosolek_id, [
      ...(juhatajadKoosolekuti.get(j.koosolek_id) ?? []),
      j.juhataja_nimi,
    ]);
  }

  const algus = koosseis.valimised_algus || koosseis.esimene_koosolek;
  const lopp = koosseis.viimane_koosolek || koosseis.valimised_lopp;

  // KS-07: 1939. a valimiste hääled ringkondade kaupa (koosseis 1940)
  const rk1939 = andmed.valimised.filter((v) => v.aasta === 1939 && v.koosseis_id === id);
  const ringkonnaAndmed =
    rk1939.length > 0
      ? [1, 2, 3, 4].map((nr) => {
          const omad = rk1939.filter((v) => v.ringkond_nr === String(nr));
          return {
            ringkond: String(nr),
            haali: omad.reduce((s, v) => s + (v.haaled_kokku ?? 0), 0),
            valituid: omad.filter((v) => v.roll === "valitud").length,
          };
        })
      : [];

  const syndmused = koosseisuSyndmused(andmed, id);
  const syndmusteNimed = Object.fromEntries(
    [...new Set(syndmused.flatMap((s) => [
      ...syndmuseIsikud(s),
      ...("asendaja" in s && s.asendaja !== null ? [s.asendaja] : []),
      ...("asendatav" in s && s.asendatav !== null ? [s.asendatav] : []),
    ]))]
      .filter((i) => nimiMap.has(i))
      .map((i) => [i, nimiMap.get(i)!])
  );

  const muutusteEksport = muutused.map((m) => ({
    muutus_id: m.muutus_id,
    kuupaev: m.kuupaev,
    isik_id: m.isik_id,
    isik: m.isik_id !== null ? nimiMap.get(m.isik_id) ?? "" : "",
    liik: m.liik,
    nimekiri: m.nimekiri,
    liitus_prot: m.liitus_prot,
    lahkus_prot: m.lahkus_prot,
    ryhmavahetus_prot: m.ryhmavahetus_prot,
    peatatud_prot: m.peatatud_prot,
    asendaja: m.asendaja_ID !== null ? nimiMap.get(m.asendaja_ID) ?? "" : "",
    asendatav: m.asendatav_ID !== null ? nimiMap.get(m.asendatav_ID) ?? "" : "",
    allikaviide: m.allikaviide,
    tapsustus: m.tapsustus,
  }));

  const koosolekuteEksport = koosolekud.map((k) => ({
    koosolek_id: k.koosolek_id,
    kuupaev: k.kuupaev,
    kuupaev_lopp: k.kuupaev_lopp,
    nadalapaev: k.nadalapaev,
    vorm: k.vorm,
    juhataja: (juhatajadKoosolekuti.get(k.koosolek_id) ?? []).join("; "),
    koosseis_arv: k.koosseis_arv,
    kohal_arv: k.kohal_arv,
    kohal_arv_2paev: k.kohal_arv_2paev,
  }));

  return (
    <div className="space-y-8">
      <nav aria-label="Asukoht" className="no-print text-sm text-stone-500">
        <Link href="/koosseisud/" className="hover:underline">← Kõik koosseisud</Link>
      </nav>

      {/* KS-02: pea-plokk */}
      <header
        className="rounded-lg border border-stone-200 bg-white p-5"
        style={{ borderTopColor: koosseisuVarv(id), borderTopWidth: 5 }}
      >
        <h1 className="text-3xl font-bold">
          Koosseis {id}
          <HelpTip tekst={ABI.koosseis} />
        </h1>
        {on1940 && (
          <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            {ABI.linnavalitsusVolikoguYlesandeis}
          </p>
        )}
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {koosseis.valimised_algus && (
            <div>
              <dt className="inline font-medium">Valimised: </dt>
              <dd className="inline">
                {kuupaevEesti(koosseis.valimised_algus)}
                {koosseis.valimised_lopp &&
                  koosseis.valimised_lopp !== koosseis.valimised_algus && (
                    <>–{kuupaevLyhike(koosseis.valimised_lopp)}</>
                  )}
              </dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium">Liikmeid kokku: </dt>
            <dd className="inline">
              {liikmeIdd.size} (valitud + hiljem liitunud)
            </dd>
          </div>
          {koosseis.esimene_koosolek && (
            <div>
              <dt className="inline font-medium">Esimene koosolek: </dt>
              <dd className="inline">{kuupaevEesti(koosseis.esimene_koosolek)}</dd>
            </div>
          )}
          {koosseis.viimane_koosolek && (
            <div>
              <dt className="inline font-medium">Viimane koosolek: </dt>
              <dd className="inline">{kuupaevEesti(koosseis.viimane_koosolek)}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium">Koosolekuid: </dt>
            <dd className="inline">{koosolekud.length}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Liikmesmuutusi: </dt>
            <dd className="inline">{syndmused.length} sündmust ({muutused.length} rida)</dd>
          </div>
          {(koosseis.valimised_allikas || koosseis.valimistulemuste_allikas) && (
            <div className="sm:col-span-2">
              <dt className="inline font-medium">Arhiiviviited: </dt>
              <dd className="inline text-stone-600">
                {[koosseis.valimised_allikas, koosseis.valimistulemuste_allikas, koosseis.kandidaatide_allikas]
                  .filter(Boolean)
                  .join("; ")}
              </dd>
            </div>
          )}
        </dl>
      </header>

      {/* KS-03 + KS-04 */}
      {!onNimekirjad && !onRingkonnad && !on1940 && (
        <p className="text-sm text-stone-500">
          Selle koosseisu valimistulemustes nimekirjad puuduvad; jaotusdiagrammi
          ei saa kuvada.
        </p>
      )}
      <KoosseisuSisu
        koosseisId={id}
        read={liikmeRead}
        jaotus={jaotus}
        jaotuseAlus={jaotuseAlus}
        jaotuseSelgitus={onNimekirjad ? ABI.nimekirjaHoiatus : undefined}
      />

      {/* KS-07: 1939 valimiste erikuvar */}
      {ringkonnaAndmed.length > 0 && (
        <section aria-labelledby="ringkonnad">
          <h2 id="ringkonnad" className="mb-2 text-xl font-semibold">
            1939. aasta valimised: hääled ringkondade kaupa
          </h2>
          <RingkonnaDiagramm andmed={ringkonnaAndmed} />
        </section>
      )}

      {/* KS-05: muutuste ajatelg */}
      {muutused.length > 0 && algus && lopp && (
        <section aria-labelledby="muutuste-ajatelg">
          <h2 id="muutuste-ajatelg" className="mb-2 text-xl font-semibold">
            Liikmesmuutused ajateljel
          </h2>
          <MuutusteAjatelg
            algus={algus}
            lopp={lopp}
            muutused={muutused.map((m) => ({ kuupaev: m.kuupaev, liik: m.liik }))}
            koosolekud={koosolekud.map((k) => k.kuupaev)}
          />
        </section>
      )}

      {/* UX-06: liikmesmuutused sündmustena; toorridade eksport (KS-08) jääb */}
      {syndmused.length > 0 && (
        <section aria-labelledby="muutused">
          <h2 id="muutused" className="mb-2 text-xl font-semibold">Liikmesmuutused</h2>
          <SyndmusteTabel
            syndmused={syndmused}
            nimed={syndmusteNimed}
            failinimi={`tlv-syndmused-koosseis-${id}`}
            lisaTegevused={
              <ExportButton
                silt="Toorread"
                read={muutusteEksport}
                veerud={MUUTUSTE_VEERUD}
                meta={{
                  failinimi: `tlv-muutused-koosseis-${id}`,
                  filtrid: { koosseis: id },
                }}
              />
            }
          />
          <p className="mt-1 text-xs text-stone-500">
            {muutused.length} muutuste rida on koondatud {syndmused.length} sündmuseks.
            „Toorread“ laeb alla andmestiku read muutmata kujul.
          </p>
        </section>
      )}

      {/* KS-06: koosolekute loetelu + eksport (KS-08) */}
      {koosolekud.length > 0 && (
        <section aria-labelledby="koosolekud">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="koosolekud" className="text-xl font-semibold">Koosolekud</h2>
            <ExportButton
              read={koosolekuteEksport}
              veerud={[
                { key: "koosolek_id", pealkiri: "koosolek_id" },
                { key: "kuupaev", pealkiri: "Kuupäev" },
                { key: "kuupaev_lopp", pealkiri: "Lõppkuupäev" },
                { key: "nadalapaev", pealkiri: "Nädalapäev" },
                { key: "vorm", pealkiri: "Vorm" },
                { key: "juhataja", pealkiri: "Juhataja" },
                { key: "koosseis_arv", pealkiri: "Koosseisu suurus" },
                { key: "kohal_arv", pealkiri: "Kohal" },
                { key: "kohal_arv_2paev", pealkiri: "Kohal (2. päev)" },
              ]}
              meta={{
                failinimi: `tlv-koosolekud-koosseis-${id}`,
                filtrid: { koosseis: id },
              }}
            />
          </div>
          <div className="max-h-[32rem] overflow-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Kuupäev</th>
                  <th className="px-3 py-2 text-left font-semibold">Vorm</th>
                  <th className="px-3 py-2 text-left font-semibold">Kohalolnud</th>
                  <th className="px-3 py-2 text-left font-semibold">Juhataja</th>
                </tr>
              </thead>
              <tbody>
                {koosolekud.map((k) => (
                  <tr key={k.koosolek_id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <Link href={`/koosolekud/${k.koosolek_id}/`} className="hover:underline">
                        {kuupaevLyhike(k.kuupaev)}
                        {k.kuupaev_lopp && <>–{kuupaevLyhike(k.kuupaev_lopp)}</>}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5">{k.vorm}</td>
                    <td className="px-3 py-1.5 text-center">
                      {k.kohal_arv ?? "—"}
                      {k.kohal_arv_2paev !== null && ` / ${k.kohal_arv_2paev}`}
                    </td>
                    <td className="px-3 py-1.5">
                      {(juhatajadKoosolekuti.get(k.koosolek_id) ?? []).join("; ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
