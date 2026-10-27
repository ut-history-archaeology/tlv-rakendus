// ET-01 prebuild: käivita eeltöötlus, kui korpus on olemas ja väljund puudub või on vanem kui korpus / sisend-CSV-d / skript.
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const juur = process.cwd();
const korpus = path.join(juur, "korpus", "json");
const meta = path.join(juur, "public", "protokollid", "_meta.json");

function uusimMtime(kaust) {
  let m = 0;
  for (const f of fs.readdirSync(kaust)) {
    const st = fs.statSync(path.join(kaust, f));
    if (st.isFile()) m = Math.max(m, st.mtimeMs);
  }
  return m;
}

const korpusOlemas = fs.existsSync(korpus) && fs.readdirSync(korpus).some((f) => f.endsWith(".json"));
const valjundOlemas = fs.existsSync(meta);

if (!korpusOlemas && !valjundOlemas) {
  console.error("protokollide eeltöötlus puudub: korpus/json ja public/protokollid/_meta.json mõlemad puuduvad");
  process.exit(1);
}
if (!korpusOlemas) {
  console.log("eeltootle:kui-vaja — korpust pole, kasutan olemasolevat public/protokollid/ väljundit");
  process.exit(0);
}
const sisendid = [
  uusimMtime(korpus),
  ...["koosolekud.csv", "isikud.csv", "protokolli_lehed.csv"].map((f) => fs.statSync(path.join(juur, "data", f)).mtimeMs),
  fs.statSync(path.join(juur, "scripts", "protokollid-vasted.json")).mtimeMs,
  fs.statSync(path.join(juur, "scripts", "eeltootle-protokollid.ts")).mtimeMs,
];
if (valjundOlemas && fs.statSync(meta).mtimeMs >= Math.max(...sisendid)) {
  console.log("eeltootle:kui-vaja — väljund on ajakohane, jätan vahele");
  process.exit(0);
}
console.log("eeltootle:kui-vaja — käivitan eeltöötluse");
execSync("npx tsx scripts/eeltootle-protokollid.ts", { stdio: "inherit" });
