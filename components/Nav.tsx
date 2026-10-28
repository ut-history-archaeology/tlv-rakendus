"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { OtsinguIndeks } from "@/lib/search-index";
import GlobalSearch from "./GlobalSearch";

const LEHED = [
  { href: "/", nimi: "Avaleht" },
  { href: "/isikud/", nimi: "Isikud" },
  { href: "/koosseisud/", nimi: "Koosseisud" },
  { href: "/koosolekud/", nimi: "Koosolekud ja protokollid" },
];

export default function Nav({ indeks }: { indeks: OtsinguIndeks }) {
  const pathname = usePathname();
  const [mobiilAvatud, setMobiilAvatud] = useState(false);

  function aktiivne(href: string) {
    if (href === "/") return pathname === "/";
    // protokollilehed kuuluvad menüüpunkti "Koosolekud ja protokollid" alla (UX-09)
    if (href === "/koosolekud/" && pathname.startsWith("/protokollid")) return true;
    return pathname.startsWith(href.replace(/\/$/, ""));
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <nav
        aria-label="Peamenüü"
        className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2"
      >
        <Link href="/" className="shrink-0 font-serif text-lg font-bold">
          TLV <span className="font-normal text-stone-500">1917–1941</span>
        </Link>
        <ul className="hidden gap-1 md:flex">
          {LEHED.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  aktiivne(l.href)
                    ? "bg-stone-800 text-white"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                {l.nimi}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch indeks={indeks} />
          <button
            type="button"
            aria-label="Ava menüü"
            aria-expanded={mobiilAvatud}
            onClick={() => setMobiilAvatud((a) => !a)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm md:hidden"
          >
            ☰
          </button>
        </div>
      </nav>
      {mobiilAvatud && (
        <ul className="border-t border-stone-200 px-4 py-2 md:hidden">
          {LEHED.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setMobiilAvatud(false)}
                className={`block rounded-md px-3 py-2 text-sm ${
                  aktiivne(l.href) ? "bg-stone-800 text-white" : "text-stone-700"
                }`}
              >
                {l.nimi}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
