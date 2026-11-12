/**
 * KT-06 kokkuvõte käsurealt (sama arvutus mis lehel `/kontroll`).
 *   npm run kontroll                         # data/
 *   TLV_DATA_DIR=muu/kaust npm run kontroll  # nt uuenduse eelvaade
 */
import { loeAndmestik } from "../lib/data";
import { KONTROLLID, kokkuvote, kontrollid } from "../lib/kontroll";

const andmed = loeAndmestik();
const k = kontrollid(andmed);
const tabel = kokkuvote(andmed, k);
const veerud = KONTROLLID.map((c) => c.silt);
console.log(`| Koosseis | ${veerud.join(" | ")} |`);
console.log(`|---|${veerud.map(() => "---:").join("|")}|`);
const kokku = Object.fromEntries(KONTROLLID.map((c) => [c.voti, 0])) as Record<string, number>;
for (const [koosseis, rida] of tabel) {
  for (const c of KONTROLLID) kokku[c.voti] += rida[c.voti];
  console.log(`| ${koosseis} | ${KONTROLLID.map((c) => rida[c.voti]).join(" | ")} |`);
}
console.log(`| **kokku** | ${KONTROLLID.map((c) => `**${kokku[c.voti]}**`).join(" | ")} |`);
const kinnitus = [...k.kt03.kinnitusread.values()].reduce((a, b) => a + b, 0);
console.log(`\nKinnitusread (UX-06, ei ole vead): ${kinnitus}`);
