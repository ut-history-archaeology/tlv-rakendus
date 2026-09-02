import type { Metadata } from "next";
import { loeAndmestik } from "@/lib/data";
import { isikuRead } from "@/lib/derive";
import IsikudTabel from "@/components/IsikudTabel";
import HelpTip from "@/components/HelpTip";
import { ABI } from "@/lib/abitekstid";

export const metadata: Metadata = { title: "Isikud" };

export default function IsikudLeht() {
  const andmed = loeAndmestik();
  const read = isikuRead(andmed);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">
        Isikud
        <HelpTip tekst={ABI.koosseis} />
      </h1>
      <p className="mb-4 text-sm text-stone-600">
        Kõik {read.length} Tartu Linnavolikogus 1917–1941 tegutsenud isikut:
        valitud volinikud ja hiljem liitunud asendusliikmed.
      </p>
      <IsikudTabel
        read={read}
        koosseisud={andmed.koosseisud.map((k) => k.koosseis_id)}
      />
    </div>
  );
}
