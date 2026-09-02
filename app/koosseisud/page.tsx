import type { Metadata } from "next";
import Link from "next/link";
import { loeAndmestik } from "@/lib/data";
import { koosseisuLiikmedKokku } from "@/lib/derive";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti, kuupaevLyhike } from "@/lib/format";
import HelpTip from "@/components/HelpTip";
import { ABI } from "@/lib/abitekstid";

export const metadata: Metadata = { title: "Koosseisud" };

export default function KoosseisudLeht() {
  const andmed = loeAndmestik();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">
        Koosseisud
        <HelpTip tekst={ABI.koosseis} />
      </h1>
      <p className="mb-5 text-sm text-stone-600">
        Tartu Linnavolikogu üheksa koosseisu 1917–1941.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {andmed.koosseisud.map((k) => {
          const liikmeid = koosseisuLiikmedKokku(
            andmed.valimised, andmed.muutused, k.koosseis_id
          ).size;
          const koosolekuid = andmed.koosolekud.filter(
            (ko) => ko.koosseis_id === k.koosseis_id
          ).length;
          const muutusi = andmed.muutused.filter(
            (m) => m.koosseis_id === k.koosseis_id
          ).length;
          const on1940 = k.koosseis_id === "1940-1941";
          return (
            <Link
              key={k.koosseis_id}
              href={`/koosseisud/${k.koosseis_id}/`}
              className="rounded-lg border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
              style={{ borderTopColor: koosseisuVarv(k.koosseis_id), borderTopWidth: 4 }}
            >
              <h2 className="font-serif text-xl font-bold">{k.koosseis_id}</h2>
              {on1940 ? (
                <p className="mt-1 text-xs text-amber-800">
                  Linnavalitsus linnavolikogu ülesandeis (nõukogude okupatsioon)
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-500">
                  Valimised: {k.valimised_algus ? kuupaevEesti(k.valimised_algus) : "—"}
                  {k.valimised_lopp && k.valimised_lopp !== k.valimised_algus && (
                    <>–{kuupaevLyhike(k.valimised_lopp)}</>
                  )}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <dd className="font-serif text-lg font-bold">{liikmeid}</dd>
                  <dt className="text-xs text-stone-500">liiget</dt>
                </div>
                <div>
                  <dd className="font-serif text-lg font-bold">{koosolekuid}</dd>
                  <dt className="text-xs text-stone-500">koosolekut</dt>
                </div>
                <div>
                  <dd className="font-serif text-lg font-bold">{muutusi}</dd>
                  <dt className="text-xs text-stone-500">muutust</dt>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
