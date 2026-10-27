import type { Metadata } from "next";
import { loeAndmestik } from "@/lib/data";
import { koosolekuRead } from "@/lib/derive";
import { taisnimi } from "@/lib/format";
import { loeProtokollideMeta } from "@/lib/protokollid/loe";
import { ABI } from "@/lib/abitekstid";
import HelpTip from "@/components/HelpTip";
import KoosolekudVaade from "@/components/KoosolekudVaade";

export const metadata: Metadata = { title: "Protokollid" };

/** PT-01 / PT-02 / PT-06: protokollide nimekiri ja täistekstiotsing. */
export default function ProtokollidLeht() {
  const andmed = loeAndmestik();
  const protokollid = andmed.protokollid.filter((p) => p.fail);
  const idd = new Set(protokollid.map((p) => p.koosolek_id));
  const read = koosolekuRead(andmed).filter((r) => idd.has(r.koosolek_id));
  const puudub = andmed.koosolekud.length - read.length;

  const juhatajaMap = new Map<string, { id: string; nimi: string; isik_id: number | null }>();
  for (const j of andmed.juhatajad) {
    if (!idd.has(j.koosolek_id)) continue;
    if (j.isik_id !== null) {
      const isik = andmed.isikud.find((i) => i.isik_id === j.isik_id);
      if (isik) juhatajaMap.set(String(j.isik_id), { id: String(j.isik_id), nimi: taisnimi(isik), isik_id: j.isik_id });
    } else {
      juhatajaMap.set(j.juhataja_nimi, { id: j.juhataja_nimi, nimi: j.juhataja_nimi, isik_id: null });
    }
  }
  const juhatajaValikud = [...juhatajaMap.values()].sort((a, b) => a.nimi.localeCompare(b.nimi, "et"));
  const ekstra = Object.fromEntries(
    andmed.koosolekud.map((k) => [k.koosolek_id, { kuupaev_txt: k.kuupaev_txt, protokolli_algus_txt: k.protokolli_algus_txt }])
  );
  const meta = loeProtokollideMeta();
  const killud = meta?.killud ?? Array.from({ length: 24 }, (_, i) => 1918 + i);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Protokollid</h1>
      <p className="mb-4 text-sm text-stone-600">
        {read.length} protokolli {andmed.koosolekud.length} koosolekust; {puudub} koosolekul protokolli täistekst puudub.
        Tekst, päevakorrapunktid, nimeüksused ja kõned on tuvastatud automaatselt.
        <HelpTip tekst={ABI.automaatmargendus} />
      </p>
      <KoosolekudVaade
        read={read}
        juhatajaValikud={juhatajaValikud}
        ekstra={ekstra}
        protokollid={Object.fromEntries(protokollid.map((p) => [p.koosolek_id, p]))}
        variant="protokollid"
        killud={killud}
      />
    </div>
  );
}
