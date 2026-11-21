import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ALLIKA_NIMI, type Allikas, type Vaartus, type ValimineKoos } from "@/lib/derive";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "./HelpTip";
import KontrollimiselMark from "./KontrollimiselMark";

/** Koosseisu ID → "1927–1929" pealkirja jaoks. */
function koosseisuNimi(id: string): string {
  return id.replace("-", "–");
}

/** Viite lühikuju (täiskuju tooltipis). */
function lyhike(viide: string): string {
  return viide.length > 32 ? viide.slice(0, 30).trimEnd() + "…" : viide;
}

/** VK-03: ühe allika viide väärtuse järel — link, kui URL olemas; puudumisel VIIDE PUUDU. */
function Viide({ a }: { a: Allikas }) {
  const nimi = ALLIKA_NIMI[a.allikas];
  if (!a.viide) {
    return (
      <strong className="text-red-800" title={`${nimi}: viide puudub`}>
        VIIDE PUUDU
      </strong>
    );
  }
  const title = `${nimi}: ${a.viide}`;
  return a.url ? (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${title} (avaneb uues aknas)`}
      className="text-blue-700 underline decoration-blue-300 hover:decoration-blue-700"
    >
      {lyhike(a.viide)}
    </a>
  ) : (
    <span title={title}>{lyhike(a.viide)}</span>
  );
}

/** Kaardi allikaviide(d) kaardi jalusesse — üks kord kaardi kohta, mitte iga rea järel. */
function Viited({ allikad }: { allikad: Allikas[] }) {
  return (
    <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-500">
      Allikas:{" "}
      {allikad.map((a, i) => (
        <Fragment key={i}>
          {i > 0 && "; "}
          {allikad.length > 1 && <>{ALLIKA_NIMI[a.allikas]}: </>}
          <Viide a={a} />
        </Fragment>
      ))}
    </p>
  );
}

/**
 * VK-01…VK-04: üks kaart valimisaasta kohta; allikaviide(d) üks kord kaardi jaluses.
 * Sama väärtus mitmest allikast → üks väärtus; erinevad väärtused jäävad kõik nähtavaks
 * (ei ühtlustata).
 */
export default function ValimisedKoos({ kirjed }: { kirjed: ValimineKoos[] }) {
  return (
    <div className={kirjed.length > 2 ? "grid gap-3 md:grid-cols-2" : "space-y-3"}>
      {kirjed.map((k) => (
        <ValimiseKaart key={k.aasta} k={k} />
      ))}
    </div>
  );
}

function ValimiseKaart({ k }: { k: ValimineKoos }) {
  const read: [string, ReactNode][] = [];
  if (k.nimekiri.length > 0) {
    read.push(["Nimekiri", k.nimekiri.map((n, i) => {
      const toorEri = n.toor.length > 0 && n.toor.join() !== n.nimi;
      return (
        <span key={i} className="block">
          {n.nr && <>nr {n.nr} — </>}
          <span
            title={toorEri ? `Allikas: ${n.toor.join("; ")}` : undefined}
            className={toorEri ? "cursor-help underline decoration-dotted decoration-stone-400" : ""}
          >
            {n.nimi}
          </span>
          {n.kontrollida && <KontrollimiselMark />}
        </span>
      );
    })]);
  }
  const valjad: [string, Vaartus[]][] = [
    ["Nimekuju allikas", k.nimekuju],
    ["Koht nimekirjas", k.koht],
    ["Ringkond", k.ringkond],
    ["Hääled", k.haaled],
    ["Amet", k.amet],
    ["Vanus valimiste ajal", k.vanus],
    ["Sünniaeg", k.synniaeg],
    ["Aadress", k.aadress],
    ["Märkused", k.markused],
  ];
  for (const [silt, v] of valjad) {
    if (v.length === 0) continue;
    read.push([silt, v.map((x, i) => (
      <span key={i} className="block">
        {x.vaartus}
      </span>
    ))]);
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {k.aasta}. aasta valimised →{" "}
          <Link href={`/koosseisud/${k.koosseis_id}/`} className="text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-700">
            koosseis {koosseisuNimi(k.koosseis_id)}
          </Link>
          <HelpTip tekst={ABI.valimisteAllikad} />
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            k.tulemus === "valitud" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"
          }`}
        >
          {k.tulemus === "valitud" ? "valitud" : "kandidaat, ei osutunud valituks"}
        </span>
      </div>
      {read.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {read.map(([silt, sisu]) => (
            <div key={silt} className="contents">
              <dt className="font-medium text-stone-600">
                {silt}
                {silt === "Nimekiri" && <HelpTip tekst={ABI.nimekiri} />}
              </dt>
              <dd>{sisu}</dd>
            </div>
          ))}
        </dl>
      )}
      {k.allikad.length > 0 && <Viited allikad={k.allikad} />}
    </article>
  );
}
