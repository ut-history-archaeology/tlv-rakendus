import Link from "next/link";
import LihtneLeht from "@/components/LihtneLeht";
import { avaleheKirjeldus } from "@/lib/sisu";
import { avalikUrl } from "@/lib/protokollid/laadi";

const SUUR_NUPP =
  "flex min-h-[96px] items-center justify-between gap-4 rounded-[14px] px-8 py-7 text-[22px] font-medium leading-tight";

/** AV5-01: pealkiri, kirjeldus failist (AV5-02), kaks nuppu, jalus. */
export default function Avaleht() {
  const kirjeldus = avaleheKirjeldus();
  return (
    <LihtneLeht className="pb-12 pt-16 sm:pt-24">
      <main className="flex flex-col gap-12">
        <h1 className="text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
          Tartu Linnavolikogu 1917–1941
        </h1>

        <section
          aria-label="Projekti kirjeldus"
          className="lihtne-sisu text-[18px] leading-[1.65]"
          dangerouslySetInnerHTML={{ __html: kirjeldus }}
        />

        <nav aria-label="Alusta" className="grid gap-4 sm:grid-cols-2">
          <Link href="/isikud/" className={`${SUUR_NUPP} bg-tekst text-white hover:bg-black hover:text-white`}>
            Otsi Tartu linnavolikogu liikmeid
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/koosolekud/"
            className={`${SUUR_NUPP} border border-raam bg-pind text-tekst hover:border-tekst hover:text-tekst`}
          >
            Loe protokolle
            <span aria-hidden>→</span>
          </Link>
        </nav>
      </main>

      <footer className="mt-auto flex flex-wrap gap-x-5 pt-12 text-[13px] text-hall">
        <a
          href={avalikUrl("tlv-andmestik.zip")}
          download
          className="inline-flex min-h-11 items-center text-hall underline decoration-raam underline-offset-2 hover:text-tekst"
        >
          Laadi alla kogu andmestik
        </a>
        <Link
          href="/koosseisud/"
          className="inline-flex min-h-11 items-center text-hall underline decoration-raam underline-offset-2 hover:text-tekst"
        >
          Koosseisud
        </Link>
      </footer>
    </LihtneLeht>
  );
}
