"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  id: string;
  aktiivne: "koosolek" | "protokoll";
  protokollOlemas: boolean;
}

const SAKK = "-mb-px border-b-2 px-3 py-2 text-sm";

/**
 * UX-10: koosoleku ja protokolli lehe sakid. `?isik=` kantakse koosoleku lehelt protokollile üle;
 * protokolli sakil prefetch väljas (leht kuni ~1,3 MB).
 */
export default function ProtokolliSakid({ id, aktiivne, protokollOlemas }: Props) {
  const [isik, setIsik] = useState("");
  useEffect(() => {
    setIsik(new URLSearchParams(window.location.search).get("isik") ?? "");
  }, []);
  const lisa = isik ? `?isik=${encodeURIComponent(isik)}` : "";

  const sakk = (tyyp: "koosolek" | "protokoll", href: string, silt: string) =>
    aktiivne === tyyp ? (
      <span aria-current="page" className={`${SAKK} border-stone-800 font-semibold text-stone-900`}>
        {silt}
      </span>
    ) : (
      <Link
        href={href}
        prefetch={tyyp === "protokoll" ? false : undefined}
        className={`${SAKK} border-transparent text-blue-700 hover:border-stone-300`}
      >
        {silt}
      </Link>
    );

  return (
    <nav aria-label="Koosoleku vaated" className="no-print flex gap-1 border-b border-stone-200">
      {sakk("koosolek", `/koosolekud/${id}/${lisa}`, "Koosolek")}
      {protokollOlemas ? (
        sakk("protokoll", `/protokollid/${id}/${lisa}`, "Protokolli tekst ja originaal")
      ) : (
        <span
          className={`${SAKK} cursor-not-allowed border-transparent text-stone-400`}
          title="Protokolli täistekst puudub"
          aria-disabled="true"
        >
          Protokolli tekst ja originaal <span className="text-xs">(puudub)</span>
        </span>
      )}
    </nav>
  );
}
