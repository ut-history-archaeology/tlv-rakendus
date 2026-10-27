import type { Metadata } from "next";
import { loeAndmestik } from "@/lib/data";
import { koosolekuRead } from "@/lib/derive";
import { taisnimi } from "@/lib/format";
import KoosolekudVaade from "@/components/KoosolekudVaade";

export const metadata: Metadata = { title: "Koosolekud" };

export default function KoosolekudLeht() {
  const andmed = loeAndmestik();
  const read = koosolekuRead(andmed);

  // KO-05: juhataja-ripploend (koosolek_juhatajad.csv; Robert Sinka ilma lingita)
  const juhatajaMap = new Map<string, { id: string; nimi: string; isik_id: number | null }>();
  for (const j of andmed.juhatajad) {
    if (j.isik_id !== null) {
      const isik = andmed.isikud.find((i) => i.isik_id === j.isik_id);
      if (isik) {
        juhatajaMap.set(String(j.isik_id), {
          id: String(j.isik_id),
          nimi: taisnimi(isik),
          isik_id: j.isik_id,
        });
      }
    } else {
      juhatajaMap.set(j.juhataja_nimi, {
        id: j.juhataja_nimi,
        nimi: j.juhataja_nimi,
        isik_id: null,
      });
    }
  }
  const juhatajaValikud = [...juhatajaMap.values()].sort((a, b) =>
    a.nimi.localeCompare(b.nimi, "et")
  );

  const ekstra = Object.fromEntries(
    andmed.koosolekud.map((k) => [
      k.koosolek_id,
      { kuupaev_txt: k.kuupaev_txt, protokolli_algus_txt: k.protokolli_algus_txt },
    ])
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Koosolekud</h1>
      <p className="mb-4 text-sm text-stone-600">
        {read.length} protokollitud koosolekut aastatest 1918–1941.
      </p>
      <KoosolekudVaade
        read={read}
        juhatajaValikud={juhatajaValikud}
        ekstra={ekstra}
        protokollid={Object.fromEntries(andmed.protokollid.filter((p) => p.fail).map((p) => [p.koosolek_id, p]))}
      />
    </div>
  );
}
