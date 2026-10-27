/**
 * Serveripoolne (build-aegne) protokolliandmete lugemine public/protokollid/<id>.json failist.
 * Eraldi failis, et `fs` ei satuks kliendi bundlesse.
 */
import fs from "fs";
import path from "path";
import type { ProtokollAndmed, ProtokollideMeta } from "./types";

const KAUST = path.join(process.cwd(), "public", "protokollid");

export function loeProtokollAndmed(id: string): ProtokollAndmed | null {
  const fail = path.join(KAUST, `${id}.json`);
  if (!fs.existsSync(fail)) return null;
  return JSON.parse(fs.readFileSync(fail, "utf-8")) as ProtokollAndmed;
}

export function loeProtokollideMeta(): ProtokollideMeta | null {
  const fail = path.join(KAUST, "_meta.json");
  if (!fs.existsSync(fail)) return null;
  return JSON.parse(fs.readFileSync(fail, "utf-8")) as ProtokollideMeta;
}
