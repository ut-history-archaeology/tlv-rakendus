// PA-11: data/*.csv + data/README.md → public/tlv-andmestik.zip (platvormist sõltumatu; asendab `zip`-käsu).
// Arhiiv luuakse iga kord uuesti, nii et kustutatud failid sinna ei jää.
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const juur = process.cwd();
const andmed = path.join(juur, "data");
const siht = path.join(juur, "public", "tlv-andmestik.zip");

const failid = fs
  .readdirSync(andmed)
  .filter((f) => f.endsWith(".csv") || f === "README.md")
  .sort();

const zip = new JSZip();
// fikseeritud kuupäev → sama sisu annab sama ZIP-i (nagu `zip -X`)
const kuupaev = new Date("2026-01-01T00:00:00Z");
for (const f of failid) zip.file(f, fs.readFileSync(path.join(andmed, f)), { date: kuupaev });

const sisu = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
fs.mkdirSync(path.dirname(siht), { recursive: true });
fs.writeFileSync(siht, sisu);
console.log(`zip-andmed — ${failid.length} faili → public/tlv-andmestik.zip (${Math.round(sisu.length / 1024)} KB)`);
