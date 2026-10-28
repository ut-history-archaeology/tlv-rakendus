import Link from "next/link";
import type { ReactNode } from "react";
import type { Allikas, ValimineKoos } from "@/lib/derive";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "./HelpTip";

const ULAINDEKS = ["¹", "²", "³", "⁴", "⁵", "⁶"];

function allikaSilt(a: Allikas): string {
  return a.roll === "valitav" ? "kandidaatide nimekiri" : "valimistulemused";
}

/** Koosseisu ID → "1927–1929" pealkirja jaoks. */
function koosseisuNimi(id: string): string {
  return id.replace("-", "–");
}

/**
 * UX-03: üks kaart valimisaasta kohta. Erinevate allikaväärtuste järel ülaindeks,
 * mis viitab jaluse allikareale (andmeid ei ühtlustata).
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
  const indeks = (a: Allikas) =>
    k.allikad.findIndex((x) => x.roll === a.roll && x.viide === a.viide);
  /** Ülaindeksid ainult siis, kui väljal on mitu erinevat väärtust. */
  const viited = (allikad: Allikas[], mitu: boolean) =>
    mitu ? (
      <sup className="ml-0.5 text-stone-500" title={allikad.map(allikaSilt).join(", ")}>
        {allikad.map((a) => ULAINDEKS[indeks(a)] ?? "").join("")}
      </sup>
    ) : null;

  const read: [string, ReactNode][] = [];
  if (k.nimekiri.length > 0) {
    read.push(["Nimekiri", k.nimekiri.map((n, i) => (
      <span key={i} className="block">
        {n.nr && <>nr {n.nr} — </>}
        {n.nimi}
        {viited(n.allikad, k.nimekiri.length > 1)}
      </span>
    ))]);
  }
  if (k.koht.jrk_nimekiri || k.koht.jrk_uld) {
    read.push(["Koht nimekirjas", (
      <>
        {k.koht.jrk_nimekiri ?? "—"}
        {k.koht.jrk_uld && ` (üldjärjestuses ${k.koht.jrk_uld})`}
      </>
    )]);
  }
  if (k.ringkond) {
    read.push(["Ringkond", (
      <>
        {k.ringkond}
        {k.koht.jrk_ringkond && `, koht ringkonnas ${k.koht.jrk_ringkond}`}
      </>
    )]);
  }
  if (k.haaled) {
    const { jsk1, jsk2, kokku } = k.haaled;
    read.push(["Hääled", (
      <>
        {kokku ?? "—"}
        {(jsk1 || jsk2) && ` (1. jsk ${jsk1 ?? "—"}, 2. jsk ${jsk2 ?? "—"})`}
      </>
    )]);
  }
  const mitmene = (silt: string, v: { vaartus: string; allikad: Allikas[] }[]) => {
    if (v.length === 0) return;
    read.push([silt, v.map((x, i) => (
      <span key={i} className="block">
        {x.vaartus}
        {viited(x.allikad, v.length > 1)}
      </span>
    ))]);
  };
  mitmene("Amet", k.amet);
  mitmene("Vanus valimiste ajal", k.vanus);
  mitmene("Sünniaeg", k.synniaeg);
  mitmene("Aadress", k.aadress.map((a) => ({ vaartus: a.tekst, allikad: a.allikad })));
  mitmene("Märkused", k.markused);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {k.aasta}. aasta valimised →{" "}
          <Link href={`/koosseisud/${k.koosseis_id}/`} className="text-blue-700 hover:underline">
            koosseis {koosseisuNimi(k.koosseis_id)}
          </Link>
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
      <p className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-500">
        Allikad:{" "}
        {k.allikad.map((a, i) => (
          <span key={i}>
            {i > 0 && "; "}
            {k.allikad.length > 1 && ULAINDEKS[i]}
            {allikaSilt(a)} — {a.viide || <em>allikas märkimata</em>}
          </span>
        ))}
        <HelpTip tekst={ABI.valimisteAllikad} />
      </p>
    </article>
  );
}
