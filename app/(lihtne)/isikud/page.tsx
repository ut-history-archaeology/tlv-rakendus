import type { Metadata } from "next";
import { loeAndmestik } from "@/lib/data";
import { isikuRead } from "@/lib/derive";
import IsikudLoend from "@/components/IsikudLoend";
import LihtneLeht from "@/components/LihtneLeht";

export const metadata: Metadata = { title: "Volinikud" };

/** IS5-01…IS5-04: isikute nimekiri. */
export default function IsikudLeht() {
  const andmed = loeAndmestik();
  const read = isikuRead(andmed);
  return (
    <LihtneLeht tagasi={{ href: "/", tekst: "Tartu Linnavolikogu 1917–1941" }}>
      <main className="flex flex-col gap-10 pb-16 pt-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-[36px] leading-tight tracking-[-0.01em] sm:text-[44px]">Volinikud</h1>
          <p className="text-[17px] text-tekst-2">
            {read.length} inimest, kes olid linnavolikogu liikmed või asendusliikmed.
          </p>
        </header>
        <IsikudLoend read={read} koosseisud={andmed.koosseisud.map((k) => k.koosseis_id)} />
      </main>
    </LihtneLeht>
  );
}
