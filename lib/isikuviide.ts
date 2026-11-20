/**
 * PR5-05 "Kopeeri viide" isiku lehel (omaniku otsus 20.11.2026: protokolli viite eeskujul,
 * vt lib/protokollid/viide.ts).
 */
import { kuupaevEesti } from "./format";

export function isikuViide(v: { nimi: string; leheUrl: string; vaadatud?: string }): string {
  const vaadatud = kuupaevEesti(v.vaadatud ?? new Date().toISOString().slice(0, 10));
  return `${v.nimi}. Tartu Linnavolikogu andmestik, 2026, ${v.leheUrl} (vaadatud ${vaadatud}).`;
}
