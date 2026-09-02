import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import { tuletatudKohalolijad } from "@/lib/derive";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti, taisnimi } from "@/lib/format";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "@/components/HelpTip";
import ProfiilTegevused from "@/components/ProfiilTegevused";

export function generateStaticParams() {
  return loeAndmestik().koosolekud.map((k) => ({ id: k.koosolek_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const k = loeAndmestik().koosolekud.find((x) => x.koosolek_id === id);
  return { title: k ? `Koosolek ${kuupaevEesti(k.kuupaev)}` : "Koosolek" };
}

export default async function KoosolekuLeht({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const andmed = loeAndmestik();
  const koosolek = andmed.koosolekud.find((k) => k.koosolek_id === id);
  if (!koosolek) notFound();

  const nimiMap = new Map(andmed.isikud.map((i) => [i.isik_id, taisnimi(i)]));
  const juhatajad = andmed.juhatajad.filter((j) => j.koosolek_id === id);
  const osavott = andmed.osavott.filter((o) => o.koosolek_id === id);
  const kohal = osavott.filter((o) => o.staatus === "kohal");
  const puudub = osavott.filter((o) => o.staatus === "puudub");
  const tuletatud = tuletatudKohalolijad(andmed, koosolek).map((iid) => ({
    isik_id: iid,
    nimi: nimiMap.get(iid) ?? String(iid),
  }));
  tuletatud.sort((a, b) => a.nimi.localeCompare(b.nimi, "et"));

  const on1940 = koosolek.koosseis_id === "1940-1941";

  const jsonEksport = {
    koosolek_id: id,
    kuupaev: koosolek.kuupaev,
    kuupaev_lopp: koosolek.kuupaev_lopp,
    nadalapaev: koosolek.nadalapaev,
    vorm: koosolek.vorm,
    koosseis_id: koosolek.koosseis_id,
    juhatajad: juhatajad.map((j) => ({ nimi: j.juhataja_nimi, isik_id: j.isik_id })),
    koosseis_arv: koosolek.koosseis_arv,
    kohal_arv: koosolek.kohal_arv,
    kohal_arv_2paev: koosolek.kohal_arv_2paev,
    protokollis_kohal: kohal.map((o) => ({
      nimi_toor: o.nimi_toor, isik_id: o.isik_id, sidumise_kindlus: o.sidumise_kindlus,
    })),
    protokollis_puudub: puudub.map((o) => ({
      nimi_toor: o.nimi_toor, isik_id: o.isik_id, sidumise_kindlus: o.sidumise_kindlus,
    })),
    tuletatud_kohalolijad: tuletatud,
    kuupaev_txt: koosolek.kuupaev_txt,
    protokolli_algus_txt: koosolek.protokolli_algus_txt,
  };

  function nimeLoend(kirjed: typeof kohal) {
    return (
      <ul className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm">
        {kirjed.map((o, i) => (
          <li key={i} className="after:content-[',_'] last:after:content-none">
            {o.isik_id !== null &&
            (o.sidumise_kindlus === "kõrge" || o.sidumise_kindlus === "keskmine") ? (
              <Link href={`/isikud/${o.isik_id}/`} className="text-blue-700 hover:underline">
                {o.nimi_toor}
              </Link>
            ) : o.sidumise_kindlus === "mitmene" ? (
              <span
                className="text-stone-500"
                title="Mitmene vaste: nimekuju võib viidata mitmele isikule"
              >
                {o.nimi_toor}
                <sup className="text-amber-600">?</sup>
              </span>
            ) : (
              <span className="text-stone-400" title="Isikut ei õnnestunud siduda">
                {o.nimi_toor}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Asukoht" className="no-print text-sm text-stone-500">
        <Link href="/koosolekud/" className="hover:underline">← Kõik koosolekud</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Koosolek {kuupaevEesti(koosolek.kuupaev)}
            {koosolek.kuupaev_lopp && <>–{kuupaevEesti(koosolek.kuupaev_lopp)}</>}
          </h1>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Nädalapäev: </dt>
              <dd className="inline">{koosolek.nadalapaev}</dd>
            </div>
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
            {koosolek.koosseis_arv !== null && (
              <div>
                <dt className="inline font-medium">Koosseisu suurus: </dt>
                <dd className="inline">{koosolek.koosseis_arv}</dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium">Kohalolnuid protokolli järgi: </dt>
              <dd className="inline">
                {koosolek.kohal_arv ?? "—"}
                {koosolek.kohal_arv_2paev !== null && (
                  <> (2. päeval {koosolek.kohal_arv_2paev})</>
                )}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Protokollis nimetatud puudujaid: </dt>
              <dd className="inline">{puudub.length}</dd>
            </div>
          </dl>
        </div>
        <ProfiilTegevused profiil={jsonEksport} failinimi={`tlv-koosolek-${id}`} />
      </header>

      {on1940 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {ABI.linnavalitsusVolikoguYlesandeis} Sidumata isikunimed on teadlik
          andmelünk: nõukogude perioodi linnavalitsuse liikmed puuduvad
          volinike andmestikust.
        </p>
      )}

      {kohal.length > 0 && (
        <section aria-labelledby="kohal">
          <h2 id="kohal" className="mb-2 text-xl font-semibold">
            Protokollis nimetatud kohalolijad ({kohal.length})
            <HelpTip tekst={ABI.sidumiseKindlus} />
          </h2>
          {nimeLoend(kohal)}
        </section>
      )}

      {puudub.length > 0 && (
        <section aria-labelledby="puudub">
          <h2 id="puudub" className="mb-2 text-xl font-semibold">
            Protokollis nimetatud puudujad ({puudub.length})
            <HelpTip tekst={ABI.sidumiseKindlus} />
          </h2>
          {nimeLoend(puudub)}
        </section>
      )}

      <section aria-labelledby="tuletatud">
        <h2 id="tuletatud" className="mb-2 text-xl font-semibold">
          Tuletatud kohalolijad ({tuletatud.length})
          <HelpTip tekst={ABI.tuletatudKohalolu} />
        </h2>
        <p className="mb-2 inline-block rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
          tuletatud — koosseisu sel kuupäeval kehtinud liikmed miinus
          protokollis nimetatud puudujad
        </p>
        {tuletatud.length > 0 ? (
          <ul className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm">
            {tuletatud.map((t) => (
              <li key={t.isik_id} className="after:content-[',_'] last:after:content-none">
                <Link href={`/isikud/${t.isik_id}/`} className="hover:underline">
                  {t.nimi}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">
            Tuletatud kohalolijaid ei saa esitada (liikmelisuse andmed puuduvad).
          </p>
        )}
      </section>

      {koosolek.protokolli_algus_txt && (
        <section aria-labelledby="protokoll">
          <details className="rounded-lg border border-stone-200 bg-white">
            <summary
              id="protokoll"
              className="cursor-pointer select-none px-4 py-3 font-semibold"
            >
              Protokolli algus (toores OCR-tekst)
            </summary>
            <p className="whitespace-pre-wrap border-t border-stone-100 px-4 py-3 font-mono text-xs leading-relaxed text-stone-700">
              {koosolek.protokolli_algus_txt}
            </p>
            <p className="px-4 pb-3 text-xs text-stone-400">
              Tekst sisaldab OCR-vigu; algne kuupäevastring: {koosolek.kuupaev_txt || "—"}
            </p>
          </details>
        </section>
      )}
    </div>
  );
}
