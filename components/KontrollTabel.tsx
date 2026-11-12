"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ExportButton from "@/components/ExportButton";
import type { EkspordiRida } from "@/lib/export";

export interface KontrolliVeerg {
  key: string;
  pealkiri: string;
  /** väärtus lingiks: isik → /isikud/<id>/, koosolek → /koosolekud/<id>/, koosseis → /koosseisud/<id>/ */
  link?: "isik" | "koosolek" | "koosseis";
  /** muutus_id kuvatakse "#N" (Exceli jk_kronol) */
  muutus?: boolean;
  /** number paremale joondatult */
  arv?: boolean;
}

interface Props {
  read: EkspordiRida[];
  veerud: KontrolliVeerg[];
  failinimi: string;
  /** rea võti, mille tõene väärtus tähendab "erinevus" (punane + filter "ainult erinevused") */
  erinevus?: string;
  /** kui suur hulk ridu, näidatakse alguses ainult erinevusi */
  vaikimisiErinevused?: boolean;
}

const URL: Record<NonNullable<KontrolliVeerg["link"]>, string> = {
  isik: "/isikud/",
  koosolek: "/koosolekud/",
  koosseis: "/koosseisud/",
};

/** Kontrolllehe plokk: tabel + filter "ainult erinevused" + CSV/XLSX/JSON eksport (5a). */
export default function KontrollTabel({ read, veerud, failinimi, erinevus, vaikimisiErinevused }: Props) {
  const [ainult, setAinult] = useState(!!vaikimisiErinevused);
  const naha = useMemo(
    () => (erinevus && ainult ? read.filter((r) => r[erinevus]) : read),
    [read, erinevus, ainult]
  );
  const ekspordiVeerud = veerud.map((v) => ({ key: v.key, pealkiri: v.pealkiri }));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-stone-600">
          {naha.length} rida{erinevus && ainult ? ` (kokku ${read.length})` : ""}
        </span>
        <div className="flex items-center gap-3">
          {erinevus && (
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={ainult} onChange={(e) => setAinult(e.target.checked)} />
              ainult erinevused
            </label>
          )}
          <ExportButton
            read={naha}
            veerud={ekspordiVeerud}
            meta={{ failinimi, filtrid: erinevus && ainult ? { Read: "ainult erinevused" } : {} }}
          />
        </div>
      </div>
      {naha.length === 0 ? (
        <p className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">Leide pole.</p>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-md border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-stone-100 text-stone-700">
              <tr>
                {veerud.map((v) => (
                  <th key={v.key} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${v.arv ? "text-right" : "text-left"}`}>
                    {v.pealkiri}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {naha.map((r, i) => {
                const vale = erinevus ? !!r[erinevus] : false;
                return (
                  <tr key={i} className={`border-t border-stone-100 ${vale ? "bg-red-50" : ""}`}>
                    {veerud.map((v) => {
                      const x = r[v.key];
                      const tekst = x === null || x === undefined ? "" : String(x);
                      let sisu: React.ReactNode = tekst;
                      if (tekst && v.link) {
                        sisu = (
                          <Link href={`${URL[v.link]}${tekst}/`} className="text-blue-800 underline decoration-stone-300 hover:decoration-blue-800">
                            {tekst}
                          </Link>
                        );
                      } else if (tekst && v.muutus) {
                        sisu = `#${tekst}`;
                      }
                      return (
                        <td key={v.key} className={`px-3 py-1.5 align-top ${v.arv ? "text-right tabular-nums" : ""} ${vale && v.key === erinevus ? "font-semibold text-red-700" : ""}`}>
                          {sisu}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
