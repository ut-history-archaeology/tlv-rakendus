import Link from "next/link";
import type { ReactNode } from "react";

/**
 * DS-02: lihtne leheraam (avaleht, /isikud/, /isikud/<id>/). Sisu laius 720 px, külgpolsterdus
 * 24 px, kujundusmärgid globals.css `@theme`-ist. Tagasilingiga lehtedel on ülal üks rida:
 * vasakul tagasilink, paremal "Loe protokolle".
 */
export default function LihtneLeht({
  tagasi,
  children,
  className = "",
}: {
  tagasi?: { href: string; tekst: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="lihtne min-h-screen bg-taust text-tekst">
      <div className={`mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-6 ${className}`}>
        {tagasi && (
          <nav
            aria-label="Asukoht"
            className="no-print flex flex-wrap items-center justify-between gap-x-3 pt-6 text-sm"
          >
            <Link href={tagasi.href} className="inline-flex min-h-11 items-center text-hall hover:text-tekst">
              <span aria-hidden>←</span>&nbsp;{tagasi.tekst}
            </Link>
            <Link href="/koosolekud/" className="inline-flex min-h-11 items-center">
              Loe protokolle
            </Link>
          </nav>
        )}
        {children}
      </div>
    </div>
  );
}
